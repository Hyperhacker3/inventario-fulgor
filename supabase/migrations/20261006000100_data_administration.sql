-- Administración de datos. Conserva todos los productos y sus códigos actuales.
BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_categorias (
  id text PRIMARY KEY, nombre text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 100),
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.inventario_prefijos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prefijo text NOT NULL UNIQUE CHECK (prefijo ~ '^[A-Z]{3}$'),
  nombre text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 100),
  activo boolean NOT NULL DEFAULT true,
  ultimo bigint NOT NULL DEFAULT 0 CHECK (ultimo BETWEEN 0 AND 999999999)
);
CREATE TABLE IF NOT EXISTS public.inventario_altas (
  request_id uuid PRIMARY KEY, actor_id uuid NOT NULL, payload jsonb NOT NULL,
  elemento_id text NOT NULL REFERENCES public.elementos(id)
);

INSERT INTO public.inventario_categorias(id,nombre)
SELECT key, replace(key,'_',' ') FROM unnest(ARRAY['PANELES','INVERSORES','ESTRUCTURAS','CABLES','CONECTORES',
  'PROTECCIONES','BATERIAS','CONTROLADORES','ACCESORIOS','HERRAMIENTAS','SEGURIDAD_EPP','OTROS']) AS key
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.inventario_categorias(id,nombre)
SELECT DISTINCT categoria, replace(categoria,'_',' ') FROM public.elementos
ON CONFLICT(id) DO NOTHING;
-- Importa solamente los prefijos de tres letras presentes en la base de datos.
INSERT INTO public.inventario_prefijos(prefijo,nombre,ultimo)
SELECT substring(codigo from 1 for 3), substring(codigo from 1 for 3),
  max(substring(codigo from 4)::bigint)
FROM public.elementos WHERE codigo ~ '^[A-Z]{3}[0-9]{1,9}$' GROUP BY 1
ON CONFLICT(prefijo) DO UPDATE SET ultimo = greatest(public.inventario_prefijos.ultimo,excluded.ultimo);

ALTER TABLE public.inventario_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_prefijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_altas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_categorias, public.inventario_prefijos, public.inventario_altas FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.inventory_data_catalog() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(public.fulgor_role(),'') NOT IN ('admin','operador','consulta') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN jsonb_build_object(
    'categorias',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY nombre) FROM public.inventario_categorias c),'[]'::jsonb),
    'prefijos',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY prefijo) FROM public.inventario_prefijos p),'[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.save_inventory_catalog_entry(p_kind text,p_entry jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id text; v_name text; v_prefix text; v_active boolean; v_last bigint;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_entry IS NULL OR jsonb_typeof(p_entry) <> 'object' THEN RAISE EXCEPTION 'Datos inválidos'; END IF;
  v_id := nullif(p_entry->>'id',''); v_name := trim(p_entry->>'nombre');
  v_active := coalesce((p_entry->>'activo')::boolean,true);
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Ingrese un nombre de hasta 100 caracteres'; END IF;
  -- Serializa renombrados y altas para conservar el consecutivo al editar un prefijo.
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  IF p_kind = 'categoria' THEN
    IF v_id IS NULL THEN
      v_id := upper(trim(coalesce(p_entry->>'clave','')));
      IF v_id !~ '^[A-Z][A-Z0-9_]{1,49}$' THEN RAISE EXCEPTION 'Clave de categoría inválida'; END IF;
      INSERT INTO public.inventario_categorias(id,nombre,activo) VALUES(v_id,v_name,v_active);
    ELSE
      UPDATE public.inventario_categorias SET nombre=v_name,activo=v_active WHERE id=v_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Categoría no encontrada'; END IF;
    END IF;
  ELSIF p_kind = 'prefijo' THEN
    v_prefix := upper(trim(coalesce(p_entry->>'prefijo','')));
    IF v_prefix !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'El prefijo debe tener tres letras de A a Z'; END IF;
    SELECT coalesce(max(substring(codigo from 4)::bigint),0) INTO v_last FROM public.elementos
      WHERE codigo ~ ('^'||v_prefix||'[0-9]{1,9}$');
    IF v_id IS NULL THEN
      INSERT INTO public.inventario_prefijos(prefijo,nombre,activo,ultimo) VALUES(v_prefix,v_name,v_active,v_last);
    ELSE
      UPDATE public.inventario_prefijos SET prefijo=v_prefix,nombre=v_name,activo=v_active,
        ultimo=greatest(ultimo,v_last) WHERE id=v_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Prefijo no encontrado'; END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Tipo de catálogo inválido'; END IF;
  RETURN public.inventory_data_catalog();
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Ya existe una categoría con esa clave o un código con ese prefijo';
END $$;

CREATE OR REPLACE FUNCTION public.create_inventory_item(p_item jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.elementos%ROWTYPE; v_amount numeric; v_minimum numeric; v_damaged numeric;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_item IS NULL OR jsonb_typeof(p_item) <> 'object' THEN RAISE EXCEPTION 'Componente inválido'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  v_amount := (p_item ->> 'cantidad')::numeric;
  v_minimum := (p_item ->> 'stock_minimo')::numeric;
  v_damaged := coalesce((p_item ->> 'cantidad_danados')::numeric, 0);
  IF v_amount IS NULL OR v_amount < 0 OR round(v_amount, 3) <> v_amount OR
     v_minimum IS NULL OR v_minimum < 0 OR round(v_minimum, 3) <> v_minimum OR
     v_damaged < 0 OR v_damaged > v_amount OR round(v_damaged, 3) <> v_damaged THEN
    RAISE EXCEPTION 'Cantidad inválida';
  END IF;
  IF upper(trim(coalesce(p_item ->> 'codigo', ''))) !~ '^[A-Z0-9-]{3,30}$' OR
     nullif(trim(p_item ->> 'nombre'), '') IS NULL OR
     NOT EXISTS (SELECT 1 FROM public.inventario_categorias WHERE id=p_item ->> 'categoria' AND activo) OR
     nullif(trim(p_item ->> 'unidad'), '') IS NULL THEN RAISE EXCEPTION 'Datos de artículo incompletos'; END IF;
  IF (p_item ->> 'estanteria_id') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estanterias WHERE id = p_item ->> 'estanteria_id'
      AND almacen_id = p_item ->> 'almacen_id') THEN RAISE EXCEPTION 'Estantería fuera del almacén'; END IF;
  IF (p_item ->> 'caja_id') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cajas WHERE id = p_item ->> 'caja_id'
      AND estanteria_id = p_item ->> 'estanteria_id') THEN RAISE EXCEPTION 'Caja fuera de la estantería'; END IF;
  INSERT INTO public.elementos(id, codigo, nombre, descripcion, categoria, cantidad, stock_minimo, unidad,
    almacen_id, estanteria_id, caja_id, foto_url, estado, cantidad_danados, especificaciones)
  VALUES ('ELM-' || gen_random_uuid()::text, upper(trim(p_item ->> 'codigo')), trim(p_item ->> 'nombre'),
    p_item ->> 'descripcion', p_item ->> 'categoria', v_amount, v_minimum,
    upper(p_item ->> 'unidad'), p_item ->> 'almacen_id', p_item ->> 'estanteria_id', p_item ->> 'caja_id',
    p_item ->> 'foto_url', coalesce(p_item ->> 'estado', 'BUENO'),
    v_damaged, coalesce(p_item -> 'especificaciones', '{}'::jsonb))
  RETURNING * INTO v_row;
  IF v_amount > 0 THEN
    INSERT INTO public.historial(id, fecha, tipo, elemento_id, elemento_codigo, elemento_nombre, cantidad, unidad,
      responsable, motivo, stock_anterior, stock_nuevo, actor_id)
    VALUES ('MOV-' || gen_random_uuid()::text, to_char(now() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI'),
      'ENTRADA', v_row.id, v_row.codigo, v_row.nombre, v_amount, v_row.unidad,
      coalesce(auth.jwt() -> 'user_metadata' ->> 'name', auth.uid()::text),
      'Alta de componente', 0, v_amount, auth.uid());
  END IF;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.create_inventory_item_auto(p_prefix_id text,p_request_id uuid,p_item jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_prefix public.inventario_prefijos%ROWTYPE; v_previous public.inventario_altas%ROWTYPE;
  v_last bigint; v_code text; v_row jsonb; v_payload jsonb;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR p_item IS NULL OR jsonb_typeof(p_item) <> 'object' THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
  v_payload := jsonb_build_object('prefijo_id',p_prefix_id,'item',p_item - 'codigo');
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  SELECT * INTO v_previous FROM public.inventario_altas WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.payload IS DISTINCT FROM v_payload THEN
      RAISE EXCEPTION 'La solicitud ya existe con otro contenido o usuario';
    END IF;
    SELECT to_jsonb(e) INTO v_row FROM public.elementos e WHERE id=v_previous.elemento_id;
    RETURN v_row;
  END IF;
  SELECT * INTO v_prefix FROM public.inventario_prefijos WHERE id=p_prefix_id AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un prefijo activo'; END IF;
  -- Incluye archivados y códigos introducidos por clientes anteriores.
  SELECT greatest(v_prefix.ultimo,coalesce(max(substring(codigo from 4)::bigint),0))+1 INTO v_last
    FROM public.elementos WHERE codigo ~ ('^'||v_prefix.prefijo||'[0-9]{1,9}$');
  IF v_last > 999999999 THEN RAISE EXCEPTION 'El consecutivo ha alcanzado su límite'; END IF;
  v_code := v_prefix.prefijo || CASE WHEN v_last < 1000 THEN lpad(v_last::text,3,'0') ELSE v_last::text END;
  v_row := public.create_inventory_item((p_item - 'codigo') || jsonb_build_object('codigo',v_code));
  UPDATE public.inventario_prefijos SET ultimo=v_last WHERE id=v_prefix.id;
  INSERT INTO public.inventario_altas(request_id,actor_id,payload,elemento_id)
    VALUES(p_request_id,auth.uid(),v_payload,v_row->>'id');
  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.inventory_data_catalog(),public.save_inventory_catalog_entry(text,jsonb),
  public.create_inventory_item_auto(text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inventory_data_catalog(),public.save_inventory_catalog_entry(text,jsonb),
  public.create_inventory_item_auto(text,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

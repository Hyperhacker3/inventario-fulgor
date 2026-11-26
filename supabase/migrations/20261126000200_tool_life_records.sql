-- Hoja de vida y mantenimiento de herramientas eléctricas y a combustión.
-- * Crea las categorías HERRAMIENTAS ELÉCTRICAS y HERRAMIENTAS A COMBUSTIÓN (o reutiliza las que ya tengan ese nombre)
--   y las marca con el tipo de hoja de vida. No mueve productos de categoría.
-- * Hoja de vida editable por administración; historial de mantenimiento con fotos privadas, registrado por
--   administración u operadores, inmutable y consultable por todos los roles de lectura.
-- No modifica stock, productos, movimientos ni documentos. Ejecutar completo desde la cuenta del usuario,
-- después de 20261029000100_automatic_location_category_codes.sql y 20261010000100_webp_photos.sql.
BEGIN;

ALTER TABLE public.inventario_categorias ADD COLUMN IF NOT EXISTS hoja_vida_tipo text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='inventario_categorias_hoja_vida_tipo' AND conrelid='public.inventario_categorias'::regclass) THEN
    ALTER TABLE public.inventario_categorias ADD CONSTRAINT inventario_categorias_hoja_vida_tipo CHECK (hoja_vida_tipo IS NULL OR hoja_vida_tipo IN ('ELECTRICA','COMBUSTION'));
  END IF;
END $$;

-- Reutiliza una categoría con el mismo nombre (sin distinguir acentos ni mayúsculas); si no existe, la crea.
DO $$
DECLARE r record; v_id text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  FOR r IN SELECT * FROM (VALUES ('HERRAMIENTAS_ELECTRICAS','HERRAMIENTAS ELÉCTRICAS','ELECTRICA'),
                                 ('HERRAMIENTAS_COMBUSTION','HERRAMIENTAS A COMBUSTIÓN','COMBUSTION')) AS t(id,nombre,tipo) LOOP
    SELECT id INTO v_id FROM public.inventario_categorias
      WHERE upper(translate(regexp_replace(trim(nombre),'\s+',' ','g'),'ÁÉÍÓÚÜáéíóúü','AEIOUUaeiouu')) = upper(translate(r.nombre,'ÁÉÍÓÚÜ','AEIOUU'))
         OR id = r.id
      ORDER BY (id = r.id) DESC, activo DESC, id COLLATE "C" LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.inventario_categorias(id,nombre,activo,hoja_vida_tipo) VALUES (r.id,r.nombre,true,r.tipo);
    ELSE
      UPDATE public.inventario_categorias SET activo=true, hoja_vida_tipo=r.tipo WHERE id=v_id;
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.inventario_hojas_vida (
  elemento_id text PRIMARY KEY,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(datos)='object'),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_by_nombre text NOT NULL DEFAULT ''
);
-- Sin clave foránea: el historial se conserva aunque se elimine un producto archivado.
CREATE TABLE IF NOT EXISTS public.inventario_mantenimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  actor_id uuid NOT NULL,
  elemento_id text NOT NULL,
  elemento_codigo text NOT NULL,
  elemento_nombre text NOT NULL,
  fecha date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('PREVENTIVO','CORRECTIVO','INSPECCIÓN')),
  descripcion text NOT NULL CHECK (length(descripcion) BETWEEN 1 AND 2000),
  repuestos text NOT NULL DEFAULT '' CHECK (length(repuestos) <= 1000),
  costo_cop numeric(14,2) NOT NULL DEFAULT 0 CHECK (costo_cop >= 0),
  realizado_por text NOT NULL CHECK (length(realizado_por) BETWEEN 1 AND 120),
  horas_uso numeric(12,1) CHECK (horas_uso IS NULL OR horas_uso >= 0),
  proxima_fecha date CHECK (proxima_fecha IS NULL OR proxima_fecha >= fecha),
  observaciones text NOT NULL DEFAULT '' CHECK (length(observaciones) <= 1000),
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fotos)='array'),
  registrado_por text NOT NULL DEFAULT '',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventario_mantenimientos_elemento_idx ON public.inventario_mantenimientos(elemento_id, fecha DESC, created_at DESC);

ALTER TABLE public.inventario_hojas_vida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_mantenimientos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_hojas_vida, public.inventario_mantenimientos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inventario_hojas_vida, public.inventario_mantenimientos TO authenticated;
DROP POLICY IF EXISTS tool_life_records_read ON public.inventario_hojas_vida;
CREATE POLICY tool_life_records_read ON public.inventario_hojas_vida FOR SELECT TO authenticated
  USING (public.fulgor_role() IN ('admin','operador','consulta'));
DROP POLICY IF EXISTS tool_maintenance_read ON public.inventario_mantenimientos;
CREATE POLICY tool_maintenance_read ON public.inventario_mantenimientos FOR SELECT TO authenticated
  USING (public.fulgor_role() IN ('admin','operador','consulta'));

CREATE OR REPLACE FUNCTION public.tool_life_record_type(p_elemento_id text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.hoja_vida_tipo FROM public.elementos e JOIN public.inventario_categorias c ON c.id = e.categoria WHERE e.id = p_elemento_id
$$;

-- Campos admitidos: texto corto (200), texto largo (2000), fechas AAAA-MM-DD y año.
CREATE OR REPLACE FUNCTION public.normalize_tool_life_data(p_datos jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_key text; v_value jsonb; v_text text; v_result jsonb := '{}'::jsonb;
  v_short text[] := ARRAY['modelo','numero_serie','proveedor','factura','responsable','frecuencia_mantenimiento','epp_requerido',
    'potencia','voltaje','amperaje','frecuencia_electrica','rpm','alimentacion','bateria',
    'tipo_motor','cilindrada','combustible','capacidad_tanque','mezcla_aceite','aceite_motor','arranque'];
  v_long text[] := ARRAY['recomendaciones_seguridad','observaciones'];
  v_dates text[] := ARRAY['fecha_adquisicion','fecha_puesta_servicio','garantia_hasta'];
BEGIN
  IF p_datos IS NULL OR jsonb_typeof(p_datos) <> 'object' THEN RAISE EXCEPTION 'Hoja de vida inválida'; END IF;
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_datos) LOOP
    IF jsonb_typeof(v_value) <> 'string' THEN RAISE EXCEPTION 'El dato % debe ser texto', v_key; END IF;
    v_text := trim(v_value #>> '{}');
    CONTINUE WHEN v_text = '';
    IF v_key = ANY(v_short) THEN
      IF length(v_text) > 200 THEN RAISE EXCEPTION 'El dato % admite hasta 200 caracteres', v_key; END IF;
    ELSIF v_key = ANY(v_long) THEN
      IF length(v_text) > 2000 THEN RAISE EXCEPTION 'El dato % admite hasta 2000 caracteres', v_key; END IF;
    ELSIF v_key = ANY(v_dates) THEN
      IF v_text !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Fecha inválida en %', v_key; END IF;
      PERFORM v_text::date;
    ELSIF v_key = 'anio_fabricacion' THEN
      IF v_text !~ '^\d{4}$' OR v_text::integer NOT BETWEEN 1900 AND 2100 THEN RAISE EXCEPTION 'Año de fabricación inválido'; END IF;
    ELSE
      RAISE EXCEPTION 'El dato % no pertenece a la hoja de vida', v_key;
    END IF;
    v_result := v_result || jsonb_build_object(v_key, v_text);
  END LOOP;
  RETURN v_result;
END $$;

-- Guardado con versión: un cambio simultáneo de otra cuenta no se sobrescribe. Repetir los mismos datos es idempotente.
CREATE OR REPLACE FUNCTION public.save_tool_life_record(p_elemento_id text, p_version integer, p_datos jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_datos jsonb; v_row public.inventario_hojas_vida; v_name text;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF public.tool_life_record_type(p_elemento_id) IS NULL THEN RAISE EXCEPTION 'Este producto no tiene hoja de vida'; END IF;
  v_datos := public.normalize_tool_life_data(p_datos);
  v_name := left(coalesce(nullif(auth.jwt()->'user_metadata'->>'name',''), auth.uid()::text, ''), 120);
  PERFORM pg_advisory_xact_lock(hashtextextended('hoja-vida-'||p_elemento_id,0));
  SELECT * INTO v_row FROM public.inventario_hojas_vida WHERE elemento_id = p_elemento_id;
  IF NOT FOUND THEN
    IF coalesce(p_version,0) <> 0 THEN RAISE EXCEPTION 'La hoja de vida cambió en otra sesión. Actualice y vuelva a guardar'; END IF;
    INSERT INTO public.inventario_hojas_vida(elemento_id, datos, version, updated_by, updated_by_nombre)
      VALUES (p_elemento_id, v_datos, 1, auth.uid(), v_name) RETURNING * INTO v_row;
  ELSIF v_row.datos = v_datos THEN
    RETURN to_jsonb(v_row);
  ELSIF v_row.version IS DISTINCT FROM p_version THEN
    RAISE EXCEPTION 'La hoja de vida cambió en otra sesión. Actualice y vuelva a guardar';
  ELSE
    UPDATE public.inventario_hojas_vida SET datos = v_datos, version = version + 1, updated_at = now(), updated_by = auth.uid(), updated_by_nombre = v_name
      WHERE elemento_id = p_elemento_id RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END $$;

-- Fotos privadas de mantenimiento: carpeta de la cuenta y de la solicitud, WebP o JPG de hasta 8 MB.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('maintenance-images','maintenance-images',false,8388608,ARRAY['image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.maintenance_photo_is_linked(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.inventario_mantenimientos WHERE fotos @> jsonb_build_array('maintenance://'||p_path));
$$;
CREATE OR REPLACE FUNCTION public.maintenance_photo_can_delete(p_path text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.fulgor_can_operate(),false) OR split_part(p_path,'/',1) IS DISTINCT FROM auth.uid()::text THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(split_part(p_path,'/',2),0));
  RETURN NOT public.maintenance_photo_is_linked(p_path);
END $$;
DROP POLICY IF EXISTS maintenance_images_read ON storage.objects;
DROP POLICY IF EXISTS maintenance_images_insert ON storage.objects;
DROP POLICY IF EXISTS maintenance_images_delete ON storage.objects;
CREATE POLICY maintenance_images_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='maintenance-images' AND public.fulgor_role() IN ('admin','operador','consulta')
  AND (public.maintenance_photo_is_linked(name) OR (public.fulgor_can_operate() AND split_part(name,'/',1)=auth.uid()::text)));
CREATE POLICY maintenance_images_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='maintenance-images' AND public.fulgor_can_operate() AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|webp)$');
CREATE POLICY maintenance_images_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='maintenance-images' AND public.maintenance_photo_can_delete(name));

-- Registro inmutable. Reintentar con el mismo UUID devuelve el registro confirmado sin duplicarlo.
CREATE OR REPLACE FUNCTION public.register_tool_maintenance(p_request_id uuid, p_elemento_id text, p_input jsonb, p_fotos jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_item public.elementos; v_previous public.inventario_mantenimientos; v_row public.inventario_mantenimientos;
  v_photo jsonb; v_ref text; v_refs jsonb := '[]'::jsonb; v_fecha date; v_next date; v_tipo text; v_cost numeric; v_hours numeric;
  v_payload jsonb;
BEGIN
  IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Solicitud de mantenimiento inválida'; END IF;
  IF p_fotos IS NULL OR jsonb_typeof(p_fotos) <> 'array' OR jsonb_array_length(p_fotos) > 12 THEN RAISE EXCEPTION 'Adjunte hasta 12 fotografías'; END IF;
  FOR v_photo IN SELECT value FROM jsonb_array_elements(p_fotos) LOOP
    IF jsonb_typeof(v_photo) <> 'string' THEN RAISE EXCEPTION 'Referencia fotográfica inválida'; END IF;
    v_ref := v_photo #>> '{}';
    IF v_ref !~ ('^maintenance://'||auth.uid()::text||'/'||p_request_id::text||'/[0-9a-f-]{36}\.(jpg|webp)$') THEN
      RAISE EXCEPTION 'La foto debe pertenecer a esta cuenta y a este mantenimiento';
    END IF;
    IF v_refs ? v_ref THEN RAISE EXCEPTION 'Fotografía duplicada'; END IF;
    v_refs := v_refs || jsonb_build_array(v_ref);
  END LOOP;
  v_payload := jsonb_build_object('elemento_id', p_elemento_id, 'input', p_input, 'fotos', v_refs);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT * INTO v_previous FROM public.inventario_mantenimientos WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.request_payload <> v_payload THEN
      RAISE EXCEPTION 'La solicitud corresponde a otros datos';
    END IF;
    RETURN to_jsonb(v_previous);
  END IF;

  SELECT * INTO v_item FROM public.elementos WHERE id = p_elemento_id FOR SHARE;
  IF NOT FOUND OR v_item.archived THEN RAISE EXCEPTION 'Seleccione una herramienta activa'; END IF;
  IF public.tool_life_record_type(p_elemento_id) IS NULL THEN RAISE EXCEPTION 'Este producto no tiene hoja de vida'; END IF;

  IF coalesce(p_input->>'fecha','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Indique la fecha del mantenimiento'; END IF;
  v_fecha := (p_input->>'fecha')::date;
  -- Fecha de Colombia (UTC-5, sin horario de verano).
  IF v_fecha > ((now() AT TIME ZONE 'UTC') - interval '5 hours')::date THEN RAISE EXCEPTION 'La fecha del mantenimiento no puede ser futura'; END IF;
  v_tipo := upper(trim(coalesce(p_input->>'tipo','')));
  IF v_tipo NOT IN ('PREVENTIVO','CORRECTIVO','INSPECCIÓN') THEN RAISE EXCEPTION 'Seleccione el tipo de mantenimiento'; END IF;
  IF length(trim(coalesce(p_input->>'descripcion',''))) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Describa el trabajo realizado (hasta 2000 caracteres)'; END IF;
  IF length(trim(coalesce(p_input->>'realizado_por',''))) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Indique quién realizó el mantenimiento'; END IF;
  IF length(trim(coalesce(p_input->>'repuestos',''))) > 1000 OR length(trim(coalesce(p_input->>'observaciones',''))) > 1000 THEN
    RAISE EXCEPTION 'Repuestos y observaciones admiten hasta 1000 caracteres';
  END IF;
  IF p_input ? 'costo_cop' AND jsonb_typeof(p_input->'costo_cop') <> 'number' THEN RAISE EXCEPTION 'Costo inválido'; END IF;
  v_cost := coalesce((p_input->>'costo_cop')::numeric, 0);
  IF v_cost < 0 OR v_cost > 999999999999.99 OR round(v_cost,2) <> v_cost THEN RAISE EXCEPTION 'El costo debe ser no negativo y tener hasta dos decimales'; END IF;
  IF p_input ? 'horas_uso' AND p_input->'horas_uso' <> 'null'::jsonb THEN
    IF jsonb_typeof(p_input->'horas_uso') <> 'number' THEN RAISE EXCEPTION 'Horas de uso inválidas'; END IF;
    v_hours := (p_input->>'horas_uso')::numeric;
    IF v_hours < 0 OR v_hours > 99999999999.9 OR round(v_hours,1) <> v_hours THEN RAISE EXCEPTION 'Las horas de uso deben ser no negativas con un decimal'; END IF;
  END IF;
  IF nullif(p_input->>'proxima_fecha','') IS NOT NULL THEN
    IF p_input->>'proxima_fecha' !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Fecha del próximo mantenimiento inválida'; END IF;
    v_next := (p_input->>'proxima_fecha')::date;
    IF v_next < v_fecha THEN RAISE EXCEPTION 'El próximo mantenimiento debe ser posterior a la fecha del trabajo'; END IF;
  END IF;
  -- Las fotos deben estar subidas antes de confirmar el registro.
  FOR v_ref IN SELECT value FROM jsonb_array_elements_text(v_refs) ORDER BY value LOOP
    PERFORM 1 FROM storage.objects WHERE bucket_id='maintenance-images' AND name=substring(v_ref from 15) FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La foto aún no está guardada en Supabase'; END IF;
  END LOOP;

  INSERT INTO public.inventario_mantenimientos(request_id, actor_id, elemento_id, elemento_codigo, elemento_nombre, fecha, tipo, descripcion,
    repuestos, costo_cop, realizado_por, horas_uso, proxima_fecha, observaciones, fotos, registrado_por, request_payload)
  VALUES (p_request_id, auth.uid(), v_item.id, v_item.codigo, v_item.nombre, v_fecha, v_tipo, trim(p_input->>'descripcion'),
    trim(coalesce(p_input->>'repuestos','')), v_cost, upper(trim(p_input->>'realizado_por')), v_hours, v_next,
    trim(coalesce(p_input->>'observaciones','')), v_refs,
    left(coalesce(nullif(auth.jwt()->'user_metadata'->>'name',''), auth.uid()::text, ''), 120), v_payload)
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

REVOKE ALL ON FUNCTION public.tool_life_record_type(text), public.normalize_tool_life_data(jsonb), public.save_tool_life_record(text,integer,jsonb),
  public.maintenance_photo_is_linked(text), public.maintenance_photo_can_delete(text), public.register_tool_maintenance(uuid,text,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool_life_record(text,integer,jsonb), public.register_tool_maintenance(uuid,text,jsonb,jsonb),
  public.maintenance_photo_is_linked(text), public.maintenance_photo_can_delete(text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

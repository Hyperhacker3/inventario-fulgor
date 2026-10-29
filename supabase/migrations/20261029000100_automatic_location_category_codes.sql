-- Códigos automáticos e inmutables de ubicaciones y categorías.
-- Ejecutar completo después de las migraciones de administración y niveles.
-- Conserva códigos/IDs de ubicaciones existentes, nombres de categorías y referencias de productos.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
LOCK TABLE public.almacenes,public.estanterias,public.niveles_estanteria,public.cajas,public.inventario_categorias IN SHARE ROW EXCLUSIVE MODE;

-- Incluye categorías usadas por importaciones posteriores al catálogo original.
INSERT INTO public.inventario_categorias(id,nombre)
SELECT DISTINCT e.categoria,replace(e.categoria,'_',' ') FROM public.elementos e
WHERE NOT EXISTS(SELECT 1 FROM public.inventario_categorias c WHERE c.id=e.categoria);

CREATE TABLE IF NOT EXISTS public.inventario_ubicacion_consecutivos (
  prefijo text PRIMARY KEY CHECK (prefijo IN ('ALM','EST','NIV','CAJ')),
  ultimo bigint NOT NULL CHECK (ultimo BETWEEN 0 AND 999999999999)
);
CREATE TABLE IF NOT EXISTS public.inventario_autocodigo_solicitudes (
  request_id uuid PRIMARY KEY,actor_id uuid NOT NULL,kind text NOT NULL,
  payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario_ubicacion_consecutivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_autocodigo_solicitudes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_ubicacion_consecutivos,public.inventario_autocodigo_solicitudes FROM PUBLIC,anon,authenticated;

DO $$
DECLARE r record; v_last numeric;
BEGIN
  FOR r IN SELECT * FROM (VALUES('almacenes','ALM'),('estanterias','EST'),('niveles_estanteria','NIV'),('cajas','CAJ')) t(tabla,prefijo) LOOP
    EXECUTE format('SELECT coalesce(max((substring(upper(trim(codigo)) from $1))::numeric),0) FROM public.%I',r.tabla)
      INTO v_last USING '^'||r.prefijo||'-?([0-9]+)$';
    IF v_last>999999999999 THEN RAISE EXCEPTION 'El consecutivo existente de % supera el límite admitido',r.prefijo; END IF;
    INSERT INTO public.inventario_ubicacion_consecutivos(prefijo,ultimo) VALUES(r.prefijo,v_last)
      ON CONFLICT(prefijo) DO UPDATE SET ultimo=greatest(inventario_ubicacion_consecutivos.ultimo,excluded.ultimo);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.assign_inventory_location_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_prefix text:=TG_ARGV[0];v_next bigint;v_code text;v_used boolean;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN RAISE EXCEPTION 'El código de ubicación no se puede modificar'; END IF;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-ubicacion-'||v_prefix,0));
  LOOP
    UPDATE public.inventario_ubicacion_consecutivos SET ultimo=ultimo+1 WHERE prefijo=v_prefix AND ultimo<999999999999 RETURNING ultimo INTO v_next;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se pudo asignar el consecutivo de ubicación'; END IF;
    v_code:=v_prefix||lpad(v_next::text,greatest(3,length(v_next::text)),'0');
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE upper(trim(codigo))=$1)',TG_TABLE_NAME) INTO v_used USING v_code;
    EXIT WHEN NOT v_used;
  END LOOP;
  NEW.codigo:=v_code;
  IF TG_TABLE_NAME='cajas' THEN NEW.nombre:=v_code; END IF;
  RETURN NEW;
END $$;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES('almacenes','ALM'),('estanterias','EST'),('niveles_estanteria','NIV'),('cajas','CAJ')) t(tabla,prefijo) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS assign_inventory_location_code ON public.%I',r.tabla);
    EXECUTE format('CREATE TRIGGER assign_inventory_location_code BEFORE INSERT OR UPDATE OF codigo ON public.%I FOR EACH ROW EXECUTE FUNCTION public.assign_inventory_location_code(%L)',r.tabla,r.prefijo);
  END LOOP;
END $$;

ALTER TABLE public.inventario_categorias ADD COLUMN IF NOT EXISTS codigo text;
CREATE OR REPLACE FUNCTION public.next_inventory_category_code(p_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_letters text;v_base text;v_start integer;v_number integer;v_code text;v_offset integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  v_letters:=regexp_replace(upper(translate(coalesce(p_name,''),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),'[^A-Z]','','g');
  IF v_letters='' THEN v_letters:='CAT'; END IF;
  v_base:=substr(v_letters||'XXX',1,3);
  v_start:=(ascii(substr(v_base,1,1))-65)*676+(ascii(substr(v_base,2,1))-65)*26+ascii(substr(v_base,3,1))-65;
  FOR v_offset IN 0..17575 LOOP
    v_number:=(v_start+v_offset)%17576;
    v_code:=chr(65+v_number/676)||chr(65+(v_number/26)%26)||chr(65+v_number%26);
    IF NOT EXISTS(SELECT 1 FROM public.inventario_categorias WHERE codigo=v_code) THEN RETURN v_code; END IF;
  END LOOP;
  RAISE EXCEPTION 'No quedan códigos de categoría de tres letras disponibles';
END $$;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id,nombre FROM public.inventario_categorias WHERE codigo IS NULL ORDER BY id COLLATE "C" LOOP
    UPDATE public.inventario_categorias SET codigo=public.next_inventory_category_code(r.nombre) WHERE id=r.id;
  END LOOP;
END $$;
ALTER TABLE public.inventario_categorias ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inventario_categorias_codigo_key ON public.inventario_categorias(codigo);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='inventario_categorias_codigo_format' AND conrelid='public.inventario_categorias'::regclass) THEN
    ALTER TABLE public.inventario_categorias ADD CONSTRAINT inventario_categorias_codigo_format CHECK(codigo ~ '^[A-Z]{3}$');
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.assign_inventory_category_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.codigo IS DISTINCT FROM OLD.codigo OR NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'El código de categoría no se puede modificar'; END IF;
  ELSE NEW.codigo:=public.next_inventory_category_code(NEW.nombre);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assign_inventory_category_code ON public.inventario_categorias;
CREATE TRIGGER assign_inventory_category_code BEFORE INSERT OR UPDATE OF codigo,id ON public.inventario_categorias
  FOR EACH ROW EXECUTE FUNCTION public.assign_inventory_category_code();

CREATE OR REPLACE FUNCTION public.create_inventory_location_auto(p_request_id uuid,p_kind text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_previous public.inventario_autocodigo_solicitudes;v_result jsonb;v_payload jsonb;
  v_name text;v_description text;v_parent text;v_level text;v_state text;v_id text;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Solicitud de ubicación inválida'; END IF;
  IF p_kind NOT IN ('almacen','estanteria','nivel','caja') OR p_kind IS NULL THEN RAISE EXCEPTION 'Tipo de ubicación inválido'; END IF;
  v_name:=trim(coalesce(p_input->>'nombre',''));v_description:=coalesce(p_input->>'descripcion','');
  IF p_kind<>'caja' AND length(v_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Escriba un nombre de hasta 100 caracteres'; END IF;
  v_state:=upper(coalesce(p_input->>'estado',CASE WHEN p_kind='caja' THEN 'PARCIAL' ELSE 'OPERATIVO' END));
  v_parent:=nullif(p_input->>'parent_id','');v_level:=nullif(p_input->>'nivel_id','');
  v_payload:=jsonb_build_object('nombre',v_name,'descripcion',v_description,'parent_id',v_parent,'nivel_id',v_level,'estado',v_state,'ciudad',coalesce(p_input->>'ciudad',''));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,2910));
  SELECT * INTO v_previous FROM public.inventario_autocodigo_solicitudes WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.kind<>p_kind OR v_previous.payload<>v_payload THEN RAISE EXCEPTION 'La solicitud corresponde a otros datos'; END IF;
    RETURN v_previous.result;
  END IF;
  v_id:=upper(p_kind)||'-'||gen_random_uuid()::text;
  IF p_kind='almacen' THEN
    IF v_state NOT IN ('OPERATIVO','MANTENIMIENTO','INACTIVO') THEN RAISE EXCEPTION 'Estado de almacén inválido'; END IF;
    INSERT INTO public.almacenes(id,codigo,nombre,direccion,descripcion,estado) VALUES(v_id,'',v_name,p_input->>'ciudad',v_description,initcap(lower(v_state))) RETURNING to_jsonb(almacenes.*) INTO v_result;
  ELSIF p_kind='estanteria' THEN
    IF v_parent IS NULL THEN RAISE EXCEPTION 'Seleccione un almacén'; END IF;
    INSERT INTO public.estanterias(id,codigo,nombre,almacen_id,descripcion) VALUES(v_id,'',v_name,v_parent,v_description) RETURNING to_jsonb(estanterias.*) INTO v_result;
  ELSIF p_kind='nivel' THEN
    IF v_parent IS NULL THEN RAISE EXCEPTION 'Seleccione una estantería'; END IF;
    INSERT INTO public.niveles_estanteria(id,codigo,nombre,estanteria_id,descripcion) VALUES(v_id,'',v_name,v_parent,v_description) RETURNING to_jsonb(niveles_estanteria.*) INTO v_result;
  ELSE
    IF v_level IS NULL OR v_parent IS NULL THEN RAISE EXCEPTION 'Seleccione un nivel de estantería'; END IF;
    IF v_state NOT IN ('COMPLETA','PARCIAL','VACIA') THEN RAISE EXCEPTION 'Estado de caja inválido'; END IF;
    INSERT INTO public.cajas(id,codigo,nombre,estanteria_id,nivel_id,descripcion,estado) VALUES(v_id,'','',v_parent,v_level,v_description,v_state) RETURNING to_jsonb(cajas.*) INTO v_result;
  END IF;
  INSERT INTO public.inventario_autocodigo_solicitudes(request_id,actor_id,kind,payload,result) VALUES(p_request_id,auth.uid(),p_kind,v_payload,v_result);
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.create_inventory_category_auto(p_request_id uuid,p_name text,p_active boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_previous public.inventario_autocodigo_solicitudes;v_name text;v_payload jsonb;v_row public.inventario_categorias;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  v_name:=trim(regexp_replace(p_name,'\s+',' ','g'));
  IF p_request_id IS NULL OR v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 100 OR p_active IS NULL THEN RAISE EXCEPTION 'Nombre de categoría inválido'; END IF;
  v_payload:=jsonb_build_object('nombre',v_name,'activo',p_active);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,2910));
  SELECT * INTO v_previous FROM public.inventario_autocodigo_solicitudes WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.kind<>'categoria' OR v_previous.payload<>v_payload THEN RAISE EXCEPTION 'La solicitud corresponde a otros datos'; END IF;
    RETURN public.inventory_data_catalog();
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  SELECT * INTO v_row FROM public.inventario_categorias WHERE lower(trim(regexp_replace(nombre,'\s+',' ','g')))=lower(v_name) ORDER BY activo DESC,id COLLATE "C" LIMIT 1;
  IF FOUND THEN
    IF NOT v_row.activo AND p_active THEN RAISE EXCEPTION 'Esta categoría está inactiva. Reactívela en Administración de datos'; END IF;
    IF v_row.activo AND NOT p_active THEN RAISE EXCEPTION 'La categoría ya existe y está activa. Edite su disponibilidad en Administración de datos'; END IF;
  ELSE
    INSERT INTO public.inventario_categorias(id,nombre,activo) VALUES('CAT-'||gen_random_uuid()::text,v_name,p_active) RETURNING * INTO v_row;
  END IF;
  INSERT INTO public.inventario_autocodigo_solicitudes(request_id,actor_id,kind,payload,result) VALUES(p_request_id,auth.uid(),'categoria',v_payload,to_jsonb(v_row));
  RETURN public.inventory_data_catalog();
END $$;
REVOKE ALL ON FUNCTION public.assign_inventory_location_code(),public.next_inventory_category_code(text),public.assign_inventory_category_code(),
  public.create_inventory_location_auto(uuid,text,jsonb),public.create_inventory_category_auto(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_inventory_location_auto(uuid,text,jsonb),public.create_inventory_category_auto(uuid,text,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Nombres opcionales de cajas; ejecutar completo DESPUÉS de las migraciones de códigos/normalización.
-- No renombra ni renumera registros existentes, ni cambia padres, stock o documentos.
BEGIN;
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
  IF TG_TABLE_NAME='cajas' THEN NEW.nombre:=coalesce(nullif(trim(NEW.nombre),''),v_code); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.create_inventory_location_auto(p_request_id uuid,p_kind text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_previous public.inventario_autocodigo_solicitudes;v_result jsonb;v_payload jsonb;
  v_name text;v_description text;v_parent text;v_level text;v_state text;v_id text;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Solicitud de ubicación inválida'; END IF;
  IF p_kind NOT IN ('almacen','estanteria','nivel','caja') OR p_kind IS NULL THEN RAISE EXCEPTION 'Tipo de ubicación inválido'; END IF;
  v_name:=trim(coalesce(p_input->>'nombre',''));v_description:=coalesce(p_input->>'descripcion','');
  IF length(v_name)>100 OR (p_kind<>'caja' AND length(v_name)<1) THEN RAISE EXCEPTION 'Escriba un nombre de hasta 100 caracteres'; END IF;
  v_state:=upper(coalesce(p_input->>'estado',CASE WHEN p_kind='caja' THEN 'PARCIAL' ELSE 'OPERATIVO' END));
  v_parent:=nullif(p_input->>'parent_id','');v_level:=nullif(p_input->>'nivel_id','');
  v_payload:=jsonb_build_object('nombre',v_name,'descripcion',v_description,'parent_id',v_parent,'nivel_id',v_level,'estado',v_state,'ciudad',coalesce(p_input->>'ciudad',''));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,2910));
  SELECT * INTO v_previous FROM public.inventario_autocodigo_solicitudes WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.kind<>p_kind OR v_previous.payload<>v_payload THEN RAISE EXCEPTION 'La solicitud corresponde a otros datos'; END IF;
    IF p_kind='almacen' THEN SELECT to_jsonb(u.*) INTO v_result FROM public.almacenes u WHERE id=v_previous.result->>'id';
    ELSIF p_kind='estanteria' THEN SELECT to_jsonb(u.*) INTO v_result FROM public.estanterias u WHERE id=v_previous.result->>'id';
    ELSIF p_kind='nivel' THEN SELECT to_jsonb(u.*) INTO v_result FROM public.niveles_estanteria u WHERE id=v_previous.result->>'id';
    ELSE SELECT to_jsonb(u.*) INTO v_result FROM public.cajas u WHERE id=v_previous.result->>'id'; END IF;
    IF v_result IS NULL THEN RAISE EXCEPTION 'La ubicación de esta solicitud ya no está disponible'; END IF;
    RETURN v_result;
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
    INSERT INTO public.cajas(id,codigo,nombre,estanteria_id,nivel_id,descripcion,estado) VALUES(v_id,'',v_name,v_parent,v_level,v_description,v_state) RETURNING to_jsonb(cajas.*) INTO v_result;
  END IF;
  INSERT INTO public.inventario_autocodigo_solicitudes(request_id,actor_id,kind,payload,result) VALUES(p_request_id,auth.uid(),p_kind,v_payload,v_result);
  RETURN v_result;
END $$;


CREATE OR REPLACE FUNCTION public.validate_inventory_box_name() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.nombre:=trim(coalesce(NEW.nombre,''));
  IF length(NEW.nombre)>100 THEN RAISE EXCEPTION 'El nombre de la caja admite hasta 100 caracteres'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_inventory_box_name ON public.cajas;
CREATE TRIGGER validate_inventory_box_name BEFORE INSERT OR UPDATE OF nombre ON public.cajas
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_box_name();

CREATE OR REPLACE FUNCTION public.inventory_box_names_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(public.fulgor_is_admin(),false)
$$;
REVOKE ALL ON FUNCTION public.assign_inventory_location_code(),public.validate_inventory_box_name(),
  public.create_inventory_location_auto(uuid,text,jsonb),public.inventory_box_names_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_inventory_location_auto(uuid,text,jsonb),public.inventory_box_names_ready() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

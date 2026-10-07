-- Mayúsculas en registros nuevos; no cambia inventario ni documentos anteriores.
-- Requiere todas las migraciones anteriores, incluida remission_route.
BEGIN;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS uppercase_names boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.uppercase_inventory_names() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    NEW.nombre := upper(trim(NEW.nombre));
  END IF;
  IF TG_OP='INSERT' OR NEW.especificaciones->'marca' IS DISTINCT FROM OLD.especificaciones->'marca' THEN
    IF jsonb_typeof(NEW.especificaciones->'marca')='string' THEN
      NEW.especificaciones := jsonb_set(NEW.especificaciones,'{marca}',to_jsonb(upper(trim(NEW.especificaciones->>'marca'))));
      IF length(NEW.especificaciones->>'marca')>100 THEN RAISE EXCEPTION 'La marca debe ser texto de hasta 100 caracteres'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS z_uppercase_inventory_names ON public.elementos;
CREATE TRIGGER z_uppercase_inventory_names BEFORE INSERT OR UPDATE OF nombre,especificaciones ON public.elementos
FOR EACH ROW EXECUTE FUNCTION public.uppercase_inventory_names();

CREATE OR REPLACE FUNCTION public.uppercase_remission_names() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_line jsonb; v_lines jsonb := '[]'::jsonb;
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.uppercase_names := true;
  ELSE
    IF NEW.uppercase_names IS DISTINCT FROM OLD.uppercase_names THEN
      RAISE EXCEPTION 'No se puede cambiar la política de nombres de una remisión emitida';
    END IF;
    -- Only normalize the new document while the secure wrapper builds it.
    -- Old records and already issued routes retain their original snapshots.
    IF NOT OLD.uppercase_names OR OLD.lugar_remision IS NOT NULL THEN RETURN NEW; END IF;
  END IF;
  NEW.proyecto_nombre := upper(NEW.proyecto_nombre);
  NEW.cliente := upper(NEW.cliente);
  NEW.ubicacion := upper(NEW.ubicacion);
  NEW.entregado_por := upper(trim(NEW.entregado_por));
  NEW.cargo_entregado := upper(trim(NEW.cargo_entregado));
  NEW.recibido_por := upper(trim(NEW.recibido_por));
  NEW.cargo_recibido := upper(trim(NEW.cargo_recibido));
  NEW.lugar_remision := upper(NEW.lugar_remision);
  NEW.lugar_destino := upper(NEW.lugar_destino);
  IF jsonb_typeof(NEW.datos_transporte->'transportador')='string' THEN
    NEW.datos_transporte := jsonb_set(NEW.datos_transporte,'{transportador}',to_jsonb(upper(NEW.datos_transporte->>'transportador')));
  END IF;
  IF jsonb_typeof(NEW.datos_transporte->'placaVehiculo')='string' THEN
    NEW.datos_transporte := jsonb_set(NEW.datos_transporte,'{placaVehiculo}',to_jsonb(upper(NEW.datos_transporte->>'placaVehiculo')));
  END IF;
  FOR v_line IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
    v_lines := v_lines || jsonb_build_array(v_line || jsonb_build_object(
      'nombre',upper(v_line->>'nombre'),'marca',upper(coalesce(v_line->>'marca',''))));
  END LOOP;
  NEW.items := v_lines;
  RETURN NEW;
END $$;
-- Runs after the authoritative brand/weight/value snapshots.
DROP TRIGGER IF EXISTS z_uppercase_remission_names ON public.remisiones;
CREATE TRIGGER z_uppercase_remission_names BEFORE INSERT OR UPDATE ON public.remisiones
FOR EACH ROW EXECUTE FUNCTION public.uppercase_remission_names();

CREATE OR REPLACE FUNCTION public.uppercase_outgoing_history_names() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.tipo='SALIDA' THEN
    NEW.elemento_nombre := upper(NEW.elemento_nombre);
    NEW.proyecto_nombre := upper(NEW.proyecto_nombre);
    NEW.responsable := upper(NEW.responsable);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS uppercase_outgoing_history_names ON public.historial;
CREATE TRIGGER uppercase_outgoing_history_names BEFORE INSERT ON public.historial
FOR EACH ROW EXECUTE FUNCTION public.uppercase_outgoing_history_names();
REVOKE ALL ON FUNCTION public.uppercase_inventory_names(),public.uppercase_remission_names(),
  public.uppercase_outgoing_history_names() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

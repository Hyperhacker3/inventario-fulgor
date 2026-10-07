-- Lugares y código de emisión. No renombra documentos ni cambia existencias anteriores.
BEGIN;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS lugar_remision text;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS lugar_destino text;

CREATE OR REPLACE FUNCTION public.remission_place_code(p_place text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(
    regexp_replace(normalize(upper(p_place), NFD), U&'[\0300-\036f]', '', 'g'), '[^A-Z0-9]+', '-', 'g'));
$$;
CREATE OR REPLACE FUNCTION public.normalize_remission_place(p_place text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE v_place text := trim(regexp_replace(p_place, '\s+', ' ', 'g'));
BEGIN
  IF v_place IS NULL OR length(v_place) NOT BETWEEN 1 AND 80 OR public.remission_place_code(v_place) = '' THEN
    RAISE EXCEPTION 'Indique lugares de remisión y destino de hasta 80 caracteres, con letras o números';
  END IF;
  RETURN v_place;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.remisiones'::regclass AND conname='remission_route_places') THEN
    ALTER TABLE public.remisiones ADD CONSTRAINT remission_route_places CHECK (
      (lugar_remision IS NULL AND lugar_destino IS NULL) OR
      (lugar_remision IS NOT NULL AND lugar_destino IS NOT NULL AND
       lugar_remision=public.normalize_remission_place(lugar_remision) AND lugar_destino=public.normalize_remission_place(lugar_destino)));
  END IF;
END $$;

-- Keep the annual sequence and reconcile it when the migration is run again.
INSERT INTO public.remision_consecutivos(anio,ultimo)
SELECT CASE WHEN numero_remision ~ '^REM-[0-9]{4}-[0-9]+$' THEN substring(numero_remision FROM '^REM-([0-9]{4})-')::integer
       ELSE left(substring(numero_remision FROM '-([0-9]{8})-[0-9]+$'),4)::integer END,
       max(substring(numero_remision FROM '-([0-9]+)$')::bigint)
FROM public.remisiones
WHERE numero_remision ~ '^REM-[0-9]{4}-[0-9]+$' OR numero_remision ~ '^REM-.+-[0-9]{8}-[0-9]+$'
GROUP BY 1 ON CONFLICT(anio) DO UPDATE SET ultimo=greatest(public.remision_consecutivos.ultimo,excluded.ultimo);

-- The internal ID remains stable for foreign keys. Avoid truncating it past 9999.
DO $$ DECLARE v_source text; v_fixed text;
BEGIN
  v_source := pg_get_functiondef('public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb)'::regprocedure);
  v_fixed := replace(v_source, 'lpad(v_number::text, 4, ''0'')', 'lpad(v_number::text, greatest(4, length(v_number::text)), ''0'')');
  IF v_fixed = v_source AND strpos(v_source,'lpad(v_number::text, greatest(4, length(v_number::text)), ''0'')') = 0 THEN
    RAISE EXCEPTION 'Versión de dispatch_inventory no reconocida; revise el consecutivo antes de activar';
  END IF;
  EXECUTE v_fixed;
END $$;

CREATE OR REPLACE FUNCTION public.preserve_remission_route() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.lugar_remision IS NOT NULL AND (NEW.lugar_remision IS DISTINCT FROM OLD.lugar_remision OR
      NEW.lugar_destino IS DISTINCT FROM OLD.lugar_destino OR NEW.numero_remision IS DISTINCT FROM OLD.numero_remision OR
      NEW.fecha IS DISTINCT FROM OLD.fecha OR NEW.request_payload->'route_request' IS DISTINCT FROM OLD.request_payload->'route_request') THEN
    RAISE EXCEPTION 'Los lugares, código y fecha de una remisión emitida no se pueden modificar';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS preserve_remission_route ON public.remisiones;
CREATE TRIGGER preserve_remission_route BEFORE UPDATE ON public.remisiones
FOR EACH ROW EXECUTE FUNCTION public.preserve_remission_route();

CREATE OR REPLACE FUNCTION public.dispatch_inventory_with_route(
  p_request_id uuid,p_proyecto_id text,p_entregado_por text,p_cargo_entregado text,
  p_recibido_por text,p_cargo_recibido text,p_observaciones text,p_items jsonb,p_datos_transporte jsonb,p_fotos jsonb,
  p_lugar_remision text,p_lugar_destino text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_origin text; v_destination text; v_route jsonb; v_rem public.remisiones%ROWTYPE;
  v_result jsonb; v_existing boolean; v_date date; v_year integer; v_sequence bigint; v_code text;
BEGIN
  IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
  v_origin := public.normalize_remission_place(p_lugar_remision);
  v_destination := public.normalize_remission_place(p_lugar_destino);
  v_route := jsonb_build_object('lugarRemision',v_origin,'lugarDestino',v_destination);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT * INTO v_rem FROM public.remisiones WHERE request_id=p_request_id;
  v_existing := FOUND;
  IF v_existing AND (v_rem.actor_id IS DISTINCT FROM auth.uid() OR v_rem.request_payload->'route_request' IS DISTINCT FROM v_route) THEN
    RAISE EXCEPTION 'La solicitud ya existe con otros lugares o usuario';
  END IF;
  -- Reuse the atomic stock, photo, transport, weight, price and company snapshots.
  v_result := public.dispatch_inventory_with_photos(p_request_id,p_proyecto_id,p_entregado_por,p_cargo_entregado,
    p_recibido_por,p_cargo_recibido,p_observaciones,p_items,p_datos_transporte,p_fotos);
  IF v_existing THEN RETURN v_result; END IF;
  SELECT * INTO v_rem FROM public.remisiones WHERE id=v_result->>'id';
  v_date := (v_rem.created_at AT TIME ZONE 'America/Bogota')::date;
  v_year := extract(year FROM v_date)::integer;
  -- The base dispatch holds this counter's row lock until this transaction ends.
  SELECT ultimo INTO v_sequence FROM public.remision_consecutivos WHERE anio=v_year;
  IF v_sequence IS NULL THEN RAISE EXCEPTION 'No se pudo obtener el consecutivo de remisión'; END IF;
  v_code := 'REM-'||public.remission_place_code(v_origin)||'-'||public.remission_place_code(v_destination)||'-'||
    to_char(v_date,'YYYYMMDD')||'-'||lpad(v_sequence::text,greatest(3,length(v_sequence::text)),'0');
  UPDATE public.remisiones SET numero_remision=v_code,fecha=to_char(v_date,'YYYY-MM-DD'),
    lugar_remision=v_origin,lugar_destino=v_destination,
    request_payload=request_payload||jsonb_build_object('route_request',v_route)
    WHERE id=v_rem.id RETURNING * INTO v_rem;
  UPDATE public.historial SET motivo='Remisión '||v_code WHERE remision_id=v_rem.id;
  RETURN to_jsonb(v_rem);
END $$;

CREATE OR REPLACE FUNCTION public.remission_route_ready() RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT true; $$;
REVOKE ALL ON FUNCTION public.remission_place_code(text), public.normalize_remission_place(text), public.preserve_remission_route(),
  public.dispatch_inventory_with_route(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,text,text), public.remission_route_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_inventory_with_route(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,text,text), public.remission_route_ready() TO authenticated;
-- New writes must supply the route. These functions remain callable by the secured wrapper.
REVOKE EXECUTE ON FUNCTION public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb),
  public.dispatch_inventory_with_transport(uuid,text,text,text,text,text,text,jsonb,jsonb),
  public.dispatch_inventory_with_unit_weights(uuid,text,text,text,text,text,text,jsonb,jsonb),
  public.dispatch_inventory_with_photos(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

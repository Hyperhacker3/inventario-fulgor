-- Código nuevo con la ciudad del proyecto. No modifica proyectos ni remisiones anteriores.
-- Aplicar completo después de las migraciones anteriores, incluida WebP.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_project_city(p_city text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE v_city text := trim(regexp_replace(normalize(p_city, NFC), '\s+', ' ', 'g'));
BEGIN
  IF v_city IS NULL OR length(v_city) NOT BETWEEN 1 AND 80 OR public.remission_place_code(v_city) = ''
    OR v_city !~ '^[[:alpha:]][[:alpha:] .’''-]*$'
    OR v_city ~* '\m(calle|carrera|avenida|diagonal|transversal|carretera|kilómetro|kilometro|vía|via|km)\M' THEN
    RAISE EXCEPTION 'Indique solo la ciudad del proyecto, sin dirección, números ni departamento (máximo 80 caracteres). Corríjala en Proyectos';
  END IF;
  RETURN v_city;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_inventory_with_route(
  p_request_id uuid,p_proyecto_id text,p_entregado_por text,p_cargo_entregado text,
  p_recibido_por text,p_cargo_recibido text,p_observaciones text,p_items jsonb,p_datos_transporte jsonb,p_fotos jsonb,
  p_lugar_remision text,p_lugar_destino text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_city text; v_origin text; v_destination text; v_route jsonb; v_rem public.remisiones%ROWTYPE;
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
  -- Read the authoritative project location snapshot, never the supplied delivery address.
  v_city := public.normalize_project_city(v_rem.ubicacion);
  v_date := (v_rem.created_at AT TIME ZONE 'America/Bogota')::date;
  v_year := extract(year FROM v_date)::integer;
  -- The base dispatch holds this counter's row lock until this transaction ends.
  SELECT ultimo INTO v_sequence FROM public.remision_consecutivos WHERE anio=v_year;
  IF v_sequence IS NULL THEN RAISE EXCEPTION 'No se pudo obtener el consecutivo de remisión'; END IF;
  v_code := 'REM-'||public.remission_place_code(v_origin)||'-'||public.remission_place_code(v_city)||'-'||
    to_char(v_date,'YYYYMMDD')||'-'||lpad(v_sequence::text,greatest(3,length(v_sequence::text)),'0');
  UPDATE public.remisiones SET numero_remision=v_code,fecha=to_char(v_date,'YYYY-MM-DD'),
    lugar_remision=v_origin,lugar_destino=v_destination,
    request_payload=request_payload||jsonb_build_object('route_request',v_route)
    WHERE id=v_rem.id RETURNING * INTO v_rem;
  UPDATE public.historial SET motivo='Remisión '||v_code WHERE remision_id=v_rem.id;
  RETURN to_jsonb(v_rem);
END $$;


CREATE OR REPLACE FUNCTION public.project_city_remission_ready() RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT true; $$;
REVOKE ALL ON FUNCTION public.normalize_project_city(text), public.project_city_remission_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.project_city_remission_ready() TO authenticated;
-- CREATE OR REPLACE preserves the route RPC ACL and the existing internal write restrictions.
NOTIFY pgrst,'reload schema';
COMMIT;

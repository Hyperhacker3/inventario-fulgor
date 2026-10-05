-- Peso por unidad de inventario. Requiere 20261005_remission_transport.sql.
-- No asigna pesos ficticios ni cambia productos o remisiones existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.item_unit_weight_kg(p_specs jsonb)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_weight jsonb; v_value numeric; v_kg numeric;
BEGIN
  v_weight := p_specs -> 'peso_unitario';
  IF v_weight IS NULL OR v_weight = 'null'::jsonb THEN RETURN NULL; END IF;
  IF jsonb_typeof(v_weight) <> 'object' OR jsonb_typeof(v_weight -> 'valor') IS DISTINCT FROM 'number'
    OR coalesce(v_weight ->> 'unidad','') NOT IN ('g','kg') THEN RAISE EXCEPTION 'Peso unitario inválido'; END IF;
  v_value := (v_weight ->> 'valor')::numeric;
  v_kg := CASE WHEN v_weight ->> 'unidad' = 'g' THEN v_value / 1000 ELSE v_value END;
  IF v_value <= 0 OR round(v_value,3) <> v_value OR v_kg >= 1000000 THEN RAISE EXCEPTION 'Peso unitario inválido'; END IF;
  RETURN v_kg;
END $$;
REVOKE ALL ON FUNCTION public.item_unit_weight_kg(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.item_unit_weight_kg(jsonb) TO authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.elementos'::regclass AND conname = 'elementos_peso_unitario_check') THEN
    ALTER TABLE public.elementos ADD CONSTRAINT elementos_peso_unitario_check
      CHECK (public.item_unit_weight_kg(especificaciones) IS NULL OR public.item_unit_weight_kg(especificaciones) > 0);
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.dispatch_inventory_with_transport(
  p_request_id uuid, p_proyecto_id text, p_entregado_por text, p_cargo_entregado text,
  p_recibido_por text, p_cargo_recibido text, p_observaciones text, p_items jsonb,
  p_datos_transporte jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb; v_data jsonb := '{}'::jsonb; v_items jsonb;
  v_key text; v_value text; v_line jsonb; v_weight numeric; v_rem public.remisiones%ROWTYPE;
BEGIN
  IF NOT public.fulgor_can_operate() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_datos_transporte IS NULL OR jsonb_typeof(p_datos_transporte) <> 'object' THEN
    RAISE EXCEPTION 'Datos de transporte inválidos';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['telefonoRemite','telefonoRecibe','transportador','cedulaTransportador',
    'telefonoTransportador','placaVehiculo','fechaDespacho','fechaDevolucion'] LOOP
    IF p_datos_transporte ? v_key AND jsonb_typeof(p_datos_transporte -> v_key) <> 'string' THEN
      RAISE EXCEPTION 'Campo de transporte inválido: %', v_key;
    END IF;
    v_value := trim(coalesce(p_datos_transporte ->> v_key, ''));
    IF length(v_value) > (CASE WHEN v_key = 'transportador' THEN 180 WHEN v_key = 'placaVehiculo' THEN 20
      WHEN v_key IN ('fechaDespacho','fechaDevolucion') THEN 10 ELSE 40 END) THEN
      RAISE EXCEPTION 'Campo de transporte demasiado largo: %', v_key;
    END IF;
    IF v_key IN ('fechaDespacho','fechaDevolucion') AND v_value <> '' THEN
      IF v_value !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(v_value::date, 'YYYY-MM-DD') <> v_value THEN
        RAISE EXCEPTION 'Fecha de transporte inválida';
      END IF;
    END IF;
    v_data := v_data || jsonb_build_object(v_key, v_value);
  END LOOP;
  IF v_data ->> 'fechaDespacho' <> '' AND v_data ->> 'fechaDevolucion' <> ''
    AND (v_data ->> 'fechaDevolucion')::date < (v_data ->> 'fechaDespacho')::date THEN
    RAISE EXCEPTION 'La devolución no puede ser anterior al despacho';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Despacho vacío';
  END IF;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF v_line ? 'pesoTotalKg' AND v_line -> 'pesoTotalKg' <> 'null'::jsonb THEN
      IF jsonb_typeof(v_line -> 'pesoTotalKg') <> 'number' THEN RAISE EXCEPTION 'Peso inválido'; END IF;
      v_weight := (v_line ->> 'pesoTotalKg')::numeric;
      IF v_weight < 0 OR v_weight >= 100000000000 OR round(v_weight, 9) <> v_weight THEN RAISE EXCEPTION 'Peso inválido'; END IF;
    END IF;
  END LOOP;
  -- The original atomic dispatch validates permissions, stock, locks and request identity.
  -- Include normalized transport in its fingerprint: changing it on retry cannot mutate a remission.
  v_items := jsonb_set(p_items, '{0,datosTransporte}', v_data, true);
  v_result := public.dispatch_inventory(p_request_id, p_proyecto_id, p_entregado_por, p_cargo_entregado,
    p_recibido_por, p_cargo_recibido, p_observaciones, v_items);
  UPDATE public.remisiones AS rem SET datos_transporte = v_data,
    items = (SELECT jsonb_agg(saved.value || CASE
      WHEN source.value ? 'pesoTotalKg' AND source.value -> 'pesoTotalKg' <> 'null'::jsonb
        THEN jsonb_build_object('pesoTotalKg', (source.value ->> 'pesoTotalKg')::numeric)
      ELSE '{}'::jsonb END ORDER BY saved.position)
      FROM jsonb_array_elements(rem.items) WITH ORDINALITY AS saved(value, position)
      JOIN jsonb_array_elements(p_items) AS source(value)
        ON source.value ->> 'elementoId' = saved.value ->> 'elementoId')
    WHERE rem.id = v_result ->> 'id' RETURNING rem.* INTO v_rem;
  RETURN to_jsonb(v_rem);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_inventory_with_transport(uuid,text,text,text,text,text,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_inventory_with_transport(uuid,text,text,text,text,text,text,jsonb,jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.dispatch_inventory_with_unit_weights(
  p_request_id uuid, p_proyecto_id text, p_entregado_por text, p_cargo_entregado text,
  p_recibido_por text, p_cargo_recibido text, p_observaciones text, p_items jsonb, p_datos_transporte jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rem public.remisiones%ROWTYPE; v_item public.elementos%ROWTYPE; v_line jsonb;
  v_input jsonb := '[]'::jsonb; v_weighted jsonb := '[]'::jsonb; v_request jsonb; v_result jsonb;
  v_qty numeric; v_kg numeric;
BEGIN
  IF NOT public.fulgor_can_operate() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Despacho vacío'; END IF;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_input := v_input || jsonb_build_array(jsonb_build_object('elementoId',v_line ->> 'elementoId','cantidad',v_line -> 'cantidad'));
  END LOOP;
  v_request := jsonb_build_object('proyecto',p_proyecto_id,'entregado',p_entregado_por,'cargo_entregado',p_cargo_entregado,
    'recibido',p_recibido_por,'cargo_recibido',p_cargo_recibido,'observaciones',p_observaciones,'items',v_input,'transporte',p_datos_transporte);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT * INTO v_rem FROM public.remisiones WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_rem.actor_id IS DISTINCT FROM auth.uid() OR v_rem.request_payload -> 'unit_weight_request' IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'La solicitud ya existe con otro contenido o usuario';
    END IF;
    RETURN to_jsonb(v_rem);
  END IF;
  -- Lock stock and its declared weight before taking the document snapshot.
  PERFORM 1 FROM public.elementos WHERE id IN (SELECT value ->> 'elementoId' FROM jsonb_array_elements(v_input)) ORDER BY id FOR UPDATE;
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_input) LOOP
    v_qty := (v_line ->> 'cantidad')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 OR round(v_qty,3) <> v_qty THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO v_item FROM public.elementos WHERE id=v_line ->> 'elementoId' AND archived=false;
    IF NOT FOUND THEN RAISE EXCEPTION 'Componente no encontrado'; END IF;
    v_kg := public.item_unit_weight_kg(v_item.especificaciones);
    v_line := v_line || jsonb_build_object('pesoUnitario',v_item.especificaciones -> 'peso_unitario');
    IF v_kg IS NOT NULL THEN v_line := v_line || jsonb_build_object('pesoTotalKg',round(v_kg*v_qty,9)); END IF;
    v_weighted := v_weighted || jsonb_build_array(v_line);
  END LOOP;
  v_result := public.dispatch_inventory_with_transport(p_request_id,p_proyecto_id,p_entregado_por,p_cargo_entregado,
    p_recibido_por,p_cargo_recibido,p_observaciones,v_weighted,p_datos_transporte);
  UPDATE public.remisiones AS rem SET
    request_payload = rem.request_payload || jsonb_build_object('unit_weight_request',v_request),
    items = (SELECT jsonb_agg(saved.value || jsonb_build_object('pesoUnitario',source.value -> 'pesoUnitario') ORDER BY saved.position)
      FROM jsonb_array_elements(rem.items) WITH ORDINALITY AS saved(value,position)
      JOIN jsonb_array_elements(v_weighted) AS source(value) ON source.value ->> 'elementoId' = saved.value ->> 'elementoId')
    WHERE rem.id=v_result ->> 'id' RETURNING rem.* INTO v_rem;
  RETURN to_jsonb(v_rem);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_inventory_with_unit_weights(uuid,text,text,text,text,text,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_inventory_with_unit_weights(uuid,text,text,text,text,text,text,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.unit_weight_dispatch_ready() RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS 'SELECT true';
REVOKE ALL ON FUNCTION public.unit_weight_dispatch_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unit_weight_dispatch_ready() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

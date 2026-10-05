-- Datos opcionales de transporte y pesos. No borra productos ni remisiones.
BEGIN;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS datos_transporte jsonb NOT NULL DEFAULT '{}'::jsonb;

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
      IF v_weight < 0 OR v_weight >= 100000000000 OR round(v_weight, 3) <> v_weight THEN RAISE EXCEPTION 'Peso inválido'; END IF;
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
NOTIFY pgrst, 'reload schema';
COMMIT;

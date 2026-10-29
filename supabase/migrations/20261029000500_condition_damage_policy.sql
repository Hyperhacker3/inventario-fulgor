-- Ejecutar completo desde la cuenta del usuario después de las migraciones actuales.
-- Aplica la regla de daño por estado a NUEVAS salidas, sin actualizar productos ni documentos anteriores.
BEGIN;
CREATE OR REPLACE FUNCTION public.inventory_condition_is_damaged(p_condition text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT trim(regexp_replace(upper(translate(normalize(coalesce(p_condition,''),NFC),
    'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),'\s+',' ','g'))
    IN ('MALO','MAL ESTADO','OBSOLETO','DANADO','DANADA','DANADOS','DANADAS','REPARACION','EN REPARACION','PARA REPARAR')
$$;
CREATE OR REPLACE FUNCTION public.dispatch_inventory(
  p_request_id uuid, p_proyecto_id text, p_entregado_por text, p_cargo_entregado text,
  p_recibido_por text, p_cargo_recibido text, p_observaciones text, p_items jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_project public.proyectos%ROWTYPE; v_item public.elementos%ROWTYPE; v_rem public.remisiones%ROWTYPE;
  v_line jsonb; v_items jsonb := '[]'::jsonb; v_qty numeric; v_year integer; v_number bigint; v_id text;
  v_request_payload jsonb;
BEGIN
  IF NOT public.fulgor_can_operate() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
  v_request_payload := jsonb_build_object('proyecto', p_proyecto_id, 'entregado', p_entregado_por,
    'cargo_entregado', p_cargo_entregado, 'recibido', p_recibido_por, 'cargo_recibido', p_cargo_recibido,
    'observaciones', p_observaciones, 'items', p_items);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO v_rem FROM public.remisiones WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_rem.actor_id IS DISTINCT FROM auth.uid() OR v_rem.request_payload IS DISTINCT FROM v_request_payload THEN
      RAISE EXCEPTION 'La solicitud ya existe con otro contenido o usuario';
    END IF;
    RETURN to_jsonb(v_rem);
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Despacho vacío';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) AS line(value)) <>
     (SELECT count(DISTINCT line.value ->> 'elementoId') FROM jsonb_array_elements(p_items) AS line(value)) THEN
    RAISE EXCEPTION 'Componente repetido';
  END IF;
  SELECT * INTO v_project FROM public.proyectos WHERE id = p_proyecto_id AND estado = 'ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'Proyecto no disponible'; END IF;
  IF nullif(trim(p_recibido_por), '') IS NULL THEN RAISE EXCEPTION 'Falta receptor'; END IF;

  -- Lock all requested rows in a deterministic order for concurrent dispatches.
  PERFORM 1 FROM public.elementos WHERE id IN
    (SELECT line.value ->> 'elementoId' FROM jsonb_array_elements(p_items) AS line(value))
    ORDER BY id FOR UPDATE;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value ->> 'elementoId' LOOP
    v_qty := (v_line ->> 'cantidad')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 OR round(v_qty, 3) <> v_qty THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO v_item FROM public.elementos WHERE id = v_line ->> 'elementoId' AND archived = false;
    IF NOT FOUND THEN RAISE EXCEPTION 'Componente no encontrado'; END IF;
    IF v_item.stock_pendiente OR public.inventory_condition_is_damaged(v_item.estado) OR v_item.cantidad - v_item.cantidad_danados < v_qty THEN
      RAISE EXCEPTION 'Stock no disponible para %', v_item.codigo;
    END IF;
    v_items := v_items || jsonb_build_array(jsonb_build_object('elementoId', v_item.id, 'codigo', v_item.codigo,
      'nombre', v_item.nombre, 'cantidad', v_qty, 'unidad', lower(v_item.unidad)));
  END LOOP;

  v_year := extract(year FROM now() AT TIME ZONE 'America/Bogota')::integer;
  INSERT INTO public.remision_consecutivos(anio, ultimo) VALUES (v_year, 1)
    ON CONFLICT (anio) DO UPDATE SET ultimo = public.remision_consecutivos.ultimo + 1
    RETURNING ultimo INTO v_number;
  v_id := 'REM-' || v_year || '-' || lpad(v_number::text, 4, '0');
  INSERT INTO public.remisiones(id, numero_remision, fecha, proyecto_id, proyecto_nombre, cliente, ubicacion,
    entregado_por, cargo_entregado, recibido_por, cargo_recibido, items, observaciones, request_id, request_payload, actor_id)
  VALUES (v_id, v_id, to_char(now() AT TIME ZONE 'America/Bogota', 'DD Mon YYYY'), v_project.id,
    v_project.nombre, v_project.cliente, v_project.ubicacion, p_entregado_por, p_cargo_entregado,
    p_recibido_por, p_cargo_recibido, v_items, p_observaciones, p_request_id, v_request_payload, auth.uid())
  RETURNING * INTO v_rem;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value ->> 'elementoId' LOOP
    v_qty := (v_line ->> 'cantidad')::numeric;
    SELECT * INTO v_item FROM public.elementos WHERE id = v_line ->> 'elementoId';
    UPDATE public.elementos SET cantidad = cantidad - v_qty, updated_at = now() WHERE id = v_item.id;
    INSERT INTO public.historial(id, fecha, tipo, elemento_id, elemento_codigo, elemento_nombre, cantidad, unidad,
      responsable, motivo, remision_id, proyecto_id, proyecto_nombre, stock_anterior, stock_nuevo, actor_id)
    VALUES ('MOV-' || gen_random_uuid()::text, to_char(now() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI'),
      'SALIDA', v_item.id, v_item.codigo, v_item.nombre, v_qty, v_item.unidad,
      coalesce(auth.jwt() -> 'user_metadata' ->> 'name', auth.uid()::text),
      'Remisión ' || v_id, v_id, v_project.id, v_project.nombre, v_item.cantidad, v_item.cantidad - v_qty, auth.uid());
  END LOOP;
  RETURN to_jsonb(v_rem);
END $$;


REVOKE ALL ON FUNCTION public.inventory_condition_is_damaged(text),public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
-- La función de salida base sigue siendo interna; las RPC autorizadas conservan sus permisos.
NOTIFY pgrst,'reload schema';
COMMIT;

-- Disponibilidad sin descontar unidades dañadas ni bloquear salidas por estado.
-- Las etiquetas MALO, EN REPARACIÓN y PARA REPARAR siguen identificando el estado del producto,
-- pero su stock cuenta igual que el resto y permite salidas externas, internas y ajustes normales
-- (protegiendo únicamente los conteos pendientes y las reservas de préstamos internos activos).
-- No reescribe productos, cantidades, estados ni documentos anteriores.
-- Ejecutar COMPLETO desde la cuenta del usuario después de 20261106000100_internal_dispatch_types_projects.sql.
BEGIN;

ALTER TABLE public.elementos DROP CONSTRAINT IF EXISTS elementos_stock_valid;
ALTER TABLE public.elementos ADD CONSTRAINT elementos_stock_valid
  CHECK (cantidad >= 0 AND stock_minimo >= 0 AND cantidad_danados >= 0) NOT VALID;

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

  PERFORM 1 FROM public.elementos WHERE id IN
    (SELECT line.value ->> 'elementoId' FROM jsonb_array_elements(p_items) AS line(value))
    ORDER BY id FOR UPDATE;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value ->> 'elementoId' LOOP
    v_qty := (v_line ->> 'cantidad')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 OR round(v_qty, 3) <> v_qty THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO v_item FROM public.elementos WHERE id = v_line ->> 'elementoId' AND archived = false;
    IF NOT FOUND THEN RAISE EXCEPTION 'Componente no encontrado'; END IF;
    IF v_item.stock_pendiente OR v_item.cantidad - v_item.cantidad_prestada < v_qty THEN
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

CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  p_request_id uuid, p_elemento_id text, p_tipo text, p_cantidad numeric, p_motivo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_item public.elementos%ROWTYPE; v_row public.historial%ROWTYPE; v_delta numeric; v_request_payload jsonb;
BEGIN
  IF NOT public.fulgor_can_operate() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
  v_request_payload := jsonb_build_object('elemento', p_elemento_id, 'tipo', p_tipo,
    'cantidad', p_cantidad, 'motivo', p_motivo);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO v_row FROM public.historial WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_row.actor_id IS DISTINCT FROM auth.uid() OR v_row.request_payload IS DISTINCT FROM v_request_payload THEN
      RAISE EXCEPTION 'La solicitud ya existe con otro contenido o usuario';
    END IF;
    RETURN to_jsonb(v_row);
  END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('ENTRADA', 'AJUSTE') OR p_cantidad IS NULL OR
     round(p_cantidad, 3) <> p_cantidad OR (p_tipo = 'ENTRADA' AND p_cantidad <= 0) THEN
    RAISE EXCEPTION 'Movimiento inválido';
  END IF;
  SELECT * INTO v_item FROM public.elementos WHERE id = p_elemento_id AND archived = false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Componente no encontrado'; END IF;
  IF v_item.stock_pendiente AND (NOT public.fulgor_is_admin() OR p_tipo <> 'AJUSTE' OR p_cantidad < 0) THEN
    RAISE EXCEPTION 'El stock pendiente requiere un ajuste de administración';
  END IF;
  IF NOT v_item.stock_pendiente AND p_cantidad = 0 THEN RAISE EXCEPTION 'Movimiento inválido'; END IF;
  v_delta := p_cantidad;
  IF v_item.cantidad + v_delta < 0 OR v_item.cantidad + v_delta < v_item.cantidad_prestada THEN
    RAISE EXCEPTION 'El ajuste deja stock insuficiente';
  END IF;
  UPDATE public.elementos SET cantidad = cantidad + v_delta, stock_pendiente = false, updated_at = now() WHERE id = v_item.id;
  INSERT INTO public.historial(id, fecha, tipo, elemento_id, elemento_codigo, elemento_nombre, cantidad, unidad,
    responsable, motivo, stock_anterior, stock_nuevo, actor_id, request_id, request_payload)
  VALUES ('MOV-' || gen_random_uuid()::text, to_char(now() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI'),
    p_tipo, v_item.id, v_item.codigo, v_item.nombre, p_cantidad, v_item.unidad,
    coalesce(auth.jwt() -> 'user_metadata' ->> 'name', auth.uid()::text), p_motivo,
    CASE WHEN v_item.stock_pendiente THEN NULL ELSE v_item.cantidad END,
    v_item.cantidad + v_delta, auth.uid(), p_request_id, v_request_payload)
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.internal_permanent_stock(p_salida_id uuid,p_elemento_id text,p_quantity numeric,p_release boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h public.inventario_salidas_internas;e public.elementos;l public.inventario_prestamo_lineas;
BEGIN
 SELECT * INTO h FROM public.inventario_salidas_internas WHERE id=p_salida_id;
 SELECT * INTO l FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND original_id=p_elemento_id;
 SELECT * INTO e FROM public.elementos WHERE id=p_elemento_id FOR UPDATE;
 IF NOT FOUND OR p_quantity<=0 OR p_quantity<>l.cantidad-l.devuelta OR p_quantity IS NULL
  OR e.cantidad-p_quantity<0
  OR e.cantidad-p_quantity<(CASE WHEN p_release THEN e.cantidad_prestada-p_quantity ELSE e.cantidad_prestada END)
  OR e.cantidad_prestada<(CASE WHEN p_release THEN p_quantity ELSE 0 END) THEN
  RAISE EXCEPTION 'No coincide el saldo del material para convertir en permanente. Revise existencias y préstamos';END IF;
 UPDATE public.elementos SET cantidad=cantidad-p_quantity,
  cantidad_prestada=cantidad_prestada-CASE WHEN p_release THEN p_quantity ELSE 0 END,updated_at=now() WHERE id=e.id;
 INSERT INTO public.historial(id,fecha,tipo,elemento_id,elemento_codigo,elemento_nombre,cantidad,unidad,responsable,motivo,
  proyecto_id,proyecto_nombre,stock_anterior,stock_nuevo,actor_id)
 VALUES('MOV-'||gen_random_uuid()::text,to_char(now() AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI'),'SALIDA',
  e.id,l.snapshot->>'codigo',l.snapshot->>'nombre',p_quantity,l.snapshot->>'unidad',public.internal_actor_profile()->>'nombre',
  'Salida interna permanente '||h.codigo,h.proyecto->>'id',h.proyecto->>'nombre',e.cantidad,e.cantidad-p_quantity,auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.create_internal_dispatch(p_request_id uuid,p_personal_id uuid,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb;result jsonb;actor jsonb;worker public.inventario_personal;e public.elementos;line jsonb;snap jsonb;items jsonb:='[]'::jsonb;
 q numeric;y integer;seq bigint;code text;company jsonb;
BEGIN
 IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 payload:=jsonb_build_object('personalId',p_personal_id,'items',p_items);
 result:=public.internal_request_previous(p_request_id,'salida',payload);IF result IS NOT NULL THEN RETURN public.internal_dispatch_snapshot((result->>'id')::uuid,true);END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Seleccione materiales para la salida';END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'elementoId') FROM jsonb_array_elements(p_items)) THEN RAISE EXCEPTION 'Hay materiales repetidos o sin ID';END IF;
 SELECT * INTO worker FROM public.inventario_personal WHERE id=p_personal_id AND activo FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un trabajador activo de Personal';END IF;
 actor:=public.internal_actor_profile();
 PERFORM 1 FROM public.elementos WHERE id IN(SELECT value->>'elementoId' FROM jsonb_array_elements(p_items)) ORDER BY id FOR UPDATE;
 FOR line IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'elementoId' LOOP
  q:=(line->>'cantidad')::numeric;
  IF q IS NULL OR q<=0 OR q>=100000000000 OR round(q,3)<>q THEN RAISE EXCEPTION 'Cantidad inválida';END IF;
  SELECT * INTO e FROM public.elementos WHERE id=line->>'elementoId' AND NOT archived;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible';END IF;
  IF e.stock_pendiente OR e.cantidad-e.cantidad_prestada<q THEN RAISE EXCEPTION 'Stock no disponible para %',e.codigo;END IF;
  SELECT jsonb_build_object('elementoId',e.id,'codigo',e.codigo,'nombre',e.nombre,'marca',coalesce(e.especificaciones->>'marca',''),'cantidad',q,'unidad',e.unidad,
   'ubicacion',concat_ws(' > ',a.nombre,r.nombre,CASE WHEN n.id IS NOT NULL THEN 'Nivel '||n.nombre END,CASE WHEN b.id IS NOT NULL THEN b.codigo||CASE WHEN nullif(trim(b.nombre),'') IS NOT NULL AND b.nombre<>b.codigo THEN ' · '||b.nombre ELSE '' END END)) INTO snap
  FROM (SELECT 1) x LEFT JOIN public.almacenes a ON a.id=e.almacen_id LEFT JOIN public.estanterias r ON r.id=e.estanteria_id
   LEFT JOIN public.niveles_estanteria n ON n.id=e.nivel_id LEFT JOIN public.cajas b ON b.id=e.caja_id;
  items:=items||jsonb_build_array(snap);
 END LOOP;
 SELECT perfil INTO company FROM public.inventario_empresa WHERE singleton FOR SHARE;
 IF company IS NULL THEN RAISE EXCEPTION 'No se pudieron obtener los datos de empresa';END IF;
 y:=extract(year FROM now() AT TIME ZONE 'America/Bogota');
 INSERT INTO public.inventario_interno_consecutivos(anio,ultimo) VALUES(y,1) ON CONFLICT(anio) DO UPDATE SET ultimo=inventario_interno_consecutivos.ultimo+1 RETURNING ultimo INTO seq;
 code:='INT-'||to_char(now() AT TIME ZONE 'America/Bogota','YYYYMMDD')||'-'||lpad(seq::text,greatest(3,length(seq::text)),'0');
 INSERT INTO public.inventario_salidas_internas(id,codigo,actor_id,personal_id,entregado_por,cargo_entregado,recibido_por,cargo_recibido,empresa,items)
 VALUES(p_request_id,code,auth.uid(),worker.id,actor->>'nombre',actor->>'cargo',worker.nombre,worker.cargo,company,items);
 FOR snap IN SELECT value FROM jsonb_array_elements(items) LOOP
  INSERT INTO public.inventario_prestamo_lineas(salida_id,original_id,elemento_id,snapshot,cantidad) VALUES(p_request_id,snap->>'elementoId',snap->>'elementoId',snap,(snap->>'cantidad')::numeric);
  UPDATE public.elementos SET cantidad_prestada=cantidad_prestada+(snap->>'cantidad')::numeric,updated_at=now() WHERE id=snap->>'elementoId';
 END LOOP;
 result:=public.internal_dispatch_snapshot(p_request_id,true);
 INSERT INTO public.inventario_solicitudes_internas(request_id,actor_id,operation,payload,result) VALUES(p_request_id,auth.uid(),'salida',payload,result);
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.create_internal_dispatch_v2(p_request_id uuid,p_personal_id uuid,p_items jsonb,p_tipo text DEFAULT 'TEMPORAL',p_proyecto_id text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb;result jsonb;actor jsonb;worker public.inventario_personal;e public.elementos;line jsonb;snap jsonb;items jsonb:='[]'::jsonb;
 q numeric;y integer;seq bigint;code text;company jsonb;project public.proyectos;project_copy jsonb;
BEGIN
 IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 payload:=jsonb_build_object('personalId',p_personal_id,'items',p_items,'tipo',p_tipo,'proyectoId',p_proyecto_id);
 result:=public.internal_request_previous(p_request_id,'salida',payload);IF result IS NOT NULL THEN RETURN public.internal_dispatch_snapshot((result->>'id')::uuid,true);END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN ('TEMPORAL','PERMANENTE') THEN RAISE EXCEPTION 'Seleccione salida temporal o permanente';END IF;
 IF p_proyecto_id IS NOT NULL THEN
  SELECT * INTO project FROM public.proyectos WHERE id=p_proyecto_id AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proyecto de destino no disponible';END IF;
  project_copy:=jsonb_build_object('id',project.id,'nombre',project.nombre,'ubicacion',project.ubicacion,'cliente',project.cliente);
 END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Seleccione materiales para la salida';END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'elementoId') FROM jsonb_array_elements(p_items)) THEN RAISE EXCEPTION 'Hay materiales repetidos o sin ID';END IF;
 SELECT * INTO worker FROM public.inventario_personal WHERE id=p_personal_id AND activo FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un trabajador activo de Personal';END IF;
 actor:=public.internal_actor_profile();
 PERFORM 1 FROM public.elementos WHERE id IN(SELECT value->>'elementoId' FROM jsonb_array_elements(p_items)) ORDER BY id FOR UPDATE;
 FOR line IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'elementoId' LOOP
  q:=(line->>'cantidad')::numeric;
  IF q IS NULL OR q<=0 OR q>=100000000000 OR round(q,3)<>q THEN RAISE EXCEPTION 'Cantidad inválida';END IF;
  SELECT * INTO e FROM public.elementos WHERE id=line->>'elementoId' AND NOT archived;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible';END IF;
  IF e.stock_pendiente OR e.cantidad-e.cantidad_prestada<q THEN RAISE EXCEPTION 'Stock no disponible para %',e.codigo;END IF;
  SELECT jsonb_build_object('elementoId',e.id,'codigo',e.codigo,'nombre',e.nombre,'marca',coalesce(e.especificaciones->>'marca',''),'cantidad',q,'unidad',e.unidad,
   'ubicacion',concat_ws(' > ',a.nombre,r.nombre,CASE WHEN n.id IS NOT NULL THEN 'Nivel '||n.nombre END,CASE WHEN b.id IS NOT NULL THEN b.codigo||CASE WHEN nullif(trim(b.nombre),'') IS NOT NULL AND b.nombre<>b.codigo THEN ' · '||b.nombre ELSE '' END END)) INTO snap
  FROM (SELECT 1) x LEFT JOIN public.almacenes a ON a.id=e.almacen_id LEFT JOIN public.estanterias r ON r.id=e.estanteria_id
   LEFT JOIN public.niveles_estanteria n ON n.id=e.nivel_id LEFT JOIN public.cajas b ON b.id=e.caja_id;
  items:=items||jsonb_build_array(snap);
 END LOOP;
 SELECT perfil INTO company FROM public.inventario_empresa WHERE singleton FOR SHARE;
 IF company IS NULL THEN RAISE EXCEPTION 'No se pudieron obtener los datos de empresa';END IF;
 y:=extract(year FROM now() AT TIME ZONE 'America/Bogota');
 INSERT INTO public.inventario_interno_consecutivos(anio,ultimo) VALUES(y,1) ON CONFLICT(anio) DO UPDATE SET ultimo=inventario_interno_consecutivos.ultimo+1 RETURNING ultimo INTO seq;
 code:='INT-'||to_char(now() AT TIME ZONE 'America/Bogota','YYYYMMDD')||'-'||lpad(seq::text,greatest(3,length(seq::text)),'0');
 INSERT INTO public.inventario_salidas_internas(id,codigo,actor_id,personal_id,entregado_por,cargo_entregado,recibido_por,cargo_recibido,empresa,items,tipo,tipo_original,proyecto)
 VALUES(p_request_id,code,auth.uid(),worker.id,actor->>'nombre',actor->>'cargo',worker.nombre,worker.cargo,company,items,p_tipo,p_tipo,project_copy);
 FOR snap IN SELECT value FROM jsonb_array_elements(items) LOOP
  INSERT INTO public.inventario_prestamo_lineas(salida_id,original_id,elemento_id,snapshot,cantidad) VALUES(p_request_id,snap->>'elementoId',snap->>'elementoId',snap,(snap->>'cantidad')::numeric);
  IF p_tipo='TEMPORAL' THEN
   UPDATE public.elementos SET cantidad_prestada=cantidad_prestada+(snap->>'cantidad')::numeric,updated_at=now() WHERE id=snap->>'elementoId';
  ELSE PERFORM public.internal_permanent_stock(p_request_id,snap->>'elementoId',(snap->>'cantidad')::numeric,false);END IF;
 END LOOP;
 result:=public.internal_dispatch_snapshot(p_request_id,true);
 INSERT INTO public.inventario_solicitudes_internas(request_id,actor_id,operation,payload,result) VALUES(p_request_id,auth.uid(),'salida',payload,result);
 RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb),
  public.record_inventory_movement(uuid,text,text,numeric,text),
  public.internal_permanent_stock(uuid,text,numeric,boolean),
  public.create_internal_dispatch(uuid,uuid,jsonb),
  public.create_internal_dispatch_v2(uuid,uuid,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_inventory_movement(uuid,text,text,numeric,text),
  public.create_internal_dispatch(uuid,uuid,jsonb),
  public.create_internal_dispatch_v2(uuid,uuid,jsonb,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

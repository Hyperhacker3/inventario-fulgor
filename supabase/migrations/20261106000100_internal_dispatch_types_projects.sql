-- Proyecto de destino y salidas internas temporales/permanentes.
-- Ejecutar COMPLETO después de 20261029000600_internal_dispatches.sql desde la cuenta del usuario.
-- No convierte ni descuenta salidas anteriores por iniciativa propia.
BEGIN;
ALTER TABLE public.inventario_salidas_internas
 ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'TEMPORAL' CHECK(tipo IN ('TEMPORAL','PERMANENTE')),
 ADD COLUMN IF NOT EXISTS tipo_original text NOT NULL DEFAULT 'TEMPORAL' CHECK(tipo_original IN ('TEMPORAL','PERMANENTE')),
 ADD COLUMN IF NOT EXISTS proyecto jsonb,
 ADD COLUMN IF NOT EXISTS conversion jsonb;
-- Solo se escribe por RPC; conserva RLS y las copias de entregas anteriores.
CREATE OR REPLACE FUNCTION public.internal_permanent_stock(p_salida_id uuid,p_elemento_id text,p_quantity numeric,p_release boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h public.inventario_salidas_internas;e public.elementos;l public.inventario_prestamo_lineas;
BEGIN
 SELECT * INTO h FROM public.inventario_salidas_internas WHERE id=p_salida_id;
 SELECT * INTO l FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND original_id=p_elemento_id;
 SELECT * INTO e FROM public.elementos WHERE id=p_elemento_id FOR UPDATE;
 IF NOT FOUND OR p_quantity<=0 OR p_quantity<>l.cantidad-l.devuelta OR p_quantity IS NULL
  OR e.cantidad-p_quantity<e.cantidad_danados OR e.cantidad_prestada<(CASE WHEN p_release THEN p_quantity ELSE 0 END) THEN
  RAISE EXCEPTION 'No coincide el saldo del material para convertir en permanente. Revise existencias y daños';END IF;
 UPDATE public.elementos SET cantidad=cantidad-p_quantity,
  cantidad_prestada=cantidad_prestada-CASE WHEN p_release THEN p_quantity ELSE 0 END,updated_at=now() WHERE id=e.id;
 INSERT INTO public.historial(id,fecha,tipo,elemento_id,elemento_codigo,elemento_nombre,cantidad,unidad,responsable,motivo,
  proyecto_id,proyecto_nombre,stock_anterior,stock_nuevo,actor_id)
 VALUES('MOV-'||gen_random_uuid()::text,to_char(now() AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI'),'SALIDA',
  e.id,l.snapshot->>'codigo',l.snapshot->>'nombre',p_quantity,l.snapshot->>'unidad',public.internal_actor_profile()->>'nombre',
  'Salida interna permanente '||h.codigo,h.proyecto->>'id',h.proyecto->>'nombre',e.cantidad,e.cantidad-p_quantity,auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.internal_dispatch_snapshot(p_id uuid,p_returns boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE h public.inventario_salidas_internas;lines jsonb;events jsonb;state text;
BEGIN
 SELECT * INTO h FROM public.inventario_salidas_internas WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Salida interna no encontrada'; END IF;
 SELECT jsonb_agg(snapshot||jsonb_build_object('devuelta',devuelta,'pendiente',CASE WHEN h.tipo='PERMANENTE' THEN 0 ELSE cantidad-devuelta END,'permanente',CASE WHEN h.tipo='PERMANENTE' THEN cantidad-devuelta ELSE 0 END) ORDER BY snapshot->>'codigo',original_id),
 CASE WHEN bool_and(devuelta=cantidad) THEN 'DEVUELTA' WHEN bool_or(devuelta>0) THEN 'PARCIAL' ELSE 'PENDIENTE' END INTO lines,state
 FROM public.inventario_prestamo_lineas WHERE salida_id=p_id;
 events:='[]'::jsonb;
 IF p_returns THEN SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY created_at,id),'[]'::jsonb) INTO events FROM public.inventario_devoluciones_internas d WHERE salida_id=p_id; END IF;
 RETURN to_jsonb(h)||jsonb_build_object('items',coalesce(lines,'[]'::jsonb),'estado',CASE WHEN h.tipo='PERMANENTE' THEN 'PERMANENTE' ELSE state END,'devoluciones',events);
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
  IF e.stock_pendiente OR public.inventory_condition_is_damaged(e.estado) OR e.cantidad-e.cantidad_danados-e.cantidad_prestada<q THEN RAISE EXCEPTION 'Stock no disponible para %',e.codigo;END IF;
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
CREATE OR REPLACE FUNCTION public.return_internal_dispatch(p_request_id uuid,p_salida_id uuid,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb;result jsonb;actor jsonb;line jsonb;l public.inventario_prestamo_lineas;q numeric;events jsonb:='[]'::jsonb;mode text;
BEGIN
 IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado';END IF;
 payload:=jsonb_build_object('salidaId',p_salida_id,'items',p_items);
 result:=public.internal_request_previous(p_request_id,'devolucion',payload);IF result IS NOT NULL THEN RETURN public.internal_dispatch_snapshot(p_salida_id,true);END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Indique las cantidades que regresan';END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'elementoId') FROM jsonb_array_elements(p_items)) THEN RAISE EXCEPTION 'Hay materiales repetidos o sin ID';END IF;
 SELECT tipo INTO mode FROM public.inventario_salidas_internas WHERE id=p_salida_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Salida interna no encontrada';END IF;
 IF mode='PERMANENTE' THEN RAISE EXCEPTION 'Una salida permanente no admite devoluciones';END IF;
 PERFORM 1 FROM public.elementos WHERE id IN(SELECT elemento_id FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND original_id IN(SELECT value->>'elementoId' FROM jsonb_array_elements(p_items))) ORDER BY id FOR UPDATE;
 FOR line IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'elementoId' LOOP
  q:=(line->>'cantidad')::numeric;
  IF q IS NULL OR q<=0 OR q>=100000000000 OR round(q,3)<>q THEN RAISE EXCEPTION 'Cantidad inválida';END IF;
  SELECT * INTO l FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND original_id=line->>'elementoId';
  IF NOT FOUND OR l.elemento_id IS NULL THEN RAISE EXCEPTION 'El material no pertenece a esta salida interna';END IF;
  IF q>l.cantidad-l.devuelta THEN RAISE EXCEPTION 'La devolución supera la cantidad pendiente';END IF;
  UPDATE public.elementos SET cantidad_prestada=cantidad_prestada-q,updated_at=now() WHERE id=l.elemento_id AND cantidad_prestada>=q;
  IF NOT FOUND THEN RAISE EXCEPTION 'No coincide el saldo prestado. Revise esta salida antes de devolver';END IF;
  UPDATE public.inventario_prestamo_lineas SET devuelta=devuelta+q WHERE salida_id=p_salida_id AND original_id=l.original_id;
  events:=events||jsonb_build_array(l.snapshot||jsonb_build_object('cantidad',q));
 END LOOP;
 actor:=public.internal_actor_profile();
 INSERT INTO public.inventario_devoluciones_internas(id,salida_id,actor_id,registrado_por,cargo,items) VALUES(p_request_id,p_salida_id,auth.uid(),actor->>'nombre',actor->>'cargo',events);
 result:=public.internal_dispatch_snapshot(p_salida_id,true);
 INSERT INTO public.inventario_solicitudes_internas(request_id,actor_id,operation,payload,result) VALUES(p_request_id,auth.uid(),'devolucion',payload,result);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.make_internal_dispatch_permanent(p_request_id uuid,p_salida_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb;result jsonb;h public.inventario_salidas_internas;l public.inventario_prestamo_lineas;actor jsonb;
BEGIN
 IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado';END IF;
 payload:=jsonb_build_object('salidaId',p_salida_id);
 result:=public.internal_request_previous(p_request_id,'permanente',payload);
 IF result IS NOT NULL THEN RETURN public.internal_dispatch_snapshot(p_salida_id,true);END IF;
 SELECT * INTO h FROM public.inventario_salidas_internas WHERE id=p_salida_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Salida interna no encontrada';END IF;
 IF h.tipo='PERMANENTE' THEN RAISE EXCEPTION 'La salida ya es permanente';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND cantidad>devuelta) THEN
  RAISE EXCEPTION 'La salida no tiene materiales pendientes para convertir';END IF;
 PERFORM 1 FROM public.elementos WHERE id IN(SELECT elemento_id FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND cantidad>devuelta) ORDER BY id FOR UPDATE;
 FOR l IN SELECT * FROM public.inventario_prestamo_lineas WHERE salida_id=p_salida_id AND cantidad>devuelta ORDER BY original_id LOOP
  IF l.elemento_id IS NULL THEN RAISE EXCEPTION 'Producto pendiente no disponible';END IF;
  PERFORM public.internal_permanent_stock(p_salida_id,l.original_id,l.cantidad-l.devuelta,true);
 END LOOP;
 actor:=public.internal_actor_profile();
 UPDATE public.inventario_salidas_internas SET tipo='PERMANENTE',conversion=jsonb_build_object('created_at',now(),'actor_id',auth.uid(),
  'registrado_por',actor->>'nombre','cargo',actor->>'cargo','request_id',p_request_id) WHERE id=p_salida_id;
 result:=public.internal_dispatch_snapshot(p_salida_id,true);
 INSERT INTO public.inventario_solicitudes_internas(request_id,actor_id,operation,payload,result) VALUES(p_request_id,auth.uid(),'permanente',payload,result);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.list_internal_dispatches(p_page integer DEFAULT 1,p_pending boolean DEFAULT false,p_search text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb;total bigint;pending bigint;query text:=trim(coalesce(p_search,''));
BEGIN
 IF coalesce(public.fulgor_role(),'') NOT IN ('admin','operador','consulta') THEN RAISE EXCEPTION 'No autorizado';END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>1000000 OR p_pending IS NULL OR length(query)>180 THEN RAISE EXCEPTION 'Revise los filtros de las salidas internas';END IF;
 SELECT count(*) INTO pending FROM public.inventario_salidas_internas h WHERE h.tipo='TEMPORAL' AND EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas l WHERE l.salida_id=h.id AND l.devuelta<l.cantidad);
 SELECT count(*) INTO total FROM public.inventario_salidas_internas h WHERE (NOT p_pending OR h.tipo='TEMPORAL' AND EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas l WHERE l.salida_id=h.id AND l.devuelta<l.cantidad))
  AND (query='' OR h.codigo ILIKE '%'||query||'%' OR h.recibido_por ILIKE '%'||query||'%' OR h.entregado_por ILIKE '%'||query||'%' OR h.proyecto->>'nombre' ILIKE '%'||query||'%' OR EXISTS(SELECT 1 FROM jsonb_array_elements(h.items) item WHERE item->>'nombre' ILIKE '%'||query||'%' OR item->>'codigo' ILIKE '%'||query||'%'));
 SELECT coalesce(jsonb_agg(public.internal_dispatch_snapshot(h.id,false) ORDER BY h.created_at DESC,h.id DESC),'[]'::jsonb) INTO rows FROM (
  SELECT h.* FROM public.inventario_salidas_internas h WHERE (NOT p_pending OR h.tipo='TEMPORAL' AND EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas l WHERE l.salida_id=h.id AND l.devuelta<l.cantidad))
   AND (query='' OR h.codigo ILIKE '%'||query||'%' OR h.recibido_por ILIKE '%'||query||'%' OR h.entregado_por ILIKE '%'||query||'%' OR h.proyecto->>'nombre' ILIKE '%'||query||'%' OR EXISTS(SELECT 1 FROM jsonb_array_elements(h.items) item WHERE item->>'nombre' ILIKE '%'||query||'%' OR item->>'codigo' ILIKE '%'||query||'%'))
  ORDER BY h.created_at DESC,h.id DESC LIMIT 20 OFFSET (p_page-1)*20
 ) h;
 RETURN jsonb_build_object('rows',rows,'total',total,'pending',pending);
END $$;
REVOKE ALL ON FUNCTION public.internal_permanent_stock(uuid,text,numeric,boolean),public.internal_dispatch_snapshot(uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_internal_dispatch_v2(uuid,uuid,jsonb,text,text),public.make_internal_dispatch_permanent(uuid,uuid),public.return_internal_dispatch(uuid,uuid,jsonb),public.list_internal_dispatches(integer,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_internal_dispatch_v2(uuid,uuid,jsonb,text,text),public.make_internal_dispatch_permanent(uuid,uuid),public.return_internal_dispatch(uuid,uuid,jsonb),public.list_internal_dispatches(integer,boolean,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

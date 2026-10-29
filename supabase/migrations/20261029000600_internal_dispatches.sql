-- Salidas internas temporales y personal. Ejecutar COMPLETO desde la cuenta del usuario.
-- No importa productos, no modifica remisiones ni reduce el inventario total.
BEGIN;
ALTER TABLE public.elementos ADD COLUMN IF NOT EXISTS cantidad_prestada numeric(14,3) NOT NULL DEFAULT 0 CHECK(cantidad_prestada>=0 AND cantidad_prestada<=cantidad);
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
    IF v_item.stock_pendiente OR public.inventory_condition_is_damaged(v_item.estado) OR v_item.cantidad - v_item.cantidad_danados - v_item.cantidad_prestada < v_qty THEN
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



CREATE TABLE IF NOT EXISTS public.inventario_personal (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nombre text NOT NULL CHECK(length(trim(nombre)) BETWEEN 1 AND 180),
 cargo text NOT NULL CHECK(length(trim(cargo)) BETWEEN 1 AND 180),activo boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inventario_salidas_internas (
 id uuid PRIMARY KEY,codigo text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),actor_id uuid NOT NULL,
 personal_id uuid NOT NULL REFERENCES public.inventario_personal(id),entregado_por text NOT NULL,cargo_entregado text NOT NULL,
 recibido_por text NOT NULL,cargo_recibido text NOT NULL,empresa jsonb NOT NULL,items jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.inventario_prestamo_lineas (
 salida_id uuid NOT NULL REFERENCES public.inventario_salidas_internas(id),original_id text NOT NULL,
 elemento_id text REFERENCES public.elementos(id) ON DELETE SET NULL,snapshot jsonb NOT NULL,
 cantidad numeric(14,3) NOT NULL CHECK(cantidad>0),devuelta numeric(14,3) NOT NULL DEFAULT 0 CHECK(devuelta>=0 AND devuelta<=cantidad),
 PRIMARY KEY(salida_id,original_id)
);
CREATE TABLE IF NOT EXISTS public.inventario_devoluciones_internas (
 id uuid PRIMARY KEY,salida_id uuid NOT NULL REFERENCES public.inventario_salidas_internas(id),created_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid NOT NULL,registrado_por text NOT NULL,cargo text NOT NULL,items jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.inventario_interno_consecutivos (anio integer PRIMARY KEY,ultimo bigint NOT NULL CHECK(ultimo>0));
CREATE TABLE IF NOT EXISTS public.inventario_solicitudes_internas (
 request_id uuid PRIMARY KEY,actor_id uuid NOT NULL,operation text NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS salidas_internas_fecha_idx ON public.inventario_salidas_internas(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS prestamo_elemento_idx ON public.inventario_prestamo_lineas(elemento_id);
CREATE INDEX IF NOT EXISTS devoluciones_salida_idx ON public.inventario_devoluciones_internas(salida_id,created_at,id);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['inventario_personal','inventario_salidas_internas','inventario_prestamo_lineas','inventario_devoluciones_internas','inventario_interno_consecutivos','inventario_solicitudes_internas'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  IF t NOT IN ('inventario_interno_consecutivos','inventario_solicitudes_internas') THEN
   EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
   EXECUTE format('DROP POLICY IF EXISTS internal_read ON public.%I',t);
   EXECUTE format('CREATE POLICY internal_read ON public.%I FOR SELECT TO authenticated USING (public.fulgor_role() IN (''admin'',''operador'',''consulta''))',t);
  END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.guard_borrowed_inventory() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.cantidad_prestada>0 THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Este producto tiene materiales pendientes de devolución interna'; END IF;
  IF NEW.archived OR NEW.unidad IS DISTINCT FROM OLD.unidad THEN RAISE EXCEPTION 'Registre las devoluciones internas antes de archivar o cambiar la unidad'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_borrowed_inventory ON public.elementos;
CREATE TRIGGER guard_borrowed_inventory BEFORE UPDATE OF archived,unidad OR DELETE ON public.elementos FOR EACH ROW EXECUTE FUNCTION public.guard_borrowed_inventory();

CREATE OR REPLACE FUNCTION public.internal_actor_profile() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE m jsonb:=coalesce(auth.jwt()->'user_metadata','{}'::jsonb);n text;c text;r text;
BEGIN
 r:=CASE public.fulgor_role() WHEN 'admin' THEN 'Administrador' WHEN 'operador' THEN 'Operador' WHEN 'consulta' THEN 'Consulta' ELSE 'Personal de inventario' END;
 SELECT trim(value) INTO n FROM unnest(ARRAY[m->>'name',m->>'full_name',m->>'display_name']) value WHERE nullif(trim(value),'') IS NOT NULL AND position('@' IN value)=0 LIMIT 1;
 n:=coalesce(n,r);c:=coalesce(nullif(trim(m->>'cargo'),''),r);
 IF length(n)>180 OR length(c)>180 THEN RAISE EXCEPTION 'Revise el nombre y cargo del perfil de su sesión (máximo 180 caracteres)'; END IF;
 RETURN jsonb_build_object('nombre',upper(n),'cargo',upper(c));
END $$;
CREATE OR REPLACE FUNCTION public.internal_request_previous(p_id uuid,p_operation text,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.inventario_solicitudes_internas;
BEGIN
 IF p_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,3010));
 SELECT * INTO r FROM public.inventario_solicitudes_internas WHERE request_id=p_id;
 IF FOUND THEN
  IF r.actor_id IS DISTINCT FROM auth.uid() OR r.operation<>p_operation OR r.payload IS DISTINCT FROM p_payload THEN RAISE EXCEPTION 'La solicitud corresponde a otros datos o usuario'; END IF;
  RETURN r.result;
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.save_internal_staff(p_request_id uuid,p_id uuid,p_nombre text,p_cargo text,p_activo boolean,p_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb;previous jsonb;r public.inventario_personal;
BEGIN
 IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'Solo administración puede gestionar personal'; END IF;
 p_nombre:=upper(trim(p_nombre));p_cargo:=upper(trim(p_cargo));
 IF p_nombre IS NULL OR p_cargo IS NULL OR length(p_nombre) NOT BETWEEN 1 AND 180 OR length(p_cargo) NOT BETWEEN 1 AND 180 OR p_activo IS NULL THEN RAISE EXCEPTION 'Escriba nombre y cargo (máximo 180 caracteres)'; END IF;
 payload:=jsonb_build_object('id',p_id,'nombre',p_nombre,'cargo',p_cargo,'activo',p_activo,'version',p_version);
 previous:=public.internal_request_previous(p_request_id,'personal',payload);IF previous IS NOT NULL THEN RETURN previous;END IF;
 IF p_id IS NULL THEN INSERT INTO public.inventario_personal(nombre,cargo,activo) VALUES(p_nombre,p_cargo,p_activo) RETURNING * INTO r;
 ELSE
  UPDATE public.inventario_personal SET nombre=p_nombre,cargo=p_cargo,activo=p_activo,version=version+1 WHERE id=p_id AND version=p_version RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'El trabajador cambió. Actualice Personal y revise sus datos'; END IF;
 END IF;
 previous:=to_jsonb(r);
 INSERT INTO public.inventario_solicitudes_internas(request_id,actor_id,operation,payload,result) VALUES(p_request_id,auth.uid(),'personal',payload,previous);
 RETURN previous;
END $$;
CREATE OR REPLACE FUNCTION public.internal_dispatch_snapshot(p_id uuid,p_returns boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE h public.inventario_salidas_internas;lines jsonb;events jsonb;state text;
BEGIN
 SELECT * INTO h FROM public.inventario_salidas_internas WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Salida interna no encontrada'; END IF;
 SELECT jsonb_agg(snapshot||jsonb_build_object('devuelta',devuelta,'pendiente',cantidad-devuelta) ORDER BY snapshot->>'codigo',original_id),
 CASE WHEN bool_and(devuelta=cantidad) THEN 'DEVUELTA' WHEN bool_or(devuelta>0) THEN 'PARCIAL' ELSE 'PENDIENTE' END INTO lines,state
 FROM public.inventario_prestamo_lineas WHERE salida_id=p_id;
 events:='[]'::jsonb;
 IF p_returns THEN SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY created_at,id),'[]'::jsonb) INTO events FROM public.inventario_devoluciones_internas d WHERE salida_id=p_id; END IF;
 RETURN to_jsonb(h)||jsonb_build_object('items',coalesce(lines,'[]'::jsonb),'estado',state,'devoluciones',events);
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
CREATE OR REPLACE FUNCTION public.return_internal_dispatch(p_request_id uuid,p_salida_id uuid,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb;result jsonb;actor jsonb;line jsonb;l public.inventario_prestamo_lineas;q numeric;events jsonb:='[]'::jsonb;
BEGIN
 IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado';END IF;
 payload:=jsonb_build_object('salidaId',p_salida_id,'items',p_items);
 result:=public.internal_request_previous(p_request_id,'devolucion',payload);IF result IS NOT NULL THEN RETURN public.internal_dispatch_snapshot(p_salida_id,true);END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Indique las cantidades que regresan';END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'elementoId') FROM jsonb_array_elements(p_items)) THEN RAISE EXCEPTION 'Hay materiales repetidos o sin ID';END IF;
 PERFORM 1 FROM public.inventario_salidas_internas WHERE id=p_salida_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Salida interna no encontrada';END IF;
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
CREATE OR REPLACE FUNCTION public.read_internal_dispatch(p_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(public.fulgor_role(),'') NOT IN ('admin','operador','consulta') THEN RAISE EXCEPTION 'No autorizado';END IF;
 RETURN public.internal_dispatch_snapshot(p_id,true);
END $$;
CREATE OR REPLACE FUNCTION public.list_internal_dispatches(p_page integer DEFAULT 1,p_pending boolean DEFAULT false,p_search text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb;total bigint;pending bigint;query text:=trim(coalesce(p_search,''));
BEGIN
 IF coalesce(public.fulgor_role(),'') NOT IN ('admin','operador','consulta') THEN RAISE EXCEPTION 'No autorizado';END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>1000000 OR p_pending IS NULL OR length(query)>180 THEN RAISE EXCEPTION 'Revise los filtros de las salidas internas';END IF;
 SELECT count(*) INTO pending FROM public.inventario_salidas_internas h WHERE EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas l WHERE l.salida_id=h.id AND l.devuelta<l.cantidad);
 SELECT count(*) INTO total FROM public.inventario_salidas_internas h WHERE (NOT p_pending OR EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas l WHERE l.salida_id=h.id AND l.devuelta<l.cantidad))
  AND (query='' OR h.codigo ILIKE '%'||query||'%' OR h.recibido_por ILIKE '%'||query||'%' OR h.entregado_por ILIKE '%'||query||'%' OR EXISTS(SELECT 1 FROM jsonb_array_elements(h.items) item WHERE item->>'nombre' ILIKE '%'||query||'%' OR item->>'codigo' ILIKE '%'||query||'%'));
 SELECT coalesce(jsonb_agg(public.internal_dispatch_snapshot(h.id,false) ORDER BY h.created_at DESC,h.id DESC),'[]'::jsonb) INTO rows FROM (
  SELECT h.* FROM public.inventario_salidas_internas h WHERE (NOT p_pending OR EXISTS(SELECT 1 FROM public.inventario_prestamo_lineas l WHERE l.salida_id=h.id AND l.devuelta<l.cantidad))
   AND (query='' OR h.codigo ILIKE '%'||query||'%' OR h.recibido_por ILIKE '%'||query||'%' OR h.entregado_por ILIKE '%'||query||'%' OR EXISTS(SELECT 1 FROM jsonb_array_elements(h.items) item WHERE item->>'nombre' ILIKE '%'||query||'%' OR item->>'codigo' ILIKE '%'||query||'%'))
  ORDER BY h.created_at DESC,h.id DESC LIMIT 20 OFFSET (p_page-1)*20
 ) h;
 RETURN jsonb_build_object('rows',rows,'total',total,'pending',pending);
END $$;
REVOKE ALL ON FUNCTION public.guard_borrowed_inventory(),public.internal_actor_profile(),public.internal_request_previous(uuid,text,jsonb),public.internal_dispatch_snapshot(uuid,boolean),public.inventory_condition_is_damaged(text),public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_internal_staff(uuid,uuid,text,text,boolean,integer),public.create_internal_dispatch(uuid,uuid,jsonb),public.return_internal_dispatch(uuid,uuid,jsonb),public.read_internal_dispatch(uuid),public.list_internal_dispatches(integer,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_internal_staff(uuid,uuid,text,text,boolean,integer),public.create_internal_dispatch(uuid,uuid,jsonb),public.return_internal_dispatch(uuid,uuid,jsonb),public.read_internal_dispatch(uuid),public.list_internal_dispatches(integer,boolean,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

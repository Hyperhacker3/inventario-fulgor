-- Apply after a verified backup. Existing data is retained.
BEGIN;

ALTER TABLE public.almacenes ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.almacenes ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Operativo';
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'ACTIVO';
ALTER TABLE public.elementos ALTER COLUMN cantidad TYPE numeric(14,3);
ALTER TABLE public.elementos ALTER COLUMN stock_minimo TYPE numeric(14,3);
ALTER TABLE public.elementos ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'BUENO';
ALTER TABLE public.elementos ADD COLUMN IF NOT EXISTS cantidad_danados numeric(14,3) NOT NULL DEFAULT 0;
ALTER TABLE public.elementos ALTER COLUMN cantidad_danados TYPE numeric(14,3);
ALTER TABLE public.elementos ADD COLUMN IF NOT EXISTS stock_pendiente boolean NOT NULL DEFAULT false;
ALTER TABLE public.elementos ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS request_payload jsonb;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS actor_id uuid;
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS request_payload jsonb;
ALTER TABLE public.historial ALTER COLUMN cantidad TYPE numeric(14,3);
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS stock_anterior numeric(14,3);
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS stock_nuevo numeric(14,3);
ALTER TABLE public.historial ALTER COLUMN stock_anterior TYPE numeric(14,3);
ALTER TABLE public.historial ALTER COLUMN stock_nuevo TYPE numeric(14,3);
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS proyecto_id text;
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS proyecto_nombre text;
ALTER TABLE public.historial ADD COLUMN IF NOT EXISTS actor_id uuid;
UPDATE public.historial AS history
  SET proyecto_id = remission.proyecto_id, proyecto_nombre = remission.proyecto_nombre
  FROM public.remisiones AS remission
  WHERE history.remision_id = remission.id AND history.proyecto_nombre IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'elementos_stock_valid') THEN
    ALTER TABLE public.elementos ADD CONSTRAINT elementos_stock_valid
      CHECK (cantidad >= 0 AND stock_minimo >= 0 AND cantidad_danados >= 0 AND cantidad_danados <= cantidad) NOT VALID;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS remisiones_request_id_key ON public.remisiones(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS historial_request_id_key ON public.historial(request_id);
CREATE INDEX IF NOT EXISTS elementos_almacen_id_idx ON public.elementos(almacen_id) WHERE archived = false;
CREATE INDEX IF NOT EXISTS elementos_categoria_idx ON public.elementos(categoria) WHERE archived = false;
CREATE INDEX IF NOT EXISTS estanterias_almacen_id_idx ON public.estanterias(almacen_id);
CREATE INDEX IF NOT EXISTS cajas_estanteria_id_idx ON public.cajas(estanteria_id);
CREATE INDEX IF NOT EXISTS historial_elemento_fecha_idx ON public.historial(elemento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS historial_fecha_idx ON public.historial(created_at DESC);
CREATE INDEX IF NOT EXISTS remisiones_fecha_idx ON public.remisiones(created_at DESC);

DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;

-- Public policies in previously deployed copies are removed before any new grants.
DROP POLICY IF EXISTS "Permitir acceso publico almacenes" ON public.almacenes;
DROP POLICY IF EXISTS "Permitir acceso publico estanterias" ON public.estanterias;
DROP POLICY IF EXISTS "Permitir acceso publico cajas" ON public.cajas;
DROP POLICY IF EXISTS "Permitir acceso publico proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Permitir acceso publico elementos" ON public.elementos;
DROP POLICY IF EXISTS "Permitir acceso publico remisiones" ON public.remisiones;
DROP POLICY IF EXISTS "Permitir acceso publico historial" ON public.historial;

-- An unknown permissive policy could bypass the new role policies. Stop for review.
DO $$
DECLARE unexpected text;
BEGIN
  SELECT string_agg(tablename || '.' || policyname, ', ' ORDER BY tablename, policyname)
    INTO unexpected FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(ARRAY['almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial'])
      AND policyname NOT IN ('fulgor_read','fulgor_admin_insert','fulgor_admin_update','fulgor_admin_delete');
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Revise políticas RLS no reconocidas antes de migrar: %', unexpected;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fulgor_role() RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL
    ELSE auth.jwt() -> 'app_metadata' ->> 'role' END;
$$;
CREATE OR REPLACE FUNCTION public.fulgor_can_operate() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.fulgor_role() IN ('admin', 'operador');
$$;
CREATE OR REPLACE FUNCTION public.fulgor_is_admin() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.fulgor_role() = 'admin';
$$;
REVOKE ALL ON FUNCTION public.fulgor_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulgor_can_operate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulgor_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulgor_role(), public.fulgor_can_operate(), public.fulgor_is_admin() TO authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS fulgor_read ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS fulgor_admin_insert ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS fulgor_admin_update ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS fulgor_admin_delete ON public.%I', table_name);
    EXECUTE format('CREATE POLICY fulgor_read ON public.%I FOR SELECT TO authenticated USING (public.fulgor_role() IN (''admin'', ''operador'', ''consulta''))', table_name);
    IF table_name NOT IN ('historial', 'remisiones', 'elementos') THEN
      EXECUTE format('CREATE POLICY fulgor_admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.fulgor_is_admin())', table_name);
      EXECUTE format('CREATE POLICY fulgor_admin_update ON public.%I FOR UPDATE TO authenticated USING (public.fulgor_is_admin()) WITH CHECK (public.fulgor_is_admin())', table_name);
    END IF;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', table_name);
    IF table_name NOT IN ('historial', 'remisiones', 'elementos') THEN
      EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO authenticated', table_name);
    END IF;
  END LOOP;
END $$;

-- Item creation and quantity changes must use the audited SQL functions.
REVOKE INSERT, UPDATE ON public.elementos FROM authenticated;
CREATE POLICY fulgor_admin_update ON public.elementos FOR UPDATE TO authenticated
  USING (public.fulgor_is_admin()) WITH CHECK (public.fulgor_is_admin());
GRANT UPDATE (nombre, descripcion, stock_minimo, foto_url, estado,
  cantidad_danados, especificaciones, updated_at, archived) ON public.elementos TO authenticated;

CREATE TABLE IF NOT EXISTS public.remision_consecutivos (
  anio integer PRIMARY KEY,
  ultimo bigint NOT NULL CHECK (ultimo >= 0)
);
INSERT INTO public.remision_consecutivos(anio, ultimo)
SELECT substring(numero_remision from '^REM-([0-9]{4})-')::integer,
       max(substring(numero_remision from '^REM-[0-9]{4}-([0-9]+)$')::bigint)
FROM public.remisiones
WHERE numero_remision ~ '^REM-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT (anio) DO UPDATE SET ultimo = greatest(public.remision_consecutivos.ultimo, excluded.ultimo);
ALTER TABLE public.remision_consecutivos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.remision_consecutivos FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_inventory_item(p_item jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.elementos%ROWTYPE; v_amount numeric; v_minimum numeric; v_damaged numeric;
BEGIN
  IF NOT public.fulgor_is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_item IS NULL OR jsonb_typeof(p_item) <> 'object' THEN RAISE EXCEPTION 'Componente inválido'; END IF;
  v_amount := (p_item ->> 'cantidad')::numeric;
  v_minimum := (p_item ->> 'stock_minimo')::numeric;
  v_damaged := coalesce((p_item ->> 'cantidad_danados')::numeric, 0);
  IF v_amount IS NULL OR v_amount < 0 OR round(v_amount, 3) <> v_amount OR
     v_minimum IS NULL OR v_minimum < 0 OR round(v_minimum, 3) <> v_minimum OR
     v_damaged < 0 OR v_damaged > v_amount OR round(v_damaged, 3) <> v_damaged THEN
    RAISE EXCEPTION 'Cantidad inválida';
  END IF;
  IF upper(trim(coalesce(p_item ->> 'codigo', ''))) !~ '^[A-Z0-9-]{3,30}$' OR
     nullif(trim(p_item ->> 'nombre'), '') IS NULL OR
     coalesce(p_item ->> 'categoria', '') NOT IN ('PANELES','INVERSORES','ESTRUCTURAS','CABLES','CONECTORES',
       'PROTECCIONES','BATERIAS','CONTROLADORES','ACCESORIOS','HERRAMIENTAS','SEGURIDAD_EPP','OTROS') OR
     nullif(trim(p_item ->> 'unidad'), '') IS NULL THEN RAISE EXCEPTION 'Datos de artículo incompletos'; END IF;
  IF (p_item ->> 'estanteria_id') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estanterias WHERE id = p_item ->> 'estanteria_id'
      AND almacen_id = p_item ->> 'almacen_id') THEN RAISE EXCEPTION 'Estantería fuera del almacén'; END IF;
  IF (p_item ->> 'caja_id') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cajas WHERE id = p_item ->> 'caja_id'
      AND estanteria_id = p_item ->> 'estanteria_id') THEN RAISE EXCEPTION 'Caja fuera de la estantería'; END IF;
  INSERT INTO public.elementos(id, codigo, nombre, descripcion, categoria, cantidad, stock_minimo, unidad,
    almacen_id, estanteria_id, caja_id, foto_url, estado, cantidad_danados, especificaciones)
  VALUES ('ELM-' || gen_random_uuid()::text, upper(trim(p_item ->> 'codigo')), trim(p_item ->> 'nombre'),
    p_item ->> 'descripcion', p_item ->> 'categoria', v_amount, v_minimum,
    upper(p_item ->> 'unidad'), p_item ->> 'almacen_id', p_item ->> 'estanteria_id', p_item ->> 'caja_id',
    p_item ->> 'foto_url', coalesce(p_item ->> 'estado', 'BUENO'),
    v_damaged, coalesce(p_item -> 'especificaciones', '{}'::jsonb))
  RETURNING * INTO v_row;
  IF v_amount > 0 THEN
    INSERT INTO public.historial(id, fecha, tipo, elemento_id, elemento_codigo, elemento_nombre, cantidad, unidad,
      responsable, motivo, stock_anterior, stock_nuevo, actor_id)
    VALUES ('MOV-' || gen_random_uuid()::text, to_char(now() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI'),
      'ENTRADA', v_row.id, v_row.codigo, v_row.nombre, v_amount, v_row.unidad,
      coalesce(auth.jwt() -> 'user_metadata' ->> 'name', auth.uid()::text),
      'Alta de componente', 0, v_amount, auth.uid());
  END IF;
  RETURN to_jsonb(v_row);
END $$;

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
    IF v_item.stock_pendiente OR v_item.cantidad - v_item.cantidad_danados < v_qty THEN
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

DROP FUNCTION IF EXISTS public.record_inventory_movement(uuid,text,text,integer,text);
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
  IF v_item.cantidad + v_delta < v_item.cantidad_danados THEN RAISE EXCEPTION 'El ajuste deja stock insuficiente'; END IF;
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

REVOKE ALL ON FUNCTION public.create_inventory_item(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_inventory_movement(uuid,text,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_inventory_item(jsonb),
  public.dispatch_inventory(uuid,text,text,text,text,text,text,jsonb),
  public.record_inventory_movement(uuid,text,text,numeric,text) TO authenticated;

COMMIT;

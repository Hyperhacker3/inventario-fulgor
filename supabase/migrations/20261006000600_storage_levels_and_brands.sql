-- Almacén > estantería > nivel > caja. Conserva las existencias y las ubicaciones actuales.
-- Las cajas anteriores quedan sin nivel hasta que se asigne uno al editarlas.
BEGIN;

CREATE TABLE IF NOT EXISTS public.niveles_estanteria (
  id text PRIMARY KEY,
  estanteria_id text NOT NULL REFERENCES public.estanterias(id) ON DELETE RESTRICT,
  codigo text NOT NULL CHECK (length(trim(codigo)) BETWEEN 1 AND 100 AND codigo = upper(trim(codigo))),
  nombre text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 100),
  descripcion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(estanteria_id,codigo)
);
ALTER TABLE public.niveles_estanteria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fulgor_read ON public.niveles_estanteria;
DROP POLICY IF EXISTS fulgor_admin_insert ON public.niveles_estanteria;
DROP POLICY IF EXISTS fulgor_admin_update ON public.niveles_estanteria;
CREATE POLICY fulgor_read ON public.niveles_estanteria FOR SELECT TO authenticated
  USING (public.fulgor_role() IN ('admin','operador','consulta'));
CREATE POLICY fulgor_admin_insert ON public.niveles_estanteria FOR INSERT TO authenticated WITH CHECK (public.fulgor_is_admin());
CREATE POLICY fulgor_admin_update ON public.niveles_estanteria FOR UPDATE TO authenticated
  USING (public.fulgor_is_admin()) WITH CHECK (public.fulgor_is_admin());
REVOKE ALL ON public.niveles_estanteria FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.niveles_estanteria TO authenticated;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS nivel_id text REFERENCES public.niveles_estanteria(id) ON DELETE RESTRICT;
ALTER TABLE public.elementos ADD COLUMN IF NOT EXISTS nivel_id text REFERENCES public.niveles_estanteria(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS cajas_nivel_id_idx ON public.cajas(nivel_id);
CREATE INDEX IF NOT EXISTS elementos_nivel_id_idx ON public.elementos(nivel_id) WHERE archived=false;
GRANT UPDATE(nivel_id) ON public.elementos TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_storage_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rack text;
BEGIN
  IF TG_OP='UPDATE' AND OLD.estanteria_id IS DISTINCT FROM NEW.estanteria_id THEN
    RAISE EXCEPTION 'La estantería de esta ubicación no puede cambiarse';
  END IF;
  IF TG_TABLE_NAME='cajas' THEN
    IF NEW.nivel_id IS NULL THEN
      IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Seleccione un nivel de estantería para crear la caja'; END IF;
      IF OLD.nivel_id IS NOT NULL THEN RAISE EXCEPTION 'Seleccione un nivel para la caja'; END IF;
    ELSE
      SELECT estanteria_id INTO v_rack FROM public.niveles_estanteria WHERE id=NEW.nivel_id FOR SHARE;
      IF NOT FOUND OR v_rack IS DISTINCT FROM NEW.estanteria_id THEN RAISE EXCEPTION 'El nivel no pertenece a la estantería de la caja'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_storage_parent ON public.niveles_estanteria;
CREATE TRIGGER validate_storage_parent BEFORE UPDATE OF estanteria_id ON public.niveles_estanteria
  FOR EACH ROW EXECUTE FUNCTION public.validate_storage_parent();
DROP TRIGGER IF EXISTS validate_storage_parent ON public.cajas;
CREATE TRIGGER validate_storage_parent BEFORE INSERT OR UPDATE OF estanteria_id,nivel_id ON public.cajas
  FOR EACH ROW EXECUTE FUNCTION public.validate_storage_parent();

CREATE OR REPLACE FUNCTION public.validate_inventory_location_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_parent text; v_level text;
BEGIN
  -- Assigning a level to a physical box also relocates its archived contents.
  IF TG_OP='UPDATE' AND (OLD.archived OR NEW.archived) AND pg_trigger_depth()=1
    AND (OLD.almacen_id IS DISTINCT FROM NEW.almacen_id OR OLD.estanteria_id IS DISTINCT FROM NEW.estanteria_id
      OR OLD.nivel_id IS DISTINCT FROM NEW.nivel_id OR OLD.caja_id IS DISTINCT FROM NEW.caja_id) THEN
    RAISE EXCEPTION 'No se puede reubicar un elemento archivado';
  END IF;
  IF NEW.almacen_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.almacenes WHERE id=NEW.almacen_id) THEN
    RAISE EXCEPTION 'Almacén no encontrado';
  END IF;
  IF NEW.estanteria_id IS NOT NULL THEN
    SELECT almacen_id INTO v_parent FROM public.estanterias WHERE id=NEW.estanteria_id FOR SHARE;
    IF NOT FOUND OR v_parent IS DISTINCT FROM NEW.almacen_id THEN RAISE EXCEPTION 'La estantería no pertenece al almacén'; END IF;
  END IF;
  IF NEW.nivel_id IS NOT NULL THEN
    SELECT estanteria_id INTO v_parent FROM public.niveles_estanteria WHERE id=NEW.nivel_id FOR SHARE;
    IF NOT FOUND OR v_parent IS DISTINCT FROM NEW.estanteria_id THEN RAISE EXCEPTION 'El nivel no pertenece a la estantería'; END IF;
  END IF;
  IF NEW.caja_id IS NOT NULL THEN
    SELECT estanteria_id,nivel_id INTO v_parent,v_level FROM public.cajas WHERE id=NEW.caja_id FOR SHARE;
    IF NOT FOUND OR v_parent IS DISTINCT FROM NEW.estanteria_id OR v_level IS DISTINCT FROM NEW.nivel_id THEN
      RAISE EXCEPTION 'La caja no pertenece al nivel de la estantería';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_inventory_location_change ON public.elementos;
CREATE TRIGGER validate_inventory_location_change BEFORE INSERT OR UPDATE OF almacen_id,estanteria_id,nivel_id,caja_id ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_location_change();

CREATE OR REPLACE FUNCTION public.record_inventory_location_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_origin text; v_destination text;
BEGIN
  SELECT coalesce(nullif(concat_ws(' > ',
    (SELECT nombre FROM public.almacenes WHERE id=OLD.almacen_id),
    (SELECT nombre FROM public.estanterias WHERE id=OLD.estanteria_id),
    (SELECT 'Nivel ' || nombre FROM public.niveles_estanteria WHERE id=OLD.nivel_id),
    (SELECT codigo FROM public.cajas WHERE id=OLD.caja_id)),''),'Sin ubicación asignada') INTO v_origin;
  SELECT coalesce(nullif(concat_ws(' > ',
    (SELECT nombre FROM public.almacenes WHERE id=NEW.almacen_id),
    (SELECT nombre FROM public.estanterias WHERE id=NEW.estanteria_id),
    (SELECT 'Nivel ' || nombre FROM public.niveles_estanteria WHERE id=NEW.nivel_id),
    (SELECT codigo FROM public.cajas WHERE id=NEW.caja_id)),''),'Sin ubicación asignada') INTO v_destination;
  INSERT INTO public.historial(id,fecha,tipo,elemento_id,elemento_codigo,elemento_nombre,cantidad,unidad,
    origen_ubicacion,destino_ubicacion,responsable,motivo,stock_anterior,stock_nuevo,actor_id)
  VALUES('HIST-' || gen_random_uuid()::text,now()::text,'REUBICACION',NEW.id,NEW.codigo,NEW.nombre,0,NEW.unidad,
    v_origin,v_destination,coalesce(nullif(auth.jwt()->'user_metadata'->>'name',''),auth.uid()::text,'Administración'),
    'Cambio de ubicación: ' || v_origin || ' → ' || v_destination,NEW.cantidad,NEW.cantidad,auth.uid());
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS record_inventory_location_change ON public.elementos;
CREATE TRIGGER record_inventory_location_change AFTER UPDATE OF almacen_id,estanteria_id,nivel_id,caja_id ON public.elementos
  FOR EACH ROW WHEN (OLD.almacen_id IS DISTINCT FROM NEW.almacen_id OR OLD.estanteria_id IS DISTINCT FROM NEW.estanteria_id
    OR OLD.nivel_id IS DISTINCT FROM NEW.nivel_id OR OLD.caja_id IS DISTINCT FROM NEW.caja_id)
  EXECUTE FUNCTION public.record_inventory_location_change();

CREATE OR REPLACE FUNCTION public.relocate_box_level_contents() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.elementos SET nivel_id=NEW.nivel_id,updated_at=now() WHERE caja_id=NEW.id AND nivel_id IS DISTINCT FROM NEW.nivel_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS relocate_box_level_contents ON public.cajas;
CREATE TRIGGER relocate_box_level_contents AFTER UPDATE OF nivel_id ON public.cajas
  FOR EACH ROW WHEN (OLD.nivel_id IS DISTINCT FROM NEW.nivel_id) EXECUTE FUNCTION public.relocate_box_level_contents();

CREATE OR REPLACE FUNCTION public.create_inventory_item(p_item jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.elementos%ROWTYPE; v_amount numeric; v_minimum numeric; v_damaged numeric;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_item IS NULL OR jsonb_typeof(p_item) <> 'object' THEN RAISE EXCEPTION 'Componente inválido'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
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
     NOT EXISTS (SELECT 1 FROM public.inventario_categorias WHERE id=p_item ->> 'categoria' AND activo) OR
     nullif(trim(p_item ->> 'unidad'), '') IS NULL THEN RAISE EXCEPTION 'Datos de artículo incompletos'; END IF;
  IF (p_item ->> 'estanteria_id') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estanterias WHERE id = p_item ->> 'estanteria_id'
      AND almacen_id = p_item ->> 'almacen_id') THEN RAISE EXCEPTION 'Estantería fuera del almacén'; END IF;
  IF (p_item ->> 'caja_id') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cajas WHERE id = p_item ->> 'caja_id'
      AND estanteria_id = p_item ->> 'estanteria_id') THEN RAISE EXCEPTION 'Caja fuera de la estantería'; END IF;
  INSERT INTO public.elementos(id, codigo, nombre, descripcion, categoria, cantidad, stock_minimo, unidad,
    almacen_id, estanteria_id, nivel_id, caja_id, foto_url, estado, cantidad_danados, especificaciones)
  VALUES ('ELM-' || gen_random_uuid()::text, upper(trim(p_item ->> 'codigo')), trim(p_item ->> 'nombre'),
    p_item ->> 'descripcion', p_item ->> 'categoria', v_amount, v_minimum,
    upper(p_item ->> 'unidad'), p_item ->> 'almacen_id', p_item ->> 'estanteria_id', p_item ->> 'nivel_id', p_item ->> 'caja_id',
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

-- La marca se guarda junto a los demás datos propios del producto, sin inventar valores.
CREATE OR REPLACE FUNCTION public.validate_inventory_brand() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.especificaciones ? 'marca' AND NEW.especificaciones->'marca'<>'null'::jsonb
    AND (jsonb_typeof(NEW.especificaciones->'marca')<>'string' OR length(trim(NEW.especificaciones->>'marca'))>100) THEN
    RAISE EXCEPTION 'La marca debe ser texto de hasta 100 caracteres';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_inventory_brand ON public.elementos;
CREATE TRIGGER validate_inventory_brand BEFORE INSERT OR UPDATE OF especificaciones ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_brand();

CREATE OR REPLACE FUNCTION public.snapshot_inventory_line_brand() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_line jsonb; v_old jsonb; v_brand text; v_lines jsonb := '[]'::jsonb;
BEGIN
  FOR v_line IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
    IF TG_OP='INSERT' THEN
      SELECT coalesce(especificaciones->>'marca','') INTO v_brand FROM public.elementos WHERE id=v_line->>'elementoId' FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Componente no encontrado para registrar la marca'; END IF;
    ELSE
      SELECT value INTO v_old FROM jsonb_array_elements(OLD.items) WHERE value->>'elementoId'=v_line->>'elementoId';
      v_brand := coalesce(v_old->>'marca','');
    END IF;
    v_lines := v_lines || jsonb_build_array(v_line || jsonb_build_object('marca',v_brand));
  END LOOP;
  NEW.items := v_lines;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS snapshot_inventory_line_brand ON public.remisiones;
CREATE TRIGGER snapshot_inventory_line_brand BEFORE INSERT OR UPDATE OF items ON public.remisiones
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_inventory_line_brand();

REVOKE ALL ON FUNCTION public.validate_storage_parent(),public.validate_inventory_location_change(),
  public.record_inventory_location_change(),public.relocate_box_level_contents(),public.validate_inventory_brand(),
  public.snapshot_inventory_line_brand() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='niveles_estanteria') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.niveles_estanteria;
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;

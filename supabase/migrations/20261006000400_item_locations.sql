-- Ejecutar después de las migraciones anteriores. Conserva los productos y sus existencias.
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_inventory_location_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.archived OR NEW.archived THEN RAISE EXCEPTION 'No se puede reubicar un elemento archivado'; END IF;
  IF NEW.almacen_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.almacenes WHERE id = NEW.almacen_id
  ) THEN RAISE EXCEPTION 'Almacén no encontrado'; END IF;
  IF NEW.estanteria_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estanterias WHERE id = NEW.estanteria_id AND almacen_id = NEW.almacen_id
  ) THEN RAISE EXCEPTION 'La estantería no pertenece al almacén'; END IF;
  IF NEW.caja_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cajas WHERE id = NEW.caja_id AND estanteria_id = NEW.estanteria_id
  ) THEN RAISE EXCEPTION 'La caja no pertenece a la estantería'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.record_inventory_location_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_origin text; v_destination text;
BEGIN
  SELECT coalesce(nullif(concat_ws(' > ',
    (SELECT nombre FROM public.almacenes WHERE id = OLD.almacen_id),
    (SELECT nombre FROM public.estanterias WHERE id = OLD.estanteria_id),
    (SELECT codigo FROM public.cajas WHERE id = OLD.caja_id)), ''), 'Sin ubicación asignada') INTO v_origin;
  SELECT coalesce(nullif(concat_ws(' > ',
    (SELECT nombre FROM public.almacenes WHERE id = NEW.almacen_id),
    (SELECT nombre FROM public.estanterias WHERE id = NEW.estanteria_id),
    (SELECT codigo FROM public.cajas WHERE id = NEW.caja_id)), ''), 'Sin ubicación asignada') INTO v_destination;
  INSERT INTO public.historial (id, fecha, tipo, elemento_id, elemento_codigo, elemento_nombre,
    cantidad, unidad, origen_ubicacion, destino_ubicacion, responsable, motivo, stock_anterior, stock_nuevo, actor_id)
  VALUES ('HIST-' || gen_random_uuid()::text, now()::text, 'REUBICACION', NEW.id, NEW.codigo, NEW.nombre,
    0, NEW.unidad, v_origin, v_destination,
    coalesce(nullif(auth.jwt()->'user_metadata'->>'name', ''), auth.uid()::text, 'Administración'),
    'Cambio de ubicación: ' || v_origin || ' → ' || v_destination, NEW.cantidad, NEW.cantidad, auth.uid());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_inventory_location_change ON public.elementos;
CREATE TRIGGER validate_inventory_location_change
  BEFORE UPDATE OF almacen_id, estanteria_id, caja_id ON public.elementos
  FOR EACH ROW WHEN (OLD.almacen_id IS DISTINCT FROM NEW.almacen_id
    OR OLD.estanteria_id IS DISTINCT FROM NEW.estanteria_id OR OLD.caja_id IS DISTINCT FROM NEW.caja_id)
  EXECUTE FUNCTION public.validate_inventory_location_change();

DROP TRIGGER IF EXISTS record_inventory_location_change ON public.elementos;
CREATE TRIGGER record_inventory_location_change
  AFTER UPDATE OF almacen_id, estanteria_id, caja_id ON public.elementos
  FOR EACH ROW WHEN (OLD.almacen_id IS DISTINCT FROM NEW.almacen_id
    OR OLD.estanteria_id IS DISTINCT FROM NEW.estanteria_id OR OLD.caja_id IS DISTINCT FROM NEW.caja_id)
  EXECUTE FUNCTION public.record_inventory_location_change();

-- La política RLS existente limita estas actualizaciones a administradores.
GRANT UPDATE (almacen_id, estanteria_id, caja_id) ON public.elementos TO authenticated;
REVOKE ALL ON FUNCTION public.validate_inventory_location_change(), public.record_inventory_location_change() FROM PUBLIC, anon, authenticated;
COMMIT;

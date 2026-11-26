-- Cambio de categoría desde la edición individual de productos (solo administración).
-- Ejecutar completo en Supabase. La política RLS existente limita la edición a admin.
-- Conserva stock, precios, pesos, fotos, código, historial y documentos guardados.
BEGIN;

GRANT UPDATE (categoria) ON public.elementos TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_edited_item_category() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.categoria IS DISTINCT FROM OLD.categoria THEN
    IF OLD.archived OR NEW.archived THEN
      RAISE EXCEPTION 'No se puede cambiar la categoría de un elemento archivado';
    END IF;
    IF NEW.categoria IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.inventario_categorias WHERE id = NEW.categoria AND activo
    ) THEN
      RAISE EXCEPTION 'Seleccione una categoría activa';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_edited_item_category ON public.elementos;
CREATE TRIGGER validate_edited_item_category BEFORE UPDATE OF categoria ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.validate_edited_item_category();

CREATE OR REPLACE FUNCTION public.inventory_item_category_edit_ready() RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN has_column_privilege(current_user,'public.elementos','categoria','UPDATE');
END $$;

REVOKE ALL ON FUNCTION public.validate_edited_item_category(),public.inventory_item_category_edit_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_item_category_edit_ready() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

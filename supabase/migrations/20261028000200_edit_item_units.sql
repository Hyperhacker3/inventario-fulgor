-- Corrección de unidad de medida desde edición, sin convertir cantidades.
-- Ejecutar completo en Supabase. La política RLS existente limita la edición a admin.
BEGIN;

GRANT UPDATE (unidad) ON public.elementos TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_edited_item_unit() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.unidad IS DISTINCT FROM OLD.unidad THEN
    NEW.unidad := upper(trim(NEW.unidad));
    IF NEW.unidad IS NULL OR length(NEW.unidad) NOT BETWEEN 1 AND 40 THEN
      RAISE EXCEPTION 'Unidad de medida inválida';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_edited_item_unit ON public.elementos;
CREATE TRIGGER validate_edited_item_unit BEFORE UPDATE OF unidad ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.validate_edited_item_unit();

CREATE OR REPLACE FUNCTION public.inventory_item_unit_edit_ready() RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN has_column_privilege(current_user,'public.elementos','unidad','UPDATE');
END $$;

REVOKE ALL ON FUNCTION public.validate_edited_item_unit(),public.inventory_item_unit_edit_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_item_unit_edit_ready() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

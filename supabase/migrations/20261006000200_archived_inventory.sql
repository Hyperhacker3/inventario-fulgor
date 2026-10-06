-- Ejecutar después de la migración de administración de datos y de fotos privadas.
-- No elimina productos al ejecutarse. Habilita la eliminación individual de archivados.
BEGIN;

-- Missing role metadata must deny operations, rather than returning SQL NULL.
CREATE OR REPLACE FUNCTION public.fulgor_can_operate() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.fulgor_role() IN ('admin', 'operador'), false);
$$;
CREATE OR REPLACE FUNCTION public.fulgor_is_admin() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.fulgor_role() = 'admin', false);
$$;

CREATE TABLE IF NOT EXISTS public.inventario_eliminaciones (
  id text PRIMARY KEY, codigo text NOT NULL, nombre text NOT NULL,
  actor_id uuid NOT NULL, eliminado_at timestamptz NOT NULL DEFAULT now(),
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fotos) = 'array'),
  limpieza_completa boolean NOT NULL DEFAULT false
);
ALTER TABLE public.inventario_eliminaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_eliminaciones FROM anon, authenticated;

-- Mantiene la solicitud original para impedir que un reintento recree un producto eliminado.
ALTER TABLE public.inventario_altas ALTER COLUMN elemento_id DROP NOT NULL;
ALTER TABLE public.inventario_altas DROP CONSTRAINT IF EXISTS inventario_altas_elemento_id_fkey;
ALTER TABLE public.inventario_altas ADD CONSTRAINT inventario_altas_elemento_id_fkey
  FOREIGN KEY (elemento_id) REFERENCES public.elementos(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.guard_inventory_deletion() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT OLD.archived THEN RAISE EXCEPTION 'Solo se pueden eliminar elementos archivados'; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS guard_inventory_deletion ON public.elementos;
CREATE TRIGGER guard_inventory_deletion BEFORE DELETE ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_deletion();
REVOKE ALL ON FUNCTION public.guard_inventory_deletion() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_deleted_inventory_photos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- A cleanup job owns these files. A later product cannot reuse a photo being deleted.
  IF EXISTS (SELECT 1 FROM public.inventario_eliminaciones d WHERE d.id=NEW.id OR d.codigo=NEW.codigo) THEN
    RAISE EXCEPTION 'Este código ya pertenecía a un producto eliminado. Asigne un código nuevo';
  END IF;
  IF EXISTS (SELECT 1 FROM public.inventario_eliminaciones d,
      LATERAL jsonb_array_elements_text(d.fotos) photo
      WHERE photo = NEW.foto_url OR coalesce(NEW.especificaciones->'fotos_adicionales','[]'::jsonb) @> jsonb_build_array(photo)) THEN
    RAISE EXCEPTION 'Esta foto pertenece a un producto eliminado. Suba una nueva copia';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_deleted_inventory_photos ON public.elementos;
CREATE TRIGGER guard_deleted_inventory_photos BEFORE INSERT OR UPDATE OF foto_url, especificaciones ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.guard_deleted_inventory_photos();
REVOKE ALL ON FUNCTION public.guard_deleted_inventory_photos() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lock_inventory_photo_updates() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Acquire before row locks so an edit and a deletion cannot deadlock or reuse the same file.
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS lock_inventory_photo_updates ON public.elementos;
CREATE TRIGGER lock_inventory_photo_updates BEFORE INSERT OR UPDATE OF foto_url, especificaciones ON public.elementos
  FOR EACH STATEMENT EXECUTE FUNCTION public.lock_inventory_photo_updates();
REVOKE ALL ON FUNCTION public.lock_inventory_photo_updates() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_archived_inventory_item(p_elemento_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_item public.elementos%ROWTYPE; v_job public.inventario_eliminaciones%ROWTYPE; v_photos jsonb;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  SELECT * INTO v_job FROM public.inventario_eliminaciones WHERE id=p_elemento_id;
  IF FOUND THEN RETURN to_jsonb(v_job); END IF;
  SELECT * INTO v_item FROM public.elementos WHERE id=p_elemento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Elemento no encontrado'; END IF;
  IF NOT v_item.archived THEN RAISE EXCEPTION 'Solo se pueden eliminar elementos archivados'; END IF;
  SELECT coalesce(jsonb_agg(DISTINCT photo), '[]'::jsonb) INTO v_photos
    FROM jsonb_array_elements_text(jsonb_build_array(v_item.foto_url) ||
      CASE WHEN jsonb_typeof(v_item.especificaciones->'fotos_adicionales')='array'
        THEN v_item.especificaciones->'fotos_adicionales' ELSE '[]'::jsonb END) photo
    WHERE photo LIKE 'storage://%' AND NOT EXISTS (
      SELECT 1 FROM public.elementos e WHERE e.id <> v_item.id
        AND (e.foto_url = photo OR coalesce(e.especificaciones->'fotos_adicionales','[]'::jsonb) @> jsonb_build_array(photo)));
  INSERT INTO public.inventario_eliminaciones(id,codigo,nombre,actor_id,fotos,limpieza_completa)
    VALUES(v_item.id,v_item.codigo,v_item.nombre,auth.uid(),v_photos,jsonb_array_length(v_photos)=0)
    RETURNING * INTO v_job;
  -- Preserve the highest number even for older imported products that were never assigned by the RPC.
  IF v_item.codigo ~ '^[A-Z]{3}[0-9]{1,9}$' THEN
    UPDATE public.inventario_prefijos SET ultimo=greatest(ultimo,substring(v_item.codigo from 4)::bigint)
      WHERE prefijo=left(v_item.codigo,3);
  END IF;
  DELETE FROM public.elementos WHERE id=v_item.id;
  -- Historial and remission snapshots intentionally remain for traceability.
  RETURN to_jsonb(v_job);
END $$;

CREATE OR REPLACE FUNCTION public.inventory_image_cleanup_jobs() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY eliminado_at), '[]'::jsonb)
    FROM public.inventario_eliminaciones d WHERE NOT limpieza_completa);
END $$;

CREATE OR REPLACE FUNCTION public.complete_inventory_image_cleanup(p_elemento_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job public.inventario_eliminaciones%ROWTYPE;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_job FROM public.inventario_eliminaciones WHERE id=p_elemento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Limpieza no encontrada'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects o,
      LATERAL jsonb_array_elements_text(v_job.fotos) photo
      WHERE o.bucket_id='item-images' AND (o.name=substring(photo from 11)
        OR o.name=regexp_replace(substring(photo from 11),'/full\.jpg$','/thumb.jpg'))) THEN
    RAISE EXCEPTION 'Quedan fotos por retirar de Supabase Storage';
  END IF;
  UPDATE public.inventario_eliminaciones SET limpieza_completa=true WHERE id=p_elemento_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.delete_archived_inventory_item(text), public.inventory_image_cleanup_jobs(),
  public.complete_inventory_image_cleanup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_archived_inventory_item(text), public.inventory_image_cleanup_jobs(),
  public.complete_inventory_image_cleanup(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_inventory_item_auto(p_prefix_id text,p_request_id uuid,p_item jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_prefix public.inventario_prefijos%ROWTYPE; v_previous public.inventario_altas%ROWTYPE;
  v_last bigint; v_code text; v_row jsonb; v_payload jsonb;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR p_item IS NULL OR jsonb_typeof(p_item) <> 'object' THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
  v_payload := jsonb_build_object('prefijo_id',p_prefix_id,'item',p_item - 'codigo');
  PERFORM pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
  SELECT * INTO v_previous FROM public.inventario_altas WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.payload IS DISTINCT FROM v_payload THEN
      RAISE EXCEPTION 'La solicitud ya existe con otro contenido o usuario';
    END IF;
    SELECT to_jsonb(e) INTO v_row FROM public.elementos e WHERE id=v_previous.elemento_id;
    IF v_row IS NULL THEN RAISE EXCEPTION 'El producto de esta solicitud fue eliminado definitivamente'; END IF;
    RETURN v_row;
  END IF;
  SELECT * INTO v_prefix FROM public.inventario_prefijos WHERE id=p_prefix_id AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un prefijo activo'; END IF;
  -- Incluye archivados y códigos introducidos por clientes anteriores.
  SELECT greatest(v_prefix.ultimo,coalesce(max(substring(codigo from 4)::bigint),0))+1 INTO v_last
    FROM (SELECT codigo FROM public.elementos UNION ALL SELECT codigo FROM public.inventario_eliminaciones) codes
    WHERE codigo ~ ('^'||v_prefix.prefijo||'[0-9]{1,9}$');
  IF v_last > 999999999 THEN RAISE EXCEPTION 'El consecutivo ha alcanzado su límite'; END IF;
  v_code := v_prefix.prefijo || CASE WHEN v_last < 1000 THEN lpad(v_last::text,3,'0') ELSE v_last::text END;
  v_row := public.create_inventory_item((p_item - 'codigo') || jsonb_build_object('codigo',v_code));
  UPDATE public.inventario_prefijos SET ultimo=v_last WHERE id=v_prefix.id;
  INSERT INTO public.inventario_altas(request_id,actor_id,payload,elemento_id)
    VALUES(p_request_id,auth.uid(),v_payload,v_row->>'id');
  RETURN v_row;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;

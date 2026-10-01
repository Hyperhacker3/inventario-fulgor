-- Private item photos. Run after 20261001_secure_inventory.sql in Supabase.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('item-images', 'item-images', false, 8388608, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "item_images_read" ON storage.objects;
DROP POLICY IF EXISTS "item_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "item_images_delete" ON storage.objects;

CREATE POLICY "item_images_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'item-images' AND public.fulgor_role() IN ('admin', 'operador', 'consulta'));
CREATE POLICY "item_images_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-images' AND public.fulgor_is_admin()
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY "item_images_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'item-images' AND public.fulgor_is_admin());

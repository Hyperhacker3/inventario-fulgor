-- Registro fotográfico privado de salidas. No modifica stock ni documentos existentes.
-- Ejecutar después de 20261006000200_archived_inventory.sql.
BEGIN;
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS fotos_salida jsonb NOT NULL DEFAULT '[]'::jsonb;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.remisiones'::regclass AND conname='remisiones_fotos_salida_array') THEN
    ALTER TABLE public.remisiones ADD CONSTRAINT remisiones_fotos_salida_array CHECK (jsonb_typeof(fotos_salida)='array');
  END IF;
END $$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('outgoing-images','outgoing-images',false,8388608,ARRAY['image/jpeg'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.outgoing_photo_is_linked(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.remisiones WHERE fotos_salida @> jsonb_build_array('outgoing://'||p_path));
$$;
CREATE OR REPLACE FUNCTION public.outgoing_photo_can_delete(p_path text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.fulgor_can_operate(),false) OR split_part(p_path,'/',1) IS DISTINCT FROM auth.uid()::text THEN RETURN false; END IF;
  -- Serialize removal of staged files with the transaction attaching their evidence.
  PERFORM pg_advisory_xact_lock(hashtextextended(split_part(p_path,'/',2),0));
  RETURN NOT public.outgoing_photo_is_linked(p_path);
END $$;
REVOKE ALL ON FUNCTION public.outgoing_photo_is_linked(text),public.outgoing_photo_can_delete(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.outgoing_photo_is_linked(text),public.outgoing_photo_can_delete(text) TO authenticated;

DROP POLICY IF EXISTS outgoing_images_read ON storage.objects;
DROP POLICY IF EXISTS outgoing_images_insert ON storage.objects;
DROP POLICY IF EXISTS outgoing_images_delete ON storage.objects;
CREATE POLICY outgoing_images_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='outgoing-images' AND public.fulgor_role() IN ('admin','operador','consulta')
  AND (public.outgoing_photo_is_linked(name) OR (public.fulgor_can_operate() AND split_part(name,'/',1)=auth.uid()::text)));
CREATE POLICY outgoing_images_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='outgoing-images' AND public.fulgor_can_operate() AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');
CREATE POLICY outgoing_images_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='outgoing-images' AND public.outgoing_photo_can_delete(name));

CREATE OR REPLACE FUNCTION public.dispatch_inventory_with_photos(
  p_request_id uuid,p_proyecto_id text,p_entregado_por text,p_cargo_entregado text,
  p_recibido_por text,p_cargo_recibido text,p_observaciones text,p_items jsonb,p_datos_transporte jsonb,p_fotos jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_rem public.remisiones%ROWTYPE; v_result jsonb; v_photo jsonb; v_ref text; v_path text;
  v_refs jsonb := '[]'::jsonb; v_existing boolean;
BEGIN
  IF NOT coalesce(public.fulgor_can_operate(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
  IF p_fotos IS NULL OR jsonb_typeof(p_fotos)<>'array' THEN RAISE EXCEPTION 'Registro fotográfico inválido'; END IF;
  FOR v_photo IN SELECT value FROM jsonb_array_elements(p_fotos) LOOP
    IF jsonb_typeof(v_photo)<>'string' THEN RAISE EXCEPTION 'Referencia fotográfica inválida'; END IF;
    v_ref := v_photo #>> '{}';
    IF v_ref !~ ('^outgoing://'||auth.uid()::text||'/'||p_request_id::text||'/[0-9a-f-]{36}\.jpg$') THEN
      RAISE EXCEPTION 'La foto debe pertenecer a esta cuenta y salida';
    END IF;
    IF v_refs ? v_ref THEN RAISE EXCEPTION 'Fotografía duplicada'; END IF;
    v_refs := v_refs || jsonb_build_array(v_ref);
  END LOOP;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT * INTO v_rem FROM public.remisiones WHERE request_id=p_request_id;
  v_existing := FOUND;
  IF v_existing THEN
    IF v_rem.actor_id IS DISTINCT FROM auth.uid() OR v_rem.request_payload->'outgoing_photos' IS DISTINCT FROM v_refs THEN
      RAISE EXCEPTION 'La solicitud ya existe con otras fotos o usuario';
    END IF;
  ELSE
    -- Lock files before stock is deducted. Missing uploads leave stock unchanged.
    FOR v_ref IN SELECT value FROM jsonb_array_elements_text(v_refs) ORDER BY value LOOP
      v_path := substring(v_ref from 12);
      PERFORM 1 FROM storage.objects WHERE bucket_id='outgoing-images' AND name=v_path FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'La foto aún no está guardada en Supabase'; END IF;
    END LOOP;
  END IF;
  -- Existing transactional RPC validates stock, transport, quantities and full request identity.
  v_result := public.dispatch_inventory_with_unit_weights(p_request_id,p_proyecto_id,p_entregado_por,p_cargo_entregado,
    p_recibido_por,p_cargo_recibido,p_observaciones,p_items,p_datos_transporte);
  IF v_existing THEN RETURN v_result; END IF;
  UPDATE public.remisiones SET fotos_salida=v_refs,
    request_payload=request_payload||jsonb_build_object('outgoing_photos',v_refs)
    WHERE id=v_result->>'id' RETURNING * INTO v_rem;
  RETURN to_jsonb(v_rem);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_inventory_with_photos(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dispatch_inventory_with_photos(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.outgoing_photos_ready() RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT true; $$;
REVOKE ALL ON FUNCTION public.outgoing_photos_ready() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.outgoing_photos_ready() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

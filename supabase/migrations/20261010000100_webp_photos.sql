-- Aplicar después de las migraciones anteriores. No transforma fotografías ni inventario.
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM storage.buckets WHERE id IN ('item-images','outgoing-images')) <> 2 THEN
    RAISE EXCEPTION 'Aplique primero las migraciones de fotos privadas y fotos de salidas';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id IN ('item-images','outgoing-images') AND public) THEN
    RAISE EXCEPTION 'Los buckets de fotografías deben ser privados';
  END IF;
END $$;

-- Preserve existing formats, limits and privacy. NULL already allows every MIME type.
UPDATE storage.buckets SET allowed_mime_types = CASE WHEN allowed_mime_types IS NULL THEN NULL
  ELSE ARRAY(SELECT DISTINCT mime FROM unnest(allowed_mime_types || ARRAY['image/jpeg','image/webp']) mime ORDER BY mime) END
WHERE id IN ('item-images','outgoing-images');

-- Keep owner, role and request-folder checks while accepting both photo formats.
ALTER POLICY outgoing_images_insert ON storage.objects
WITH CHECK (bucket_id='outgoing-images' AND public.fulgor_can_operate() AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|webp)$');

-- CREATE OR REPLACE preserves the existing ACL: the route RPC remains the only public write entry.
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
    IF v_ref !~ ('^outgoing://'||auth.uid()::text||'/'||p_request_id::text||'/[0-9a-f-]{36}\.(jpg|webp)$') THEN
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
NOTIFY pgrst,'reload schema';
COMMIT;

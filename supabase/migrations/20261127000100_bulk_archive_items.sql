-- Archivado en grupo de productos activos desde Inventario (solo administración).
-- Todo o nada: si algún producto ya no está activo o tiene préstamos internos sin devolver
-- (validado por el disparador existente guard_borrowed_inventory), no se archiva ninguno.
-- Conserva existencias, historial, remisiones, informes y hojas de vida.
-- Reintentar con el mismo UUID devuelve los IDs confirmados sin fallar ni duplicar.
-- Ejecutar completo desde la cuenta del usuario.
BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_archivados_masivos (
  request_id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  ids text[] NOT NULL,
  item_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario_archivados_masivos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_archivados_masivos FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bulk_archive_inventory_items(p_request_id uuid, p_ids text[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_ids text[]; v_count integer; v_found integer;
  v_previous public.inventario_archivados_masivos;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(), false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR p_ids IS NULL THEN RAISE EXCEPTION 'Solicitud de archivado inválida'; END IF;
  SELECT coalesce(array_agg(id ORDER BY id COLLATE "C"), '{}') INTO v_ids
    FROM (SELECT DISTINCT trim(value) AS id FROM unnest(p_ids) AS t(value) WHERE nullif(trim(value), '') IS NOT NULL) s;
  v_count := cardinality(v_ids);
  IF v_count < 1 OR v_count > 5000 THEN RAISE EXCEPTION 'Seleccione entre 1 y 5000 productos'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 3120));
  SELECT * INTO v_previous FROM public.inventario_archivados_masivos WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.ids IS DISTINCT FROM v_ids THEN
      RAISE EXCEPTION 'La solicitud corresponde a otros datos';
    END IF;
    RETURN jsonb_build_object('archivedIds', to_jsonb(v_previous.ids), 'count', v_previous.item_count);
  END IF;

  PERFORM 1 FROM public.elementos WHERE id = ANY(v_ids) AND NOT archived ORDER BY id COLLATE "C" FOR UPDATE;
  GET DIAGNOSTICS v_found = ROW_COUNT;
  IF v_found <> v_count THEN
    RAISE EXCEPTION 'Algunos productos seleccionados ya no están disponibles. Actualice la lista y vuelva a intentar';
  END IF;

  -- El disparador guard_borrowed_inventory (si está activo) bloquea todo el grupo si algún producto tiene préstamos internos.
  UPDATE public.elementos SET archived = true, updated_at = now()
    WHERE id = ANY(v_ids) AND NOT archived;

  INSERT INTO public.inventario_archivados_masivos(request_id, actor_id, ids, item_count)
    VALUES (p_request_id, auth.uid(), v_ids, v_count);
  RETURN jsonb_build_object('archivedIds', to_jsonb(v_ids), 'count', v_count);
END $$;

REVOKE ALL ON FUNCTION public.bulk_archive_inventory_items(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_archive_inventory_items(uuid, text[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

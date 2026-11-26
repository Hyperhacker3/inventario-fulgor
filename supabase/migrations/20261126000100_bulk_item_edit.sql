-- Edición en grupo de productos activos desde Inventario (solo administración).
-- Cambia únicamente los datos compartidos elegidos: categoría, estado, marca, stock mínimo y ubicación.
-- Todo o nada: si un producto falla, no se aplica ningún cambio. No modifica cantidades, unidades,
-- precios, pesos, fotos, códigos ni documentos guardados. Los cambios de ubicación quedan en Historial
-- mediante el disparador existente de reubicación. Ejecutar completo desde la cuenta del usuario.
BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_ediciones_masivas (
  request_id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  payload jsonb NOT NULL,
  item_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario_ediciones_masivas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_ediciones_masivas FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bulk_update_inventory_items(p_request_id uuid, p_ids text[], p_changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_ids text[]; v_count integer; v_found integer; v_key text; v_payload jsonb;
  v_previous public.inventario_ediciones_masivas;
  v_category text; v_condition text; v_brand text; v_minimum numeric; v_location jsonb;
  v_warehouse text; v_rack text; v_level text; v_box text; v_result jsonb;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR p_ids IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Solicitud de edición inválida';
  END IF;
  SELECT coalesce(array_agg(id ORDER BY id COLLATE "C"), '{}') INTO v_ids
    FROM (SELECT DISTINCT trim(value) AS id FROM unnest(p_ids) AS t(value) WHERE nullif(trim(value),'') IS NOT NULL) s;
  v_count := cardinality(v_ids);
  IF v_count < 1 OR v_count > 5000 THEN RAISE EXCEPTION 'Seleccione entre 1 y 5000 productos'; END IF;
  IF p_changes = '{}'::jsonb THEN RAISE EXCEPTION 'Elija al menos un dato para cambiar'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_changes) LOOP
    IF v_key NOT IN ('categoria','estado','marca','stock_minimo','ubicacion') THEN
      RAISE EXCEPTION 'El dato % no se puede editar en grupo', v_key;
    END IF;
  END LOOP;

  v_payload := jsonb_build_object('ids', to_jsonb(v_ids), 'changes', p_changes);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 3110));
  SELECT * INTO v_previous FROM public.inventario_ediciones_masivas WHERE request_id = p_request_id;
  IF FOUND THEN
    -- Reintento de una edición ya confirmada: devuelve los productos actuales sin repetir cambios.
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.payload <> v_payload THEN
      RAISE EXCEPTION 'La solicitud corresponde a otros datos';
    END IF;
  ELSE
    IF p_changes ? 'categoria' THEN
      v_category := p_changes->>'categoria';
      IF jsonb_typeof(p_changes->'categoria') IS DISTINCT FROM 'string'
        OR NOT EXISTS (SELECT 1 FROM public.inventario_categorias WHERE id = v_category AND activo) THEN
        RAISE EXCEPTION 'Seleccione una categoría activa';
      END IF;
    END IF;
    IF p_changes ? 'estado' THEN
      v_condition := upper(trim(coalesce(p_changes->>'estado','')));
      IF jsonb_typeof(p_changes->'estado') IS DISTINCT FROM 'string'
        OR v_condition NOT IN ('BUENO','REGULAR','MALO','EN REPARACIÓN','PARA REPARAR','RETAZOS') THEN
        RAISE EXCEPTION 'Seleccione un estado válido';
      END IF;
    END IF;
    IF p_changes ? 'marca' THEN
      IF jsonb_typeof(p_changes->'marca') IS DISTINCT FROM 'string' OR length(trim(p_changes->>'marca')) > 100 THEN
        RAISE EXCEPTION 'La marca debe ser texto de hasta 100 caracteres';
      END IF;
      v_brand := upper(trim(p_changes->>'marca'));
    END IF;
    IF p_changes ? 'stock_minimo' THEN
      IF jsonb_typeof(p_changes->'stock_minimo') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Stock mínimo inválido'; END IF;
      v_minimum := (p_changes->>'stock_minimo')::numeric;
      IF v_minimum < 0 OR v_minimum > 99999999999.999 OR round(v_minimum,3) <> v_minimum THEN
        RAISE EXCEPTION 'El stock mínimo debe ser no negativo y tener hasta tres decimales';
      END IF;
    END IF;
    IF p_changes ? 'ubicacion' THEN
      v_location := p_changes->'ubicacion';
      IF jsonb_typeof(v_location) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Ubicación inválida'; END IF;
      v_warehouse := nullif(trim(v_location->>'almacen_id'),''); v_rack := nullif(trim(v_location->>'estanteria_id'),'');
      v_level := nullif(trim(v_location->>'nivel_id'),''); v_box := nullif(trim(v_location->>'caja_id'),'');
      IF v_warehouse IS NULL AND (v_rack IS NOT NULL OR v_level IS NOT NULL OR v_box IS NOT NULL) THEN
        RAISE EXCEPTION 'Seleccione el almacén de la ubicación';
      END IF;
      IF v_rack IS NULL AND (v_level IS NOT NULL OR v_box IS NOT NULL) THEN RAISE EXCEPTION 'Seleccione la estantería de la ubicación'; END IF;
    END IF;

    PERFORM 1 FROM public.elementos WHERE id = ANY(v_ids) AND NOT archived ORDER BY id COLLATE "C" FOR UPDATE;
    GET DIAGNOSTICS v_found = ROW_COUNT;
    IF v_found <> v_count THEN
      RAISE EXCEPTION 'Algunos productos seleccionados ya no están disponibles. Actualice la lista y vuelva a intentar';
    END IF;

    -- Cada dato se actualiza solo en los productos donde cambia, para no disparar validaciones ajenas.
    IF p_changes ? 'categoria' THEN
      UPDATE public.elementos SET categoria = v_category, updated_at = now()
        WHERE id = ANY(v_ids) AND categoria IS DISTINCT FROM v_category;
    END IF;
    IF p_changes ? 'estado' THEN
      UPDATE public.elementos SET estado = v_condition, updated_at = now()
        WHERE id = ANY(v_ids) AND estado IS DISTINCT FROM v_condition;
    END IF;
    IF p_changes ? 'stock_minimo' THEN
      UPDATE public.elementos SET stock_minimo = v_minimum, updated_at = now()
        WHERE id = ANY(v_ids) AND stock_minimo IS DISTINCT FROM v_minimum;
    END IF;
    IF p_changes ? 'marca' THEN
      UPDATE public.elementos SET especificaciones = jsonb_set(coalesce(especificaciones,'{}'::jsonb), '{marca}', to_jsonb(v_brand)), updated_at = now()
        WHERE id = ANY(v_ids) AND coalesce(especificaciones->>'marca','') IS DISTINCT FROM v_brand;
    END IF;
    IF p_changes ? 'ubicacion' THEN
      -- El disparador existente valida la jerarquía y registra REUBICACION en Historial.
      UPDATE public.elementos SET almacen_id = v_warehouse, estanteria_id = v_rack, nivel_id = v_level, caja_id = v_box, updated_at = now()
        WHERE id = ANY(v_ids) AND (almacen_id IS DISTINCT FROM v_warehouse OR estanteria_id IS DISTINCT FROM v_rack
          OR nivel_id IS DISTINCT FROM v_level OR caja_id IS DISTINCT FROM v_box);
    END IF;
    INSERT INTO public.inventario_ediciones_masivas(request_id, actor_id, payload, item_count)
      VALUES (p_request_id, auth.uid(), v_payload, v_count);
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(e.*) ORDER BY e.id COLLATE "C"), '[]'::jsonb) INTO v_result
    FROM public.elementos e WHERE e.id = ANY(v_ids) AND NOT e.archived;
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.bulk_update_inventory_items(uuid,text[],jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_inventory_items(uuid,text[],jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

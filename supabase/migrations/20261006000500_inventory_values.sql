-- Valores en COP. Conserva productos, cantidades, fotografías y documentos.
-- Los precios y las salidas existentes sin valor declarado comienzan en cero.
BEGIN;

CREATE OR REPLACE FUNCTION public.inventory_unit_value_cop(p_specs jsonb) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_price jsonb := p_specs->'valor_unitario_cop'; v_amount numeric;
BEGIN
  IF v_price IS NULL OR v_price='null'::jsonb THEN RETURN 0; END IF;
  IF jsonb_typeof(v_price) <> 'number' THEN RAISE EXCEPTION 'Valor unitario COP inválido'; END IF;
  v_amount := (v_price #>> '{}')::numeric;
  IF v_amount < 0 OR v_amount > 9999999999.99 OR round(v_amount,2) <> v_amount THEN
    RAISE EXCEPTION 'El valor unitario COP debe ser no negativo y tener hasta dos decimales';
  END IF;
  RETURN v_amount;
END $$;

CREATE OR REPLACE FUNCTION public.validate_inventory_unit_value() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.especificaciones IS NOT NULL AND jsonb_typeof(NEW.especificaciones) <> 'object' THEN
    RAISE EXCEPTION 'Las especificaciones deben ser un objeto';
  END IF;
  NEW.especificaciones := coalesce(NEW.especificaciones,'{}'::jsonb)
    || jsonb_build_object('valor_unitario_cop', public.inventory_unit_value_cop(NEW.especificaciones));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_inventory_unit_value ON public.elementos;
CREATE TRIGGER validate_inventory_unit_value BEFORE INSERT OR UPDATE OF especificaciones ON public.elementos
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_unit_value();

UPDATE public.elementos SET especificaciones=coalesce(especificaciones,'{}'::jsonb)
  || jsonb_build_object('valor_unitario_cop',0)
WHERE especificaciones->'valor_unitario_cop' IS NULL OR especificaciones->'valor_unitario_cop'='null'::jsonb;

CREATE OR REPLACE FUNCTION public.snapshot_inventory_line_values() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_line jsonb; v_old jsonb; v_price numeric; v_quantity numeric; v_lines jsonb := '[]'::jsonb; v_specs jsonb;
BEGIN
  FOR v_line IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
    v_quantity := (v_line->>'cantidad')::numeric;
    IF TG_OP='INSERT' THEN
      -- The dispatch RPC already holds these product locks. Always ignore submitted prices.
      SELECT especificaciones INTO v_specs FROM public.elementos WHERE id=v_line->>'elementoId' FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Componente no encontrado para valorar la salida'; END IF;
      v_price := public.inventory_unit_value_cop(v_specs);
    ELSE
      SELECT value INTO v_old FROM jsonb_array_elements(OLD.items) WHERE value->>'elementoId'=v_line->>'elementoId';
      IF NOT FOUND OR (v_old->>'cantidad')::numeric IS DISTINCT FROM v_quantity THEN
        RAISE EXCEPTION 'Las partidas de una salida registrada no pueden modificarse';
      END IF;
      -- Weight/photo wrappers update the document in the same transaction. Retain the first price snapshot.
      v_price := coalesce((v_old->>'valorUnitarioCOP')::numeric,0);
    END IF;
    v_lines := v_lines || jsonb_build_array(v_line || jsonb_build_object(
      'valorUnitarioCOP',v_price,'valorTotalCOP',round(v_price*v_quantity,2)));
  END LOOP;
  NEW.items := v_lines;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS snapshot_inventory_line_values ON public.remisiones;

-- Do not assign today's prices to historical documents. Rerunning preserves declared snapshots.
UPDATE public.remisiones AS rem SET items=(SELECT coalesce(jsonb_agg(value || jsonb_build_object(
    'valorUnitarioCOP',coalesce(value->'valorUnitarioCOP','0'::jsonb),
    'valorTotalCOP',coalesce(value->'valorTotalCOP','0'::jsonb)) ORDER BY position),'[]'::jsonb)
  FROM jsonb_array_elements(rem.items) WITH ORDINALITY AS line(value,position))
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(rem.items) AS line(value)
  WHERE NOT (value ? 'valorUnitarioCOP') OR NOT (value ? 'valorTotalCOP'));

CREATE TRIGGER snapshot_inventory_line_values BEFORE INSERT OR UPDATE OF items ON public.remisiones
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_inventory_line_values();

CREATE OR REPLACE FUNCTION public.inventory_project_spending()
RETURNS TABLE(proyecto_id text,total_cop numeric,salidas bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT project.id,coalesce(cost.total,0),coalesce(cost.documents,0)
  FROM public.proyectos project LEFT JOIN (
    SELECT rem.proyecto_id,sum((line.value->>'valorTotalCOP')::numeric) AS total,count(DISTINCT rem.id) AS documents
    FROM public.remisiones rem CROSS JOIN LATERAL jsonb_array_elements(rem.items) AS line(value)
    GROUP BY rem.proyecto_id
  ) cost ON cost.proyecto_id=project.id;
$$;
REVOKE ALL ON FUNCTION public.inventory_unit_value_cop(jsonb), public.validate_inventory_unit_value(), public.snapshot_inventory_line_values() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.inventory_project_spending() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inventory_project_spending() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

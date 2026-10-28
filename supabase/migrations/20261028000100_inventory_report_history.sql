-- Historial inmutable de informes. Ejecutar completo desde SQL Editor de Supabase.
-- Requiere las migraciones de seguridad y empresa anteriores. No modifica inventario.
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_inventory_report_snapshot(p_snapshot jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_row jsonb; v_key text; v_count integer;
BEGIN
  IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_snapshot->'rows') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_snapshot->'quantities') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_snapshot->'createdAt') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_snapshot->'generatedBy') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  v_count := jsonb_array_length(p_snapshot->'rows');
  IF v_count < 1 OR length(trim(p_snapshot->>'generatedBy')) NOT BETWEEN 1 AND 160 OR p_snapshot->'company' IS DISTINCT FROM public.normalize_inventory_company(p_snapshot->'company') THEN RETURN false; END IF;
  FOREACH v_key IN ARRAY ARRAY['pendingQuantity','pendingWeight','pendingValue','zeroPrice'] LOOP
    IF jsonb_typeof(p_snapshot->v_key) IS DISTINCT FROM 'number' OR (p_snapshot->>v_key)::numeric NOT BETWEEN 0 AND v_count
      OR (p_snapshot->>v_key)::numeric <> trunc((p_snapshot->>v_key)::numeric) THEN RETURN false; END IF;
  END LOOP;
  FOREACH v_key IN ARRAY ARRAY['weightKg','valueCOP'] LOOP
    IF jsonb_typeof(p_snapshot->v_key) IS DISTINCT FROM 'number' OR (p_snapshot->>v_key)::numeric < 0 THEN RETURN false; END IF;
  END LOOP;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_snapshot->'rows') LOOP
    IF jsonb_typeof(v_row) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
    FOREACH v_key IN ARRAY ARRAY['id','code','name','brand','category','condition','location','unit'] LOOP
      IF jsonb_typeof(v_row->v_key) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
    END LOOP;
    IF trim(v_row->>'id') = '' OR trim(v_row->>'name') = '' THEN RETURN false; END IF;
    FOREACH v_key IN ARRAY ARRAY['quantity','weightKg','valueCOP'] LOOP
      IF jsonb_typeof(v_row->v_key) IS DISTINCT FROM 'null' THEN
        IF jsonb_typeof(v_row->v_key) IS DISTINCT FROM 'number' OR (v_row->>v_key)::numeric < 0 THEN RETURN false; END IF;
      END IF;
    END LOOP;
    FOREACH v_key IN ARRAY ARRAY['damaged','unitValueCOP'] LOOP
      IF jsonb_typeof(v_row->v_key) IS DISTINCT FROM 'number' OR (v_row->>v_key)::numeric < 0 THEN RETURN false; END IF;
    END LOOP;
    IF jsonb_typeof(v_row->'unitWeight') IS DISTINCT FROM 'null' THEN
      IF jsonb_typeof(v_row->'unitWeight') IS DISTINCT FROM 'object'
        OR jsonb_typeof(v_row->'unitWeight'->'valor') IS DISTINCT FROM 'number'
        OR (v_row->'unitWeight'->>'valor')::numeric <= 0
        OR coalesce(v_row->'unitWeight'->>'unidad','') NOT IN ('g','kg') THEN RETURN false; END IF;
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_snapshot->'rows')) <> v_count THEN RETURN false; END IF;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_snapshot->'quantities') LOOP
    IF jsonb_typeof(v_row->'unit') IS DISTINCT FROM 'string' OR jsonb_typeof(v_row->'quantity') IS DISTINCT FROM 'number'
      OR (v_row->>'quantity')::numeric < 0 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

CREATE TABLE IF NOT EXISTS public.inventario_informes (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  version integer NOT NULL CHECK (version = 1),
  generated_by text NOT NULL,
  product_count integer NOT NULL CHECK (product_count > 0),
  quantities jsonb NOT NULL,
  value_cop numeric NOT NULL CHECK (value_cop >= 0),
  pending_value integer NOT NULL CHECK (pending_value >= 0),
  snapshot jsonb NOT NULL,
  request_payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS inventario_informes_created_idx ON public.inventario_informes(created_at DESC,id DESC);
ALTER TABLE public.inventario_informes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_informes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inventario_informes TO authenticated;
DROP POLICY IF EXISTS inventory_reports_read ON public.inventario_informes;
CREATE POLICY inventory_reports_read ON public.inventario_informes FOR SELECT TO authenticated
  USING (public.fulgor_role() IN ('admin','operador','consulta'));

CREATE OR REPLACE FUNCTION public.keep_inventory_report_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Los informes guardados no se pueden modificar ni eliminar'; END $$;
DROP TRIGGER IF EXISTS inventory_report_immutable ON public.inventario_informes;
CREATE TRIGGER inventory_report_immutable BEFORE UPDATE OR DELETE ON public.inventario_informes
  FOR EACH ROW EXECUTE FUNCTION public.keep_inventory_report_immutable();

CREATE OR REPLACE FUNCTION public.inventory_report_history_ready() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(public.fulgor_role(),'') NOT IN ('admin','operador','consulta') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.save_inventory_report(p_request_id uuid,p_snapshot jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_previous public.inventario_informes; v_snapshot jsonb; v_now timestamptz := clock_timestamp(); v_actor text;
BEGIN
  PERFORM public.inventory_report_history_ready();
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta ID de solicitud'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,2801));
  SELECT * INTO v_previous FROM public.inventario_informes WHERE id=p_request_id;
  IF FOUND THEN
    IF v_previous.created_by IS DISTINCT FROM auth.uid() OR v_previous.request_payload IS DISTINCT FROM p_snapshot THEN
      RAISE EXCEPTION 'La solicitud corresponde a otro informe';
    END IF;
    RETURN v_previous.snapshot;
  END IF;
  IF NOT public.validate_inventory_report_snapshot(p_snapshot) THEN RAISE EXCEPTION 'Datos del informe inválidos'; END IF;
  v_actor := trim(p_snapshot->>'generatedBy');
  v_snapshot := p_snapshot || jsonb_build_object('createdAt',v_now,'generatedBy',v_actor);
  INSERT INTO public.inventario_informes(id,created_at,created_by,version,generated_by,product_count,quantities,value_cop,pending_value,snapshot,request_payload)
    VALUES(p_request_id,v_now,auth.uid(),1,v_actor,jsonb_array_length(v_snapshot->'rows'),v_snapshot->'quantities',
      (v_snapshot->>'valueCOP')::numeric,(v_snapshot->>'pendingValue')::integer,v_snapshot,p_snapshot);
  RETURN v_snapshot;
END $$;
REVOKE ALL ON FUNCTION public.validate_inventory_report_snapshot(jsonb),public.keep_inventory_report_immutable(),
  public.inventory_report_history_ready(),public.save_inventory_report(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_report_history_ready(),public.save_inventory_report(uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

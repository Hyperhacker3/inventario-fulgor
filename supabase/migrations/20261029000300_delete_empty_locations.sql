-- Elimina únicamente ubicaciones vacías. No permite cascadas ni reduce consecutivos.
-- Independiente de la normalización: también sirve para retirar una caja de prueba.
BEGIN;
CREATE OR REPLACE FUNCTION public.delete_empty_inventory_location(p_kind text,p_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_table text;v_field text;v_row jsonb;v_used boolean;v_last numeric;v_prefix text;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF nullif(trim(p_id),'') IS NULL THEN RAISE EXCEPTION 'Seleccione una ubicación'; END IF;
  v_table:=CASE p_kind WHEN 'almacen' THEN 'almacenes' WHEN 'estanteria' THEN 'estanterias'
    WHEN 'nivel' THEN 'niveles_estanteria' WHEN 'caja' THEN 'cajas' END;
  v_field:=CASE p_kind WHEN 'almacen' THEN 'almacen_id' WHEN 'estanteria' THEN 'estanteria_id'
    WHEN 'nivel' THEN 'nivel_id' WHEN 'caja' THEN 'caja_id' END;
  IF v_table IS NULL THEN RAISE EXCEPTION 'Tipo de ubicación inválido'; END IF;
  -- Bloqueo del padre: las altas/reubicaciones concurrentes deben comprobar su FK.
  EXECUTE format('SELECT to_jsonb(u.*) FROM public.%I u WHERE id=$1 FOR UPDATE',v_table) INTO v_row USING p_id;
  IF v_row IS NULL THEN RETURN jsonb_build_object('id',p_id,'kind',p_kind,'deleted',true); END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.elementos WHERE %I=$1)',v_field) INTO v_used USING p_id;
  IF v_used THEN RAISE EXCEPTION 'No se puede eliminar: tiene productos asignados, incluidos productos archivados. Reubíquelos primero'; END IF;
  IF p_kind='almacen' AND EXISTS(SELECT 1 FROM public.estanterias WHERE almacen_id=p_id) THEN
    RAISE EXCEPTION 'No se puede eliminar el almacén: tiene estanterías. Elimine primero las ubicaciones vacías que contiene';
  ELSIF p_kind='estanteria' AND (EXISTS(SELECT 1 FROM public.niveles_estanteria WHERE estanteria_id=p_id)
      OR EXISTS(SELECT 1 FROM public.cajas WHERE estanteria_id=p_id)) THEN
    RAISE EXCEPTION 'No se puede eliminar la estantería: tiene niveles o cajas. Elimine primero las ubicaciones vacías que contiene';
  ELSIF p_kind='nivel' AND EXISTS(SELECT 1 FROM public.cajas WHERE nivel_id=p_id) THEN
    RAISE EXCEPTION 'No se puede eliminar el nivel: tiene cajas. Elimine primero las cajas vacías';
  END IF;
  -- Incluso al eliminar un código antiguo, no reutilizar después su número.
  IF to_regclass('public.inventario_ubicacion_consecutivos') IS NOT NULL THEN
    v_prefix:=CASE p_kind WHEN 'almacen' THEN 'ALM' WHEN 'estanteria' THEN 'EST' WHEN 'nivel' THEN 'NIV' ELSE 'CAJ' END;
    EXECUTE format('SELECT coalesce(max(n),0) FROM (SELECT substring(substring(codigo from ''^[[:space:]]*([^[:space:]]+)'') from ''([0-9]+)[^0-9]*$'')::numeric AS n FROM public.%I) codes WHERE n<=999999999999',v_table) INTO v_last;
    UPDATE public.inventario_ubicacion_consecutivos SET ultimo=greatest(ultimo,v_last::bigint) WHERE prefijo=v_prefix;
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id=$1',v_table) USING p_id;
  RETURN jsonb_build_object('id',p_id,'kind',p_kind,'deleted',true);
END $$;
REVOKE ALL ON FUNCTION public.delete_empty_inventory_location(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delete_empty_inventory_location(text,text) TO authenticated;
-- La escritura directa no puede saltarse las comprobaciones ni activar cascadas.
REVOKE DELETE ON public.almacenes,public.estanterias,public.niveles_estanteria,public.cajas FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

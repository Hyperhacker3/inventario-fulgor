-- Ejecutar completo desde la cuenta del usuario, DESPUÉS de 20261029000100.
-- Analiza todas las ubicaciones reales, normaliza sus códigos y sincroniza contadores.
-- Conserva TODOS los números, IDs, padres, nombres, productos, stock y documentos históricos.
-- Los números antiguos repetidos en padres distintos se conservan. Nunca renumera.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('inventario-catalogos',0));
DO $$ BEGIN
  IF to_regclass('public.inventario_ubicacion_consecutivos') IS NULL THEN
    RAISE EXCEPTION 'Ejecute primero 20261029000100_automatic_location_category_codes.sql completo';
  END IF;
END $$;
LOCK TABLE public.almacenes,public.estanterias,public.niveles_estanteria,public.cajas IN SHARE ROW EXCLUSIVE MODE;

-- Registro privado de equivalencias; nunca se sobreescribe al repetir la migración.
CREATE TABLE IF NOT EXISTS public.inventario_ubicacion_codigos_normalizados (
  tipo text NOT NULL,ubicacion_id text NOT NULL,codigo_anterior text NOT NULL,
  codigo_nuevo text NOT NULL,normalizado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tipo,ubicacion_id)
);
ALTER TABLE public.inventario_ubicacion_codigos_normalizados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_ubicacion_codigos_normalizados FROM PUBLIC,anon,authenticated;

CREATE TEMP TABLE plan_codigos_ubicaciones (
  tipo text NOT NULL,tabla text NOT NULL,prefijo text NOT NULL,ubicacion_id text NOT NULL,
  codigo_anterior text NOT NULL,padre_id text,numero_anterior numeric,
  codigo_nuevo text,codigo_temporal text NOT NULL,
  PRIMARY KEY(tipo,ubicacion_id)
) ON COMMIT DROP;
ALTER TABLE pg_temp.plan_codigos_ubicaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pg_temp.plan_codigos_ubicaciones FROM PUBLIC,anon,authenticated;

DO $$
DECLARE r record;v_last bigint;v_parent text;v_problem record;v_missing record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('almacen','almacenes','ALM'),('estanteria','estanterias','EST'),
    ('nivel','niveles_estanteria','NIV'),('caja','cajas','CAJ')
  ) t(tipo,tabla,prefijo) LOOP
    -- Lee el número del primer bloque de código; ignora descripciones y sus números.
    -- EST-001 SIN ESTANTERÍA => 1, CAJA-005 ZONA 99 => 5, EST-A01 => 1.
    v_parent:=CASE r.tipo WHEN 'almacen' THEN '''GLOBAL''' WHEN 'estanteria' THEN 'almacen_id'
      WHEN 'nivel' THEN 'estanteria_id' ELSE 'coalesce(nivel_id,''SIN-NIVEL:''||estanteria_id)' END;
    EXECUTE format('INSERT INTO pg_temp.plan_codigos_ubicaciones
      (tipo,tabla,prefijo,ubicacion_id,codigo_anterior,padre_id,numero_anterior,codigo_temporal)
      SELECT $1,$2,$3,id,codigo,%s,substring(substring(codigo from ''^[[:space:]]*([^[:space:]]+)'') from ''([0-9]+)[^0-9]*$'')::numeric,
        ''NORMALIZA-''||upper(gen_random_uuid()::text) FROM public.%I',v_parent,r.tabla)
      USING r.tipo,r.tabla,r.prefijo;
    SELECT ubicacion_id,codigo_anterior INTO v_problem FROM pg_temp.plan_codigos_ubicaciones
      WHERE tipo=r.tipo AND numero_anterior>999999999999 LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'El número del código % de % (ID %) supera el límite admitido. No se cambia ningún número; revise audit_location_codes_readonly.sql',v_problem.codigo_anterior,r.tipo,v_problem.ubicacion_id;
    END IF;
    UPDATE pg_temp.plan_codigos_ubicaciones SET codigo_nuevo=r.prefijo||lpad(numero_anterior::bigint::text,greatest(3,length(numero_anterior::bigint::text)),'0')
      WHERE tipo=r.tipo;
    SELECT padre_id,codigo_nuevo,array_agg(ubicacion_id ORDER BY ubicacion_id) AS ids INTO v_problem
      FROM pg_temp.plan_codigos_ubicaciones WHERE tipo=r.tipo AND codigo_nuevo IS NOT NULL
      GROUP BY padre_id,codigo_nuevo HAVING count(*)>1 LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'El código % quedaría repetido en el mismo padre % (IDs %). No se cambia ningún número; elimine o reubique la ubicación de prueba y repita',v_problem.codigo_nuevo,v_problem.padre_id,v_problem.ids;
    END IF;
    SELECT greatest(coalesce(max(numero_anterior),0),
      coalesce((SELECT ultimo FROM public.inventario_ubicacion_consecutivos WHERE prefijo=r.prefijo),0))::bigint
      INTO v_last FROM pg_temp.plan_codigos_ubicaciones WHERE tipo=r.tipo;
    -- Solo los códigos sin número reciben uno nuevo, sobre el mayor ya reservado.
    -- No deduplica ubicaciones ni cambia ningún número anterior.
    FOR v_missing IN SELECT ubicacion_id FROM pg_temp.plan_codigos_ubicaciones
      WHERE tipo=r.tipo AND numero_anterior IS NULL ORDER BY ubicacion_id COLLATE "C" LOOP
      IF v_last>=999999999999 THEN RAISE EXCEPTION 'Se agotó el consecutivo de %; no se aplicó ningún cambio',r.tipo; END IF;
      v_last:=v_last+1;
      UPDATE pg_temp.plan_codigos_ubicaciones
        SET codigo_nuevo=r.prefijo||lpad(v_last::text,greatest(3,length(v_last::text)),'0')
        WHERE tipo=r.tipo AND ubicacion_id=v_missing.ubicacion_id;
    END LOOP;
    INSERT INTO public.inventario_ubicacion_consecutivos(prefijo,ultimo) VALUES(r.prefijo,v_last)
      ON CONFLICT(prefijo) DO UPDATE SET ultimo=greatest(inventario_ubicacion_consecutivos.ultimo,excluded.ultimo);

    -- Solo esta transacción administrativa suspende el bloqueo de código.
    -- Dos pasos evitan conflictos con códigos antiguos que todavía ocupen el destino.
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER assign_inventory_location_code',r.tabla);
    EXECUTE format('UPDATE public.%I u SET codigo=p.codigo_temporal FROM pg_temp.plan_codigos_ubicaciones p
      WHERE p.tipo=$1 AND u.id=p.ubicacion_id AND p.codigo_anterior<>p.codigo_nuevo',r.tabla) USING r.tipo;
    EXECUTE format('UPDATE public.%I u SET codigo=p.codigo_nuevo FROM pg_temp.plan_codigos_ubicaciones p
      WHERE p.tipo=$1 AND u.id=p.ubicacion_id AND p.codigo_anterior<>p.codigo_nuevo',r.tabla) USING r.tipo;
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER assign_inventory_location_code',r.tabla);
  END LOOP;
END $$;
INSERT INTO public.inventario_ubicacion_codigos_normalizados(tipo,ubicacion_id,codigo_anterior,codigo_nuevo)
SELECT tipo,ubicacion_id,codigo_anterior,codigo_nuevo FROM pg_temp.plan_codigos_ubicaciones
WHERE codigo_anterior<>codigo_nuevo ON CONFLICT(tipo,ubicacion_id) DO NOTHING;

-- La RPC mantiene permisos y la identidad de los reintentos. Tras una normalización,
-- devuelve el código actual del mismo ID en vez de resucitar la etiqueta anterior.

CREATE OR REPLACE FUNCTION public.create_inventory_location_auto(p_request_id uuid,p_kind text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_previous public.inventario_autocodigo_solicitudes;v_result jsonb;v_payload jsonb;
  v_name text;v_description text;v_parent text;v_level text;v_state text;v_id text;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Solicitud de ubicación inválida'; END IF;
  IF p_kind NOT IN ('almacen','estanteria','nivel','caja') OR p_kind IS NULL THEN RAISE EXCEPTION 'Tipo de ubicación inválido'; END IF;
  v_name:=trim(coalesce(p_input->>'nombre',''));v_description:=coalesce(p_input->>'descripcion','');
  IF p_kind<>'caja' AND length(v_name) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Escriba un nombre de hasta 100 caracteres'; END IF;
  v_state:=upper(coalesce(p_input->>'estado',CASE WHEN p_kind='caja' THEN 'PARCIAL' ELSE 'OPERATIVO' END));
  v_parent:=nullif(p_input->>'parent_id','');v_level:=nullif(p_input->>'nivel_id','');
  v_payload:=jsonb_build_object('nombre',v_name,'descripcion',v_description,'parent_id',v_parent,'nivel_id',v_level,'estado',v_state,'ciudad',coalesce(p_input->>'ciudad',''));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,2910));
  SELECT * INTO v_previous FROM public.inventario_autocodigo_solicitudes WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.actor_id IS DISTINCT FROM auth.uid() OR v_previous.kind<>p_kind OR v_previous.payload<>v_payload THEN RAISE EXCEPTION 'La solicitud corresponde a otros datos'; END IF;
    IF p_kind='almacen' THEN SELECT to_jsonb(u.*) INTO v_result FROM public.almacenes u WHERE id=v_previous.result->>'id';
    ELSIF p_kind='estanteria' THEN SELECT to_jsonb(u.*) INTO v_result FROM public.estanterias u WHERE id=v_previous.result->>'id';
    ELSIF p_kind='nivel' THEN SELECT to_jsonb(u.*) INTO v_result FROM public.niveles_estanteria u WHERE id=v_previous.result->>'id';
    ELSE SELECT to_jsonb(u.*) INTO v_result FROM public.cajas u WHERE id=v_previous.result->>'id'; END IF;
    IF v_result IS NULL THEN RAISE EXCEPTION 'La ubicación de esta solicitud ya no está disponible'; END IF;
    RETURN v_result;
  END IF;
  v_id:=upper(p_kind)||'-'||gen_random_uuid()::text;
  IF p_kind='almacen' THEN
    IF v_state NOT IN ('OPERATIVO','MANTENIMIENTO','INACTIVO') THEN RAISE EXCEPTION 'Estado de almacén inválido'; END IF;
    INSERT INTO public.almacenes(id,codigo,nombre,direccion,descripcion,estado) VALUES(v_id,'',v_name,p_input->>'ciudad',v_description,initcap(lower(v_state))) RETURNING to_jsonb(almacenes.*) INTO v_result;
  ELSIF p_kind='estanteria' THEN
    IF v_parent IS NULL THEN RAISE EXCEPTION 'Seleccione un almacén'; END IF;
    INSERT INTO public.estanterias(id,codigo,nombre,almacen_id,descripcion) VALUES(v_id,'',v_name,v_parent,v_description) RETURNING to_jsonb(estanterias.*) INTO v_result;
  ELSIF p_kind='nivel' THEN
    IF v_parent IS NULL THEN RAISE EXCEPTION 'Seleccione una estantería'; END IF;
    INSERT INTO public.niveles_estanteria(id,codigo,nombre,estanteria_id,descripcion) VALUES(v_id,'',v_name,v_parent,v_description) RETURNING to_jsonb(niveles_estanteria.*) INTO v_result;
  ELSE
    IF v_level IS NULL OR v_parent IS NULL THEN RAISE EXCEPTION 'Seleccione un nivel de estantería'; END IF;
    IF v_state NOT IN ('COMPLETA','PARCIAL','VACIA') THEN RAISE EXCEPTION 'Estado de caja inválido'; END IF;
    INSERT INTO public.cajas(id,codigo,nombre,estanteria_id,nivel_id,descripcion,estado) VALUES(v_id,'','',v_parent,v_level,v_description,v_state) RETURNING to_jsonb(cajas.*) INTO v_result;
  END IF;
  INSERT INTO public.inventario_autocodigo_solicitudes(request_id,actor_id,kind,payload,result) VALUES(p_request_id,auth.uid(),p_kind,v_payload,v_result);
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.create_inventory_location_auto(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_inventory_location_auto(uuid,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Resumen calculado sobre los datos reales, antes del COMMIT de la misma transacción.
SELECT t.tipo,c.prefijo,count(p.ubicacion_id) AS ubicaciones,
  count(p.ubicacion_id) FILTER (WHERE p.codigo_anterior<>p.codigo_nuevo) AS codigos_actualizados,
  count(p.ubicacion_id) FILTER (WHERE p.numero_anterior IS NULL) AS sin_numero_que_recibieron_consecutivo,
  max(p.numero_anterior) AS mayor_numero_actual,c.ultimo AS ultimo_reservado,
  CASE WHEN c.ultimo<999999999999 THEN c.prefijo||lpad((c.ultimo+1)::text,greatest(3,length((c.ultimo+1)::text)),'0') END AS siguiente_codigo
FROM public.inventario_ubicacion_consecutivos c JOIN
  (VALUES('almacen','ALM'),('estanteria','EST'),('nivel','NIV'),('caja','CAJ')) t(tipo,prefijo) ON t.prefijo=c.prefijo
LEFT JOIN pg_temp.plan_codigos_ubicaciones p ON p.prefijo=c.prefijo
GROUP BY t.tipo,c.prefijo,c.ultimo ORDER BY c.prefijo;
COMMIT;

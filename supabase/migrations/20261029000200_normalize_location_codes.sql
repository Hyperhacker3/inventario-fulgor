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

-- Lista privada de pendientes del último intento, consultable después de COMMIT.
CREATE TABLE IF NOT EXISTS public.inventario_ubicacion_codigos_pendientes (
  tipo text NOT NULL,ubicacion_id text NOT NULL,nombre text NOT NULL,
  padre_id text,codigo_actual text NOT NULL,codigo_propuesto text,motivo text NOT NULL,
  revisado_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tipo,ubicacion_id)
);
ALTER TABLE public.inventario_ubicacion_codigos_pendientes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_ubicacion_codigos_pendientes FROM PUBLIC,anon,authenticated;

CREATE TEMP TABLE plan_codigos_ubicaciones (
  tipo text NOT NULL,tabla text NOT NULL,prefijo text NOT NULL,ubicacion_id text NOT NULL,
  nombre text NOT NULL,codigo_anterior text NOT NULL,padre_id text,numero_anterior numeric,
  codigo_nuevo text,codigo_temporal text NOT NULL,motivo text,grupo text,
  aplicado boolean NOT NULL DEFAULT false,existe boolean NOT NULL DEFAULT true,
  PRIMARY KEY(tipo,ubicacion_id)
) ON COMMIT DROP;
ALTER TABLE pg_temp.plan_codigos_ubicaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pg_temp.plan_codigos_ubicaciones FROM PUBLIC,anon,authenticated;

-- Excepciones concretas autorizadas por el usuario, solo para el SQL administrativo.
-- Por defecto no hay ninguna. Los IDs reales se configuran en un archivo privado.
CREATE TEMP TABLE ajustes_codigos_ubicaciones (
  tipo text NOT NULL CHECK(tipo IN ('almacen','estanteria','nivel','caja')),
  ubicacion_id text NOT NULL,padre_id text NOT NULL,
  numero numeric NOT NULL CHECK(numero BETWEEN 1 AND 999999999999 AND numero=trunc(numero)),
  PRIMARY KEY(tipo,ubicacion_id)
) ON COMMIT DROP;
ALTER TABLE pg_temp.ajustes_codigos_ubicaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pg_temp.ajustes_codigos_ubicaciones FROM PUBLIC,anon,authenticated;
INSERT INTO pg_temp.ajustes_codigos_ubicaciones(tipo,ubicacion_id,padre_id,numero)
SELECT tipo,ubicacion_id,padre_id,numero FROM jsonb_to_recordset(
  coalesce(nullif(current_setting('inventario.codigos_ubicaciones_autorizados',true),''),'[]')::jsonb
) AS a(tipo text,ubicacion_id text,padre_id text,numero numeric);

DO $$
DECLARE r record;v_last bigint;v_parent text;v_missing record;v_group record;v_changes integer;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('almacen','almacenes','ALM'),('estanteria','estanterias','EST'),
    ('nivel','niveles_estanteria','NIV'),('caja','cajas','CAJ')
  ) t(tipo,tabla,prefijo) LOOP
    v_parent:=CASE r.tipo WHEN 'almacen' THEN '''GLOBAL''' WHEN 'estanteria' THEN 'almacen_id'
      WHEN 'nivel' THEN 'estanteria_id' ELSE 'coalesce(nivel_id,''SIN-NIVEL:''||estanteria_id)' END;
    EXECUTE format('INSERT INTO pg_temp.plan_codigos_ubicaciones
      (tipo,tabla,prefijo,ubicacion_id,nombre,codigo_anterior,padre_id,numero_anterior,codigo_temporal)
      SELECT $1,$2,$3,id,nombre,codigo,%s,substring(substring(codigo from ''^[[:space:]]*([^[:space:]]+)'') from ''([0-9]+)[^0-9]*$'')::numeric,
        ''NORMALIZA-''||upper(gen_random_uuid()::text) FROM public.%I',v_parent,r.tabla)
      USING r.tipo,r.tabla,r.prefijo;
    UPDATE pg_temp.plan_codigos_ubicaciones SET motivo='El número anterior supera el límite admitido de 12 cifras'
      WHERE tipo=r.tipo AND numero_anterior>999999999999;
    UPDATE pg_temp.plan_codigos_ubicaciones SET codigo_nuevo=r.prefijo||lpad(numero_anterior::bigint::text,greatest(3,length(numero_anterior::bigint::text)),'0')
      WHERE tipo=r.tipo AND motivo IS NULL AND numero_anterior IS NOT NULL;

    -- Los ajustes concretos conservan la comprobación de identidad y padre.
    INSERT INTO pg_temp.plan_codigos_ubicaciones
      (tipo,tabla,prefijo,ubicacion_id,nombre,codigo_anterior,padre_id,codigo_temporal,motivo,existe)
    SELECT a.tipo,r.tabla,r.prefijo,a.ubicacion_id,'Ubicación no encontrada','',a.padre_id,
      'NORMALIZA-'||upper(gen_random_uuid()::text),'El ID del ajuste autorizado ya no existe',false
    FROM pg_temp.ajustes_codigos_ubicaciones a WHERE a.tipo=r.tipo
      AND NOT EXISTS(SELECT 1 FROM pg_temp.plan_codigos_ubicaciones p WHERE p.tipo=a.tipo AND p.ubicacion_id=a.ubicacion_id);
    UPDATE pg_temp.plan_codigos_ubicaciones p
      SET motivo=format('El ajuste autorizado espera el padre %s, pero la ubicación pertenece a %s',a.padre_id,coalesce(p.padre_id,'sin padre'))
      FROM pg_temp.ajustes_codigos_ubicaciones a WHERE a.tipo=r.tipo AND p.tipo=a.tipo AND p.ubicacion_id=a.ubicacion_id
        AND p.existe AND p.padre_id IS DISTINCT FROM a.padre_id;
    UPDATE pg_temp.plan_codigos_ubicaciones p SET codigo_nuevo=r.prefijo||lpad(a.numero::bigint::text,greatest(3,length(a.numero::bigint::text)),'0')
      FROM pg_temp.ajustes_codigos_ubicaciones a WHERE a.tipo=r.tipo AND p.tipo=a.tipo AND p.ubicacion_id=a.ubicacion_id;

    -- Reutiliza la propuesta pendiente de una ubicación sin número; no consume
    -- otro consecutivo cada vez que se repite un intento que sigue fallando.
    UPDATE pg_temp.plan_codigos_ubicaciones p SET codigo_nuevo=previous.codigo_propuesto
      FROM public.inventario_ubicacion_codigos_pendientes previous
      WHERE p.tipo=r.tipo AND p.motivo IS NULL AND p.codigo_nuevo IS NULL
        AND previous.tipo=p.tipo AND previous.ubicacion_id=p.ubicacion_id
        AND previous.codigo_actual=p.codigo_anterior AND previous.padre_id IS NOT DISTINCT FROM p.padre_id
        AND previous.codigo_propuesto ~ ('^'||r.prefijo||'[0-9]{3,12}$');
    SELECT greatest(coalesce(max(numero_anterior) FILTER(WHERE numero_anterior<=999999999999),0),
      coalesce(max(substring(codigo_nuevo from 4)::numeric),0),
      coalesce((SELECT ultimo FROM public.inventario_ubicacion_consecutivos WHERE prefijo=r.prefijo),0))::bigint
      INTO v_last FROM pg_temp.plan_codigos_ubicaciones WHERE tipo=r.tipo;
    FOR v_missing IN SELECT ubicacion_id FROM pg_temp.plan_codigos_ubicaciones
      WHERE tipo=r.tipo AND motivo IS NULL AND codigo_nuevo IS NULL ORDER BY ubicacion_id COLLATE "C" LOOP
      IF v_last>=999999999999 THEN
        UPDATE pg_temp.plan_codigos_ubicaciones SET motivo='No queda un consecutivo disponible dentro del límite de 12 cifras'
          WHERE tipo=r.tipo AND ubicacion_id=v_missing.ubicacion_id;
      ELSE
        v_last:=v_last+1;
        UPDATE pg_temp.plan_codigos_ubicaciones SET codigo_nuevo=r.prefijo||lpad(v_last::text,greatest(3,length(v_last::text)),'0')
          WHERE tipo=r.tipo AND ubicacion_id=v_missing.ubicacion_id;
      END IF;
    END LOOP;

    -- Una coincidencia deja pendientes únicamente sus participantes.
    WITH duplicates AS (
      SELECT padre_id,codigo_nuevo,string_agg(ubicacion_id,', ' ORDER BY ubicacion_id) AS ids
      FROM pg_temp.plan_codigos_ubicaciones WHERE tipo=r.tipo AND motivo IS NULL AND codigo_nuevo IS NOT NULL
      GROUP BY padre_id,codigo_nuevo HAVING count(*)>1
    )
    UPDATE pg_temp.plan_codigos_ubicaciones p
      SET motivo=format('El código %s quedaría repetido en el mismo padre. IDs: %s',p.codigo_nuevo,d.ids)
      FROM duplicates d WHERE p.tipo=r.tipo AND p.motivo IS NULL AND p.padre_id IS NOT DISTINCT FROM d.padre_id AND p.codigo_nuevo=d.codigo_nuevo;
    -- Un registro que no se mueve sigue ocupando su código anterior. Propaga
    -- ese bloqueo a las propuestas que dependan de liberarlo, sin tocarlas.
    LOOP
      UPDATE pg_temp.plan_codigos_ubicaciones p
        SET motivo=format('El código propuesto sigue ocupado por la ubicación pendiente %s (%s)',blocked.ubicacion_id,blocked.codigo_anterior)
        FROM pg_temp.plan_codigos_ubicaciones blocked
        WHERE p.tipo=r.tipo AND p.motivo IS NULL AND p.codigo_nuevo<>p.codigo_anterior
          AND blocked.tipo=p.tipo AND blocked.ubicacion_id<>p.ubicacion_id AND blocked.motivo IS NOT NULL
          AND blocked.padre_id IS NOT DISTINCT FROM p.padre_id AND upper(trim(blocked.codigo_anterior))=p.codigo_nuevo;
      GET DIAGNOSTICS v_changes=ROW_COUNT;
      EXIT WHEN v_changes=0;
    END LOOP;
    INSERT INTO public.inventario_ubicacion_consecutivos(prefijo,ultimo) VALUES(r.prefijo,v_last)
      ON CONFLICT(prefijo) DO UPDATE SET ultimo=greatest(inventario_ubicacion_consecutivos.ultimo,excluded.ultimo);

    -- Los intercambios de códigos se aplican como un grupo indivisible; los
    -- grupos independientes continúan aunque uno falle por una restricción.
    WITH RECURSIVE connected(root,id) AS (
      SELECT ubicacion_id,ubicacion_id FROM pg_temp.plan_codigos_ubicaciones
        WHERE tipo=r.tipo AND motivo IS NULL AND codigo_nuevo<>codigo_anterior
      UNION
      SELECT connected.root,next.ubicacion_id FROM connected
        JOIN pg_temp.plan_codigos_ubicaciones current ON current.tipo=r.tipo AND current.ubicacion_id=connected.id
        JOIN pg_temp.plan_codigos_ubicaciones next ON next.tipo=current.tipo AND next.padre_id IS NOT DISTINCT FROM current.padre_id
          AND next.motivo IS NULL AND next.codigo_nuevo<>next.codigo_anterior
          AND (current.codigo_anterior=next.codigo_nuevo OR current.codigo_nuevo=next.codigo_anterior)
    )
    UPDATE pg_temp.plan_codigos_ubicaciones p SET grupo=groups.root FROM
      (SELECT id,min(root COLLATE "C") AS root FROM connected GROUP BY id) groups
      WHERE p.tipo=r.tipo AND p.ubicacion_id=groups.id;
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER assign_inventory_location_code',r.tabla);
    FOR v_group IN SELECT DISTINCT grupo FROM pg_temp.plan_codigos_ubicaciones
      WHERE tipo=r.tipo AND motivo IS NULL AND grupo IS NOT NULL ORDER BY grupo LOOP
      BEGIN
        EXECUTE format('UPDATE public.%I u SET codigo=p.codigo_temporal FROM pg_temp.plan_codigos_ubicaciones p
          WHERE p.tipo=$1 AND p.grupo=$2 AND p.motivo IS NULL AND u.id=p.ubicacion_id',r.tabla) USING r.tipo,v_group.grupo;
        EXECUTE format('UPDATE public.%I u SET codigo=p.codigo_nuevo FROM pg_temp.plan_codigos_ubicaciones p
          WHERE p.tipo=$1 AND p.grupo=$2 AND p.motivo IS NULL AND u.id=p.ubicacion_id',r.tabla) USING r.tipo,v_group.grupo;
        UPDATE pg_temp.plan_codigos_ubicaciones SET aplicado=true WHERE tipo=r.tipo AND grupo=v_group.grupo AND motivo IS NULL;
      EXCEPTION WHEN OTHERS THEN
        UPDATE pg_temp.plan_codigos_ubicaciones
          SET motivo=format('No se pudo aplicar el grupo (%s): %s',SQLSTATE,SQLERRM),aplicado=false
          WHERE tipo=r.tipo AND grupo=v_group.grupo;
      END;
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER assign_inventory_location_code',r.tabla);
    DELETE FROM public.inventario_ubicacion_codigos_pendientes WHERE tipo=r.tipo;
    INSERT INTO public.inventario_ubicacion_codigos_pendientes(tipo,ubicacion_id,nombre,padre_id,codigo_actual,codigo_propuesto,motivo)
      SELECT tipo,ubicacion_id,nombre,padre_id,codigo_anterior,codigo_nuevo,motivo FROM pg_temp.plan_codigos_ubicaciones
      WHERE tipo=r.tipo AND motivo IS NOT NULL;
  END LOOP;
END $$;
INSERT INTO public.inventario_ubicacion_codigos_normalizados(tipo,ubicacion_id,codigo_anterior,codigo_nuevo)
SELECT tipo,ubicacion_id,codigo_anterior,codigo_nuevo FROM pg_temp.plan_codigos_ubicaciones
WHERE aplicado ON CONFLICT(tipo,ubicacion_id) DO NOTHING;

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

-- Resumen de los cambios aplicados y pendientes de ESTA ejecución.
SELECT t.tipo,c.prefijo,count(p.ubicacion_id) FILTER(WHERE p.existe) AS ubicaciones,
  count(p.ubicacion_id) FILTER(WHERE p.aplicado) AS codigos_actualizados,
  count(p.ubicacion_id) FILTER(WHERE p.motivo IS NOT NULL) AS pendientes,
  count(p.ubicacion_id) FILTER(WHERE p.existe AND p.motivo IS NULL AND NOT p.aplicado) AS ya_correctos,
  count(p.ubicacion_id) FILTER(WHERE p.aplicado AND p.numero_anterior IS NULL) AS sin_numero_que_recibieron_consecutivo,
  max(p.numero_anterior) AS mayor_numero_anterior,c.ultimo AS ultimo_reservado,
  CASE WHEN c.ultimo<999999999999 THEN c.prefijo||lpad((c.ultimo+1)::text,greatest(3,length((c.ultimo+1)::text)),'0') END AS siguiente_codigo
FROM public.inventario_ubicacion_consecutivos c JOIN
  (VALUES('almacen','ALM'),('estanteria','EST'),('nivel','NIV'),('caja','CAJ')) t(tipo,prefijo) ON t.prefijo=c.prefijo
LEFT JOIN pg_temp.plan_codigos_ubicaciones p ON p.prefijo=c.prefijo
GROUP BY t.tipo,c.prefijo,c.ultimo ORDER BY c.prefijo;

-- La última tabla de resultados muestra cada pendiente y el motivo concreto.
-- También queda guardada para consultar después con location_code_normalization_pending.sql.
SELECT tipo,ubicacion_id,nombre,padre_id,codigo_actual,codigo_propuesto,motivo
FROM public.inventario_ubicacion_codigos_pendientes ORDER BY tipo,padre_id,codigo_propuesto,ubicacion_id;
COMMIT;

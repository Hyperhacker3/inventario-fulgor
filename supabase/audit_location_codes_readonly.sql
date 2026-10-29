-- Solo lectura. Ejecutar desde SQL Editor para ver números y posibles conflictos reales.
WITH locations AS (
  SELECT 'almacen' AS tipo,'ALM' AS prefijo,id,codigo,'GLOBAL' AS padre_id FROM public.almacenes
  UNION ALL SELECT 'estanteria','EST',id,codigo,almacen_id FROM public.estanterias
  UNION ALL SELECT 'nivel','NIV',id,codigo,estanteria_id FROM public.niveles_estanteria
  UNION ALL SELECT 'caja','CAJ',id,codigo,coalesce(nivel_id,'SIN-NIVEL:'||estanteria_id) FROM public.cajas
), parsed AS (
  SELECT *,substring(substring(codigo from '^[[:space:]]*([^[:space:]]+)') from '([0-9]+)[^0-9]*$')::numeric AS numero FROM locations
), planned AS (
  SELECT *,CASE WHEN numero BETWEEN 0 AND 999999999999
    THEN prefijo||lpad(numero::bigint::text,greatest(3,length(numero::bigint::text)),'0') END AS codigo_propuesto FROM parsed
)
SELECT tipo,id,padre_id,codigo AS codigo_actual,numero,codigo_propuesto,
  max(numero) OVER (PARTITION BY tipo) AS mayor_numero_del_tipo,
  CASE WHEN numero IS NULL THEN 'Recibirá un consecutivo nuevo sobre el mayor reservado'
    WHEN codigo_propuesto IS NULL THEN 'REVISAR: número fuera de límite'
    WHEN count(*) OVER (PARTITION BY tipo,padre_id,codigo_propuesto)>1 THEN 'REVISAR: coincidencia en el mismo padre'
    ELSE 'Conserva el número' END AS resultado
FROM planned ORDER BY tipo,numero NULLS LAST,padre_id,id;

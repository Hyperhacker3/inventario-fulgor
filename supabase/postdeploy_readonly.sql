-- Verificación de producción. Todas las sentencias son SELECT; no modifican datos.
-- En Supabase SQL Editor, seleccione y ejecute cada bloque por separado.
-- No exporte el resultado con los nombres de productos al repositorio.

-- 1. Resumen del catálogo. El total activo esperado al inicio es 677;
--    cinco filas deben tener stock pendiente y 25 cantidad decimal.
SELECT
  count(*) FILTER (WHERE NOT archived) AS productos_activos,
  count(*) FILTER (WHERE archived) AS productos_archivados,
  count(*) FILTER (WHERE NOT archived AND stock_pendiente) AS stock_pendiente,
  count(*) FILTER (WHERE NOT archived AND cantidad <> trunc(cantidad)) AS stocks_decimales,
  count(*) FILTER (WHERE NOT archived AND almacen_id IS NULL) AS sin_almacen,
  count(*) FILTER (WHERE NOT archived AND estanteria_id IS NULL) AS sin_estanteria,
  count(*) FILTER (WHERE NOT archived AND caja_id IS NULL) AS sin_caja,
  count(*) FILTER (WHERE cantidad < 0 OR stock_minimo < 0 OR cantidad_danados < 0) AS cantidades_invalidas
FROM public.elementos;

-- 2. Solo los cinco artículos cuyo stock requiere verificación física.
--    La entrada y salida originales del Excel sirven como referencia,
--    pero no sustituyen el conteo físico ni autorizan un ajuste automático.
SELECT codigo, nombre, cantidad, unidad,
       especificaciones ->> 'fila_excel' AS fila_excel,
       especificaciones ->> 'entrada_excel' AS entrada_excel,
       especificaciones ->> 'salida_excel' AS salida_excel,
       especificaciones ->> 'stock_excel' AS stock_excel
FROM public.elementos
WHERE NOT archived AND stock_pendiente
ORDER BY codigo;

-- 3. Los códigos activos deben ser únicos; la consulta debe devolver 0 filas.
SELECT codigo, count(*) AS repeticiones
FROM public.elementos
WHERE NOT archived
GROUP BY codigo
HAVING count(*) > 1;

-- 4. RLS debe estar habilitado en todas las tablas operativas.
SELECT relname AS tabla, relrowsecurity AS rls_habilitado
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('almacenes', 'estanterias', 'cajas', 'proyectos',
                  'elementos', 'remisiones', 'historial')
ORDER BY relname;

-- 5. Las fotografías deben estar en un bucket privado.
SELECT id AS bucket, public AS acceso_publico
FROM storage.buckets
WHERE id = 'item-images';

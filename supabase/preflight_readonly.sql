-- Ejecute en la base que pretende migrar. Solo realiza consultas.
-- Guarde los resultados en un lugar privado y compare con el respaldo.

SELECT current_database() AS database_name, current_user AS executing_role, now() AS checked_at;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial')
ORDER BY table_name, ordinal_position;

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial')
ORDER BY tablename, policyname;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial')
  AND grantee IN ('PUBLIC','anon','authenticated')
ORDER BY table_name, grantee, privilege_type;

SELECT 'almacenes' AS entity, count(*) AS rows FROM public.almacenes
UNION ALL SELECT 'estanterias', count(*) FROM public.estanterias
UNION ALL SELECT 'cajas', count(*) FROM public.cajas
UNION ALL SELECT 'proyectos', count(*) FROM public.proyectos
UNION ALL SELECT 'elementos', count(*) FROM public.elementos
UNION ALL SELECT 'remisiones', count(*) FROM public.remisiones
UNION ALL SELECT 'historial', count(*) FROM public.historial;

SELECT id, codigo, nombre, cantidad, unidad, almacen_id
FROM public.elementos WHERE codigo = 'EST001' OR id = 'ELM-0018'
ORDER BY codigo, id;

SELECT count(*) AS negative_stock_rows FROM public.elementos WHERE cantidad < 0 OR stock_minimo < 0;

SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename IN ('almacenes','estanterias','cajas','proyectos','elementos','remisiones','historial')
ORDER BY pubname, tablename;

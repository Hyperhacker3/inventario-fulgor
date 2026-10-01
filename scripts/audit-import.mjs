import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const sourcePath = process.env.FULGOR_IMPORT_JSON || '.private_import/items_verified.json';
const reportDir = process.env.FULGOR_IMPORT_REPORT_DIR || 'reports';
const pendingLocationsPath = process.env.FULGOR_IMPORT_REPORT_DIR
  ? join(reportDir, 'import-pending-locations.csv') : '.private_import/import-pending-locations.csv';
const replaceTestData = process.argv.includes('--replace-test-data');
const sqlPath = process.env.FULGOR_IMPORT_SQL_PATH ||
  (replaceTestData ? 'supabase/generated/replace_test_inventory.sql' : 'supabase/generated/import_items.sql');
const items = JSON.parse(readFileSync(sourcePath, 'utf8'));
const validQuantity = value => Number.isFinite(value) && value >= 0 &&
  Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7;
const codes = new Set();
const ids = new Set();
const errors = [];
const categories = {};
const units = {};
const warehouses = {};
const pendingLocations = [];
const knownWarehouses = new Set(['ALM-BOG-01', 'ALM-MED-02', 'ALM-CAL-03']);
const seedSection = readFileSync('supabase_schema.sql', 'utf8').split('INSERT INTO public.elementos ')[1]?.split('ON CONFLICT')[0] || '';
const seedRows = [...seedSection.matchAll(/\('([^']+)',\s*'([^']+)',\s*'((?:[^']|'')*)'/g)]
  .map(([, id, codigo, nombre]) => ({ id, codigo, nombre: nombre.replaceAll("''", "'") }));
const seedByCode = new Map(seedRows.map(row => [row.codigo, row]));
const seedById = new Map(seedRows.map(row => [row.id, row]));
const seedConflicts = [];
for (const [index, item] of items.entries()) {
  const ref = `${index + 1} (${item.codigo || 'sin código'})`;
  if (!item.codigo || !item.nombre || !item.id) errors.push(`${ref}: faltan campos obligatorios`);
  if (codes.has(item.codigo)) errors.push(`${ref}: código duplicado`);
  if (ids.has(item.id)) errors.push(`${ref}: ID duplicado`);
  codes.add(item.codigo); ids.add(item.id);
  if (!validQuantity(item.cantidad)) errors.push(`${ref}: cantidad inválida`);
  if (!validQuantity(item.stock_minimo)) errors.push(`${ref}: stock mínimo inválido`);
  if (item.stock_pendiente && item.cantidad !== 0) errors.push(`${ref}: stock pendiente debe iniciar en cero`);
  if (!knownWarehouses.has(item.almacen_id)) errors.push(`${ref}: almacén inexistente`);
  if (item.estanteria_id || item.caja_id) errors.push(`${ref}: estantería/caja sin conciliación manual`);
  categories[item.categoria] = (categories[item.categoria] || 0) + 1;
  units[item.unidad] = (units[item.unidad] || 0) + 1;
  warehouses[item.almacen_id] = (warehouses[item.almacen_id] || 0) + 1;
  if (item.especificaciones?.contenedor || item.especificaciones?.caja_costal)
    pendingLocations.push({ codigo: item.codigo, almacenId: item.almacen_id,
      contenedor: item.especificaciones.contenedor || '', cajaCostal: item.especificaciones.caja_costal || '' });
  const conflict = seedByCode.get(item.codigo) || seedById.get(item.id);
  if (conflict && (conflict.id !== item.id || conflict.codigo !== item.codigo))
    seedConflicts.push({ codigo: item.codigo, importedId: item.id, importedName: item.nombre,
      existingId: conflict.id, existingCode: conflict.codigo, existingName: conflict.nombre });
}
const report = { total: items.length, uniqueCodes: codes.size, categories, units, warehouses,
  decimalStockCount: items.filter(item => !Number.isInteger(item.cantidad)).length,
  pendingStockCount: items.filter(item => item.stock_pendiente).length,
  pendingLocationCount: pendingLocations.length, seedConflicts, errors };
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'import-audit.json'), JSON.stringify(report, null, 2) + '\n');
const csvCell = value => {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};
mkdirSync(dirname(pendingLocationsPath), { recursive: true });
writeFileSync(pendingLocationsPath, [
  'codigo,almacenId,contenedor,cajaCostal',
  ...pendingLocations.map(row => [row.codigo, row.almacenId, row.contenedor, row.cajaCostal].map(csvCell).join(',')),
].join('\n') + '\n');
process.stdout.write(`Auditados ${items.length} artículos; ${errors.length} errores de origen; ${seedConflicts.length} conflictos con semillas; ${pendingLocations.length} ubicaciones pendientes.\n`);
if (errors.length) process.exitCode = 1;

if (process.argv.includes('--sql') && errors.length === 0) {
  const q = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
  const columns = ['id', 'codigo', 'nombre', 'categoria', 'cantidad', 'stock_minimo', 'unidad', 'almacen_id',
    'estanteria_id', 'caja_id', 'descripcion', 'especificaciones', 'stock_pendiente'];
  const values = items.map(item => `(${columns.map(column =>
    column === 'cantidad' || column === 'stock_minimo' ? String(item[column]) :
      column === 'stock_pendiente' ? String(Boolean(item[column])) :
        column === 'especificaciones' ? `${q(JSON.stringify(item[column] || {}))}::jsonb` : q(item[column])).join(', ')})`);
  const columnList = columns.join(', ');
  const reset = replaceTestData ? `-- Reinicia exclusivamente las tablas de inventario Fulgor. La transacción revierte todo si falla.\n` +
    `DO $$ BEGIN\n` +
    `  IF (SELECT count(*) FROM public.almacenes) <> 3 OR\n` +
    `     (SELECT count(*) FROM public.cajas) <> 3 OR\n` +
    `     (SELECT count(*) FROM public.elementos) <> 674 OR\n` +
    `     (SELECT count(*) FROM public.estanterias) <> 4 OR\n` +
    `     (SELECT count(*) FROM public.historial) <> 20 OR\n` +
    `     (SELECT count(*) FROM public.proyectos) <> 4 OR\n` +
    `     (SELECT count(*) FROM public.remisiones) <> 1 OR\n` +
    `     NOT EXISTS (SELECT 1 FROM public.elementos WHERE id = 'ELM-0018' AND codigo = 'EST001') THEN\n` +
    `    RAISE EXCEPTION 'La base cambió desde la revisión; no se borró ningún dato';\n` +
    `  END IF;\n` +
    `END $$;\n` +
    `TRUNCATE TABLE public.historial, public.remisiones, public.elementos, public.cajas,\n` +
    `  public.estanterias, public.proyectos, public.almacenes, public.remision_consecutivos;\n` : '';
  const sql = `-- Generated from the verified Excel extraction. Review backup before use.\n` +
    (replaceTestData ? `-- Los 674 artículos y registros de prueba existentes se reemplazan por 677 del Excel.\n` :
      `-- Repeated imports skip matching identity, preserving operational stock. Conflicting keys or identity abort.\n`) +
    `BEGIN;\n${reset}` +
    `INSERT INTO public.almacenes (id, nombre, codigo) VALUES\n` +
    `  ('ALM-BOG-01', 'Bodega Bogotá', 'BOG-01'),\n` +
    `  ('ALM-MED-02', 'Bodega Medellín', 'MED-02'),\n` +
    `  ('ALM-CAL-03', 'Bodega Cali', 'CAL-03')\nON CONFLICT (id) DO NOTHING;\n` +
    `CREATE TEMP TABLE fulgor_import_stage ON COMMIT DROP AS SELECT ${columnList} FROM public.elementos WITH NO DATA;\n` +
    `INSERT INTO fulgor_import_stage (${columnList}) VALUES\n${values.join(',\n')};\n` +
    `DO $$ BEGIN\n` +
    `  IF EXISTS (SELECT 1 FROM fulgor_import_stage AS source JOIN public.elementos AS existing\n` +
    `    ON existing.id = source.id OR existing.codigo = source.codigo\n` +
    `    WHERE existing.id <> source.id OR existing.codigo <> source.codigo) THEN\n` +
    `    RAISE EXCEPTION 'Conflicto de ID o código: concilie el inventario antes de importar';\n` +
    `  END IF;\nEND $$;\n` +
    `DO $$ BEGIN\n` +
    `  IF EXISTS (SELECT 1 FROM fulgor_import_stage AS source JOIN public.elementos AS existing\n` +
    `    ON existing.id = source.id AND existing.codigo = source.codigo\n` +
    `    WHERE existing.nombre IS DISTINCT FROM source.nombre\n` +
    `       OR existing.categoria IS DISTINCT FROM source.categoria\n` +
    `       OR existing.unidad IS DISTINCT FROM source.unidad) THEN\n` +
    `    RAISE EXCEPTION 'Artículo existente con identidad distinta: revise nombre, categoría y unidad';\n` +
    `  END IF;\nEND $$;\n` +
    `WITH inserted AS (INSERT INTO public.elementos (${columnList})\n` +
    `  SELECT ${columns.map(column => `source.${column}`).join(', ')} FROM fulgor_import_stage AS source\n` +
    `  WHERE NOT EXISTS (SELECT 1 FROM public.elementos AS existing\n` +
    `    WHERE existing.id = source.id AND existing.codigo = source.codigo) RETURNING id)\n` +
    `SELECT count(*) AS inserted_count, (SELECT count(*) FROM fulgor_import_stage) AS source_count FROM inserted;\n` +
    (replaceTestData ? `DO $$ BEGIN\n` +
      `  IF (SELECT count(*) FROM public.elementos) <> ${items.length} OR\n` +
      `     (SELECT count(*) FROM public.elementos WHERE stock_pendiente) <> ${report.pendingStockCount} OR\n` +
      `     (SELECT count(*) FROM public.elementos WHERE cantidad <> trunc(cantidad)) <> ${report.decimalStockCount} THEN\n` +
      `    RAISE EXCEPTION 'La importación no coincide con el inventario conciliado';\n` +
      `  END IF;\nEND $$;\n` : '') + `COMMIT;\n`;
  mkdirSync(dirname(sqlPath), { recursive: true });
  writeFileSync(sqlPath, sql);
  process.stdout.write(`SQL preparado en ${sqlPath} (sin ejecutar).\n`);
}

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseSql = fs.readFileSync(new URL('../../supabase_schema.sql', import.meta.url), 'utf8')
  .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/, '')
  .replace(/^ALTER PUBLICATION.*$/gm, '');
const migration = fs.readFileSync(new URL('../../supabase/migrations/20261001_secure_inventory.sql', import.meta.url), 'utf8');
const preflightSql = fs.readFileSync(new URL('../../supabase/preflight_readonly.sql', import.meta.url), 'utf8');
const reportDir = '.cache/import-test';

test('Excel import SQL rejects collisions, preserves decimals and pending stock, and is repeatable', async () => {
  execFileSync(process.execPath, ['scripts/audit-import.mjs', '--sql'], { cwd: root,
    env: { ...process.env, FULGOR_IMPORT_JSON: 'tests/fixtures/import-items.json',
      FULGOR_IMPORT_REPORT_DIR: reportDir, FULGOR_IMPORT_SQL_PATH: `${reportDir}/import_items.sql` } });
  const audit = JSON.parse(fs.readFileSync(new URL('../../.cache/import-test/import-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.total, 3);
  assert.equal(audit.decimalStockCount, 1);
  assert.equal(audit.pendingStockCount, 1);
  assert.equal(audit.errors.length, 0);
  assert.deepEqual(audit.seedConflicts, []);
  const csv = fs.readFileSync(new URL('../../.cache/import-test/import-pending-locations.csv', import.meta.url), 'utf8');
  assert.equal(csv.trimEnd().split('\n').length, 4);
  const sql = fs.readFileSync(new URL('../../.cache/import-test/import_items.sql', import.meta.url), 'utf8');

  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
        SELECT jsonb_build_object('app_metadata', jsonb_build_object('role', 'admin')) $$;`);
    await db.exec(baseSql);
    await db.exec(preflightSql);
    await db.exec(migration);
    await db.exec("INSERT INTO public.elementos(id,codigo,nombre,categoria,cantidad,unidad) VALUES ('ELM-OLD','TST001','Registro incompatible','ACCESORIOS',1,'UND');");
    await assert.rejects(() => db.exec(sql), /Conflicto de ID o código/);
    await db.exec('ROLLBACK;');
    assert.equal((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n, 1);

    await db.exec("DELETE FROM public.elementos WHERE id = 'ELM-OLD';");
    await db.exec(sql);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n, 3);
    const cable = (await db.query("SELECT cantidad FROM public.elementos WHERE codigo = 'TST002'")).rows[0];
    assert.equal(Number(cable.cantidad), 6.3);
    const pending = (await db.query("SELECT cantidad,stock_pendiente FROM public.elementos WHERE codigo = 'TST003'")).rows[0];
    assert.equal(Number(pending.cantidad), 0);
    assert.equal(pending.stock_pendiente, true);

    await db.exec(`CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
      SELECT jsonb_build_object('app_metadata', jsonb_build_object('role', current_setting('app.test_role', true))) $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO authenticated;
      SELECT set_config('app.test_role','operador',false); SET ROLE authenticated;`);
    const movement = 'SELECT public.record_inventory_movement($1::uuid,$2,$3,$4::numeric,$5) AS value';
    await assert.rejects(() => db.query(movement,
      ['05b42cb3-b6da-4cfb-8a80-37617f88cce7', 'ELM-TEST-3', 'AJUSTE', 0, 'Revisado']),
    /stock pendiente requiere un ajuste de administración/);
    await db.exec("RESET ROLE; SELECT set_config('app.test_role','admin',false); SET ROLE authenticated;");
    await db.query(movement,
      ['05b42cb3-b6da-4cfb-8a80-37617f88cce7', 'ELM-TEST-3', 'AJUSTE', 0, 'Revisado']);
    await db.exec('RESET ROLE;');
    assert.equal((await db.query("SELECT stock_pendiente FROM public.elementos WHERE codigo = 'TST003'")).rows[0].stock_pendiente, false);

    await db.exec("UPDATE public.elementos SET cantidad = 9.5 WHERE codigo = 'TST002';");
    await db.exec(sql);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n, 3);
    assert.equal(Number((await db.query("SELECT cantidad FROM public.elementos WHERE codigo = 'TST002'")).rows[0].cantidad), 9.5);
    await db.exec("UPDATE public.elementos SET nombre = 'Otro producto' WHERE codigo = 'TST002';");
    await assert.rejects(() => db.exec(sql), /Artículo existente con identidad distinta/);
    await db.exec('ROLLBACK;');
  } finally { await db.close(); }
});

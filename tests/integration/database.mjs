import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const baseSql = fs.readFileSync(new URL('../../supabase_schema.sql', import.meta.url), 'utf8')
  .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/, '')
  .replace(/^ALTER PUBLICATION.*$/gm, '');
const migration = fs.readFileSync(new URL('../../supabase/migrations/20261001_secure_inventory.sql', import.meta.url), 'utf8');
const demoSeed = fs.readFileSync(new URL('../fixtures/demo_seed.sql', import.meta.url), 'utf8');

async function database() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
      SELECT jsonb_build_object('app_metadata', jsonb_build_object('role', current_setting('app.test_role', true)),
        'user_metadata', jsonb_build_object('name', 'Operador de prueba')) $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO authenticated;`);
  await db.exec(baseSql);
  await db.exec(migration);
  await db.exec(demoSeed);
  return db;
}

const role = (db, value) => db.exec(`SELECT set_config('app.test_role','${value}',false); SET ROLE authenticated;`);
const asOwner = db => db.exec('RESET ROLE;');
const itemStock = async db => Number((await db.query("SELECT cantidad FROM public.elementos WHERE id = 'ELM-001'")).rows[0].cantidad);

test('security migration refuses unknown RLS policies', async () => {
  const db = new PGlite();
  try {
    await db.exec(baseSql);
    await db.exec('CREATE POLICY unexpected_public_read ON public.elementos FOR SELECT USING (true);');
    await assert.rejects(() => db.exec(migration), /Revise políticas RLS no reconocidas/);
  } finally { await db.close(); }
});

test('RLS denies anonymous reads and consulta writes', async () => {
  const db = await database();
  try {
    await db.exec('SET ROLE anon;');
    await assert.rejects(() => db.query('SELECT * FROM public.elementos'), /permission denied/);
    await asOwner(db);
    await role(db, 'consulta');
    assert.equal((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n, 8);
    await assert.rejects(() => db.query("SELECT public.create_inventory_item('{}'::jsonb)"), /No autorizado/);
    await asOwner(db);
    await role(db, 'sin-rol');
    assert.equal((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n, 0);
  } finally { await db.close(); }
});

test('dispatch is atomic, idempotent and checks stock', async () => {
  const db = await database();
  try {
    await role(db, 'operador');
    const request = 'c5177bb4-75e5-4ef5-8dc6-a767c2f456a0';
    const payload = [request, 'PROY-001', 'Bodega', 'Operador', 'Obra', 'Residente', '', JSON.stringify([{ elementoId: 'ELM-001', cantidad: 8 }])];
    const sql = 'SELECT public.dispatch_inventory($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb) AS rem';
    const first = (await db.query(sql, payload)).rows[0].rem;
    assert.match(first.numero_remision, /^REM-[0-9]{4}-0001$/);
    assert.equal(await itemStock(db), 176);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.historial')).rows[0].n, 1);
    assert.equal((await db.query('SELECT proyecto_nombre FROM public.historial LIMIT 1')).rows[0].proyecto_nombre,
      first.proyecto_nombre);
    const repeat = (await db.query(sql, payload)).rows[0].rem;
    assert.equal(repeat.id, first.id);
    assert.equal(await itemStock(db), 176);
    const changed = [...payload]; changed[7] = JSON.stringify([{ elementoId: 'ELM-001', cantidad: 1 }]);
    await assert.rejects(() => db.query(sql, changed), /otro contenido o usuario/);
    const invalid = [...payload]; invalid[0] = '83348f34-daa9-4c3a-86c1-e71829344900';
    invalid[7] = JSON.stringify([{ elementoId: 'ELM-001', cantidad: 177 }]);
    await assert.rejects(() => db.query(sql, invalid), /Stock no disponible/);
    assert.equal(await itemStock(db), 176);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.remisiones')).rows[0].n, 1);
  } finally { await db.close(); }
});

test('movement is idempotent; admin item creation records opening balance', async () => {
  const db = await database();
  try {
    await role(db, 'operador');
    const request = '05b42cb3-b6da-4cfb-8a80-37617f88cce7';
    const sql = 'SELECT public.record_inventory_movement($1::uuid,$2,$3,$4::numeric,$5) AS movement';
    const args = [request, 'ELM-001', 'AJUSTE', -4, 'Conteo'];
    const first = (await db.query(sql, args)).rows[0].movement;
    assert.equal(first.stock_nuevo, 180);
    assert.equal((await db.query(sql, args)).rows[0].movement.id, first.id);
    assert.equal(await itemStock(db), 180);
    await assert.rejects(() => db.query(sql, [request, 'ELM-001', 'AJUSTE', -2, 'Conteo']), /otro contenido o usuario/);
    await asOwner(db); await role(db, 'admin');
    await assert.rejects(() => db.query("UPDATE public.elementos SET cantidad = 999 WHERE id = 'ELM-001'"), /permission denied/);
    await assert.rejects(() => db.query("INSERT INTO public.elementos(id,codigo,nombre,categoria) VALUES ('x','x','x','PANELES')"), /permission denied/);
    const input = JSON.stringify({ codigo: 'NUE001', nombre: 'Nuevo panel', categoria: 'PANELES', cantidad: 4,
      stock_minimo: 0, unidad: 'UND', almacen_id: 'ALM-BOG-01', estanteria_id: 'EST-A01', cantidad_danados: 0 });
    const result = (await db.query('SELECT public.create_inventory_item($1::jsonb) AS item', [input])).rows[0].item;
    assert.equal(result.codigo, 'NUE001');
    assert.match(result.id, /^ELM-/);
    const history = await db.query('SELECT stock_anterior,stock_nuevo FROM public.historial WHERE elemento_id = $1', [result.id]);
    assert.deepEqual(history.rows[0], { stock_anterior: '0.000', stock_nuevo: '4.000' });
    const badLocation = JSON.stringify({ ...JSON.parse(input), codigo: 'NUE002', almacen_id: 'ALM-MED-02' });
    await assert.rejects(() => db.query('SELECT public.create_inventory_item($1::jsonb)', [badLocation]), /Estantería fuera del almacén/);
  } finally { await db.close(); }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const baseSql = fs.readFileSync(new URL('../../supabase_schema.sql', import.meta.url), 'utf8')
  .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/, '')
  .replace(/^ALTER PUBLICATION.*$/gm, '');
const migration = fs.readFileSync(new URL('../../supabase/migrations/20261001_secure_inventory.sql', import.meta.url), 'utf8');
const transportMigration = fs.readFileSync(new URL('../../supabase/migrations/20261005_remission_transport.sql', import.meta.url), 'utf8');
const unitWeightMigration = fs.readFileSync(new URL('../../supabase/migrations/20261005000100_unit_weights.sql', import.meta.url), 'utf8');
const catalogMigration = fs.readFileSync(new URL('../../supabase/migrations/20261006000100_data_administration.sql', import.meta.url), 'utf8');
const archivedMigration = fs.readFileSync(new URL('../../supabase/migrations/20261006000200_archived_inventory.sql', import.meta.url), 'utf8');
const outgoingPhotoMigration = fs.readFileSync(new URL('../../supabase/migrations/20261006000300_outgoing_photos.sql', import.meta.url), 'utf8');
const locationMigration = fs.readFileSync(new URL('../../supabase/migrations/20261006000400_item_locations.sql', import.meta.url), 'utf8');
const valueMigration = fs.readFileSync(new URL('../../supabase/migrations/20261006000500_inventory_values.sql', import.meta.url), 'utf8');
const levelsMigration = fs.readFileSync(new URL('../../supabase/migrations/20261006000600_storage_levels_and_brands.sql', import.meta.url), 'utf8');
const companyMigration = fs.readFileSync(new URL('../../supabase/migrations/20261007000100_company_profile.sql', import.meta.url), 'utf8');
const demoSeed = fs.readFileSync(new URL('../fixtures/demo_seed.sql', import.meta.url), 'utf8');
const postdeployAudit = fs.readFileSync(new URL('../../supabase/postdeploy_readonly.sql', import.meta.url), 'utf8');
const warehouseProfile = fs.readFileSync(new URL('../../supabase/configure_warehouse_profile.sql', import.meta.url), 'utf8');

async function database({ company = true } = {}) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
      SELECT jsonb_build_object('app_metadata', jsonb_build_object('role', current_setting('app.test_role', true)),
        'user_metadata', jsonb_build_object('name', 'Operador de prueba')) $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO authenticated;`);
  await db.exec(`CREATE SCHEMA storage;
    CREATE TABLE storage.objects(bucket_id text, name text, PRIMARY KEY(bucket_id,name));
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`);
  await db.exec(baseSql);
  await db.exec(migration);
  await db.exec(transportMigration);
  await db.exec(unitWeightMigration);
  await db.exec(demoSeed);
  await db.exec(catalogMigration);
  await db.exec(archivedMigration);
  await db.exec(outgoingPhotoMigration);
  await db.exec(locationMigration);
  await db.exec(valueMigration);
  await db.exec(levelsMigration);
  if (company) await db.exec(companyMigration);
  return db;
}

const role = (db, value) => db.exec(`SELECT set_config('app.test_role','${value}',false); SET ROLE authenticated;`);
const asOwner = db => db.exec('RESET ROLE;');
const itemStock = async db => Number((await db.query("SELECT cantidad FROM public.elementos WHERE id = 'ELM-001'")).rows[0].cantidad);

test('company data is shared with authenticated inventory roles, writable only by admin and protected from stale edits', async () => {
  const db = await database();
  const read = async () => (await db.query('SELECT public.inventory_company_profile() AS data')).rows[0].data;
  const save = async (profile, version) => (await db.query('SELECT public.save_inventory_company_profile($1::jsonb,$2) AS data',[JSON.stringify(profile),version])).rows[0].data;
  try {
    await db.exec('SET ROLE anon'); await assert.rejects(read, /permission denied/); await asOwner(db);
    await role(db,'consulta'); const original = await read(); assert.equal(original.perfil.nit,'800.176.581');
    const profile = {...original.perfil,nombre:'Empresa compartida',direccion:'Calle 10',telefono:'+57 123'};
    await assert.rejects(() => save(profile,original.version), /No autorizado/);
    await assert.rejects(() => db.query('SELECT * FROM public.inventario_empresa'), /permission denied/);
    await asOwner(db); await role(db,'operador'); await assert.rejects(() => save(profile,original.version), /No autorizado/);
    await asOwner(db); await role(db,'admin'); const updated = await save(profile,original.version);
    assert.equal(updated.version,original.version+1); assert.deepEqual(updated.perfil,profile);
    await assert.rejects(() => save({...profile,nombre:'Borrador antiguo'},original.version), /cambiaron/);
    assert.deepEqual(await read(),updated);
    await asOwner(db); await role(db,'consulta'); assert.deepEqual(await read(),updated);
    await asOwner(db); await role(db,''); await assert.rejects(read, /No autorizado/);
  } finally { await db.close(); }
});

test('company input rejects invalid names, NIT, image sources and sizes without changing the saved profile', async () => {
  const db = await database();
  try {
    await role(db,'admin'); const original = (await db.query('SELECT public.inventory_company_profile() AS data')).rows[0].data;
    for (const patch of [{nombre:''},{nombre:'x'.repeat(121)},{nit:'abc'},{nit:123},{direccion:'x'.repeat(241)},{telefono:'x'.repeat(61)},
      {logo:'https://external.example/logo.png'},{logo:'data:image/svg+xml;base64,PHN2Zz4='},{logo:'data:image/png;base64,'+'A'.repeat(160000)}]) {
      await assert.rejects(() => db.query('SELECT public.save_inventory_company_profile($1::jsonb,$2)',[JSON.stringify({...original.perfil,...patch}),original.version]));
    }
    assert.deepEqual((await db.query('SELECT public.inventory_company_profile() AS data')).rows[0].data,original);
    const profile = {...original.perfil,nombre:'  Empresa   nueva ',logo:'data:image/png;base64,iVBORw0KGgo='};
    const saved = (await db.query('SELECT public.save_inventory_company_profile($1::jsonb,$2) AS data',[JSON.stringify(profile),original.version])).rows[0].data;
    assert.equal(saved.perfil.nombre,'Empresa nueva'); assert.equal(saved.perfil.logo,profile.logo);
  } finally { await db.close(); }
});

test('company migration preserves stock and historic documents while new dispatches capture immutable company data and retries retain it', async () => {
  const db = await database({company:false});
  const sql = 'SELECT public.dispatch_inventory_with_photos($1::uuid,\'PROY-001\',\'Entrega\',\'Admin\',\'Recibe\',\'Residente\',\'\',\'[ {"elementoId":"ELM-001","cantidad":1} ]\'::jsonb,\'{}\'::jsonb,\'[]\'::jsonb) AS data';
  const dispatch = async id => (await db.query(sql,[id])).rows[0].data;
  try {
    await role(db,'admin'); const legacy = await dispatch('f254c9e8-f689-4258-bd8e-cf129960d8a9');
    const stock = await itemStock(db); await asOwner(db); await db.exec(companyMigration);
    assert.equal(await itemStock(db),stock);
    const historical = (await db.query('SELECT * FROM public.remisiones WHERE id=$1',[legacy.id])).rows[0];
    assert.equal(historical.empresa.nit,'800.176.581'); assert.deepEqual(historical.items,legacy.items);
    await role(db,'admin'); const first = await dispatch('fbc86d0b-d4b2-4baf-a3b7-7b728e13b21d');
    const original = (await db.query('SELECT public.inventory_company_profile() AS data')).rows[0].data;
    const next = {...original.perfil,nombre:'Empresa nueva',nit:'900.123.456-1',direccion:'Calle 20',telefono:'555 1234',logo:'data:image/png;base64,iVBORw0KGgo='};
    await db.query('SELECT public.save_inventory_company_profile($1::jsonb,$2)',[JSON.stringify(next),original.version]);
    const retry = await dispatch('fbc86d0b-d4b2-4baf-a3b7-7b728e13b21d'); assert.deepEqual(retry.empresa,first.empresa);
    const second = await dispatch('e94b2bf5-833e-45a4-8f31-3d1ce1c9d7c1'); assert.deepEqual(second.empresa,next);
    await asOwner(db); await assert.rejects(() => db.query('UPDATE public.remisiones SET empresa=$1::jsonb WHERE id=$2',[JSON.stringify(next),first.id]),/no se puede modificar/);
    const forged = (await db.query(`INSERT INTO public.remisiones(id,numero_remision,fecha,proyecto_nombre,cliente,entregado_por,cargo_entregado,recibido_por,cargo_recibido,empresa)
      VALUES('forged-company','REM-TEST-COMPANY','2026-10-07','Proyecto','Cliente','Entrega','Admin','Recibe','','{"nombre":"Falsa"}'::jsonb) RETURNING empresa`)).rows[0].empresa;
    assert.deepEqual(forged,next);
    const finalStock = await itemStock(db); await db.exec(companyMigration); assert.equal(await itemStock(db),finalStock);
    assert.deepEqual((await db.query('SELECT empresa FROM public.remisiones WHERE id=$1',[first.id])).rows[0].empresa,first.empresa);
    assert.deepEqual((await db.query('SELECT perfil FROM public.inventario_empresa')).rows[0].perfil,next);
  } finally { await db.close(); }
});

test('warehouse profile corrects only the selected author, preserves permissions and document snapshots, and can be rerun', async () => {
  const db = await database();
  try {
    await db.exec(`CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb,updated_at timestamptz);
      INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001','login@example.test','{"role":"admin","provider":"email"}','{"name":"login@example.test","other":"keep"}',now());
      INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000002','other@example.test','{"role":"operador"}','{"name":"Otra persona"}',now());`);
    await role(db, 'admin');
    const remit = (await db.query(`SELECT public.dispatch_inventory_with_photos($1::uuid,'PROY-001',$2,'admin','Recibe','Residente','',
      '[{"elementoId":"ELM-001","cantidad":1}]'::jsonb,'{}'::jsonb,'[]'::jsonb) AS result`, ['72664845-8c94-4606-97ab-3d944077b6d8', 'login@example.test'])).rows[0].result;
    await asOwner(db);
    await db.query("UPDATE public.historial SET responsable='login@example.test' WHERE remision_id=$1", [remit.id]);
    const stock = await itemStock(db);
    await db.exec(warehouseProfile);
    const account = (await db.query("SELECT * FROM auth.users WHERE email='login@example.test'")).rows[0];
    assert.deepEqual(account.raw_app_meta_data, {role:'admin', provider:'email'});
    assert.deepEqual(account.raw_user_meta_data, {name:'Andrés Castañeda',cargo:'Almacenista',other:'keep'});
    assert.equal((await db.query("SELECT raw_user_meta_data->>'name' AS name FROM auth.users WHERE email='other@example.test'")).rows[0].name,'Otra persona');
    const saved = (await db.query('SELECT * FROM public.remisiones WHERE id=$1',[remit.id])).rows[0];
    assert.equal(saved.entregado_por,'Andrés Castañeda'); assert.equal(saved.cargo_entregado,'Almacenista');
    assert.equal(saved.recibido_por,'Recibe'); assert.deepEqual(saved.items,remit.items);
    assert.equal((await db.query('SELECT responsable FROM public.historial WHERE remision_id=$1',[remit.id])).rows[0].responsable,'Andrés Castañeda');
    assert.equal(await itemStock(db),stock);
    await db.exec(warehouseProfile); assert.equal(await itemStock(db),stock);
  } finally { await db.close(); }
});

test('warehouse profile refuses ambiguous administrators without changing another account', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
      INSERT INTO auth.users VALUES ('one@example.test','{"role":"admin"}','{"name":"Uno"}'),('two@example.test','{"role":"admin"}','{"name":"Dos"}');`);
    await assert.rejects(() => db.exec(warehouseProfile), /única cuenta administradora/);
    await db.exec('ROLLBACK');
    assert.deepEqual((await db.query("SELECT raw_user_meta_data->>'name' AS name FROM auth.users ORDER BY email")).rows.map(row=>row.name),['Uno','Dos']);
  } finally { await db.close(); }
});

test('unit values start at zero, reject invalid prices, persist in automatic creation and snapshot authoritative COP costs', async () => {
  const db = await database();
  try {
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM public.elementos WHERE especificaciones->>'valor_unitario_cop'<>'0'")).rows[0].n), 0);
    await role(db, 'consulta');
    assert.equal((await db.query("UPDATE public.elementos SET especificaciones=especificaciones||'{\"valor_unitario_cop\":100}'::jsonb WHERE id='ELM-001' RETURNING *")).rows.length, 0);
    await asOwner(db); await role(db, 'admin');
    for (const price of [-1, 1.001, 'bad', 10000000000]) {
      await assert.rejects(() => db.query("UPDATE public.elementos SET especificaciones=especificaciones||$1::jsonb WHERE id='ELM-001'", [JSON.stringify({valor_unitario_cop:price})]), /COP/);
    }
    const prefix=(await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data.prefijos.find(row=>row.prefijo==='PAN').id;
    const input={nombre:'Producto con valor',categoria:'PANELES',cantidad:3.5,stock_minimo:0,unidad:'UND',almacen_id:'ALM-BOG-01',cantidad_danados:0,especificaciones:{valor_unitario_cop:12.34}};
    const created=(await db.query('SELECT public.create_inventory_item_auto($1,$2::uuid,$3::jsonb) AS item',[prefix,'952c5929-a55a-4b1c-9e0b-2466aaf59e67',JSON.stringify(input)])).rows[0].item;
    assert.equal(created.especificaciones.valor_unitario_cop,12.34);
    const sql='SELECT public.dispatch_inventory_with_photos($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb) AS remission';
    const args=['fb3e535b-62fa-499d-bb1a-dcc6c6443a5b','PROY-001','Entrega','Admin','Recibe','','',JSON.stringify([{elementoId:created.id,cantidad:3,valorUnitarioCOP:99999,valorTotalCOP:99999}]),'{}','[]'];
    const first=(await db.query(sql,args)).rows[0].remission;
    assert.equal(first.items[0].valorUnitarioCOP,12.34); assert.equal(first.items[0].valorTotalCOP,37.02);
    await db.query("UPDATE public.elementos SET especificaciones=especificaciones||'{\"valor_unitario_cop\":99}'::jsonb WHERE id=$1",[created.id]);
    assert.deepEqual((await db.query(sql,args)).rows[0].remission,first);
    const costs=(await db.query('SELECT * FROM public.inventory_project_spending()')).rows;
    assert.equal(Number(costs.find(row=>row.proyecto_id==='PROY-001').total_cop),37.02);
    assert.equal(Number(costs.find(row=>row.proyecto_id==='PROY-001').salidas),1);
    await asOwner(db); await db.exec(valueMigration);
    assert.equal((await db.query('SELECT especificaciones FROM public.elementos WHERE id=$1',[created.id])).rows[0].especificaciones.valor_unitario_cop,99);
    assert.deepEqual((await db.query('SELECT items FROM public.remisiones WHERE id=$1',[first.id])).rows[0].items,first.items);
  } finally { await db.close(); }
});

test('project spending includes more than 100 outputs, rounds fractional quantities, survives deletion and respects read permissions', async () => {
  const db = await database();
  try {
    await role(db,'admin');
    await db.query("UPDATE public.elementos SET especificaciones=especificaciones||'{\"valor_unitario_cop\":12.34}'::jsonb WHERE id='ELM-001'");
    const sql='SELECT public.dispatch_inventory_with_photos($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb) AS remission';
    for (let i=1;i<=105;i++) {
      const request=`a1000000-0000-4000-8000-${i.toString(16).padStart(12,'0')}`;
      const result=(await db.query(sql,[request,'PROY-001','Entrega','Admin','Recibe','','',JSON.stringify([{elementoId:'ELM-001',cantidad:0.001}]),'{}','[]'])).rows[0].remission;
      assert.equal(result.items[0].valorTotalCOP,0.01);
    }
    await assert.rejects(()=>db.query(sql,['a1000000-0000-4000-8000-000000000200','PROY-001','Entrega','Admin','Recibe','','',JSON.stringify([{elementoId:'ELM-001',cantidad:999}]),'{}','[]']),/Stock no disponible/);
    const cost=async()=> (await db.query('SELECT * FROM public.inventory_project_spending()')).rows.find(row=>row.proyecto_id==='PROY-001');
    assert.equal(Number((await cost()).total_cop),1.05); assert.equal(Number((await cost()).salidas),105);
    await db.query("UPDATE public.elementos SET archived=true WHERE id='ELM-001'"); await db.query("SELECT public.delete_archived_inventory_item('ELM-001')");
    await db.query("UPDATE public.proyectos SET estado='FINALIZADO' WHERE id='PROY-001'");
    assert.equal(Number((await cost()).total_cop),1.05);
    for (const value of ['operador','consulta']) { await asOwner(db); await role(db,value); assert.equal(Number((await cost()).total_cop),1.05); }
    await asOwner(db); await db.exec('SET ROLE anon'); await assert.rejects(()=>db.query('SELECT * FROM public.inventory_project_spending()'),/permission denied/);
  } finally { await db.close(); }
});

test('legacy documents without item IDs are initialized to zero without revaluing them at current product prices', async () => {
  const db = await database();
  try {
    await db.exec('DROP TRIGGER snapshot_inventory_line_values ON public.remisiones; DROP TRIGGER snapshot_inventory_line_brand ON public.remisiones');
    await db.query("INSERT INTO public.remisiones(id,numero_remision,fecha,proyecto_id,proyecto_nombre,cliente,entregado_por,cargo_entregado,recibido_por,cargo_recibido,items) VALUES ('OLD','OLD','2026-10-01','PROY-001','Anterior','Cliente','Entrega','Admin','Recibe','',$1::jsonb)",[JSON.stringify([{codigo:'PAN550',cantidad:4}])]);
    await db.query("UPDATE public.elementos SET especificaciones=especificaciones||'{\"valor_unitario_cop\":1000}'::jsonb WHERE id='ELM-001'");
    await db.exec(valueMigration);
    const old=(await db.query("SELECT items FROM public.remisiones WHERE id='OLD'")).rows[0].items[0];
    assert.equal(old.valorUnitarioCOP,0); assert.equal(old.valorTotalCOP,0);
    assert.equal(Number((await db.query("SELECT total_cop FROM public.inventory_project_spending() WHERE proyecto_id='PROY-001'")).rows[0].total_cop),0);
  } finally { await db.close(); }
});

test('location changes require admin, preserve stock and atomically record the old and new locations', async () => {
  const db = await database();
  try {
    const before = (await db.query("SELECT * FROM public.elementos WHERE id='ELM-001'")).rows[0];
    await db.exec(locationMigration); // Safe to apply again, without touching inventory.
    const count = async () => Number((await db.query("SELECT count(*) AS n FROM public.historial WHERE tipo='REUBICACION' AND elemento_id='ELM-001'")).rows[0].n);
    assert.equal(await count(), 0);
    const move = "UPDATE public.elementos SET almacen_id='ALM-BOG-01',estanteria_id='EST-C03',caja_id='CAJ-A01-01' WHERE id='ELM-001' RETURNING *";
    for (const value of ['operador', 'consulta', '']) {
      await role(db, value); assert.equal((await db.query(move)).rows.length, 0); await asOwner(db);
    }
    await db.exec('SET ROLE anon'); await assert.rejects(() => db.query(move), /permission denied/); await asOwner(db);
    await role(db, 'admin');
    const after = (await db.query(move)).rows[0];
    assert.equal(after.estanteria_id, 'EST-C03'); assert.equal(after.caja_id, 'CAJ-A01-01');
    for (const key of Object.keys(before).filter(key => !['almacen_id', 'estanteria_id', 'caja_id'].includes(key))) assert.deepEqual(after[key], before[key]);
    const audit = (await db.query("SELECT * FROM public.historial WHERE tipo='REUBICACION' AND elemento_id='ELM-001'")).rows[0];
    assert.match(audit.origen_ubicacion, /Paneles/); assert.match(audit.destino_ubicacion, /CAJ-MC4-01/);
    assert.equal(Number(audit.cantidad), 0); assert.equal(Number(audit.stock_anterior), 184); assert.equal(Number(audit.stock_nuevo), 184);
    assert.equal(audit.actor_id, '00000000-0000-0000-0000-000000000001');
    await db.query(move); assert.equal(await count(), 1);
    await db.query("UPDATE public.elementos SET almacen_id=NULL,estanteria_id=NULL,caja_id=NULL WHERE id='ELM-001'");
    assert.equal(await count(), 2); assert.equal(await itemStock(db), 184);
  } finally { await db.close(); }
});

test('invalid and archived relocations roll back metadata and add no movement', async () => {
  const db = await database();
  try {
    await role(db, 'admin');
    const before = (await db.query("SELECT * FROM public.elementos WHERE id='ELM-001'")).rows[0];
    const total = (await db.query('SELECT count(*) AS n FROM public.historial')).rows[0].n;
    for (const [assignment, error] of [
      ["almacen_id='ALM-MED-02'", /estantería no pertenece/],
      ["caja_id='CAJ-A01-01'", /caja no pertenece/],
      ["estanteria_id=NULL,caja_id='CAJ-A01-01'", /caja no pertenece/],
      ["almacen_id=NULL", /estantería no pertenece/],
      ["almacen_id='MISSING'", /Almacén no encontrado/],
    ]) await assert.rejects(() => db.query(`UPDATE public.elementos SET nombre='No guardar',${assignment} WHERE id='ELM-001'`), error);
    assert.deepEqual((await db.query("SELECT * FROM public.elementos WHERE id='ELM-001'")).rows[0], before);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.historial')).rows[0].n, total);
    await db.query("UPDATE public.elementos SET archived=true WHERE id='ELM-001'");
    await assert.rejects(() => db.query("UPDATE public.elementos SET estanteria_id=NULL WHERE id='ELM-001'"), /archivado/);
  } finally { await db.close(); }
});

test('only admins can restore archived products without changing stock, code, photos, weight or history', async () => {
  const db = await database();
  try {
    await db.exec("UPDATE public.elementos SET archived=true,foto_url='storage://test/photo.jpg',especificaciones='{\"peso_unitario\":{\"valor\":40,\"unidad\":\"g\"},\"fotos_adicionales\":[\"storage://test/other.jpg\"]}'::jsonb WHERE id='ELM-001'");
    const before=(await db.query("SELECT * FROM public.elementos WHERE id='ELM-001'")).rows[0];
    const history=(await db.query('SELECT count(*) AS total FROM public.historial')).rows[0].total;
    const restore="UPDATE public.elementos SET archived=false,updated_at=now() WHERE id='ELM-001' RETURNING *";
    for (const value of ['operador','consulta','']) {
      await role(db,value);
      assert.equal((await db.query(restore)).rows.length,0);
      await asOwner(db);
      assert.equal((await db.query("SELECT archived FROM public.elementos WHERE id='ELM-001'")).rows[0].archived,true);
    }
    await role(db,'admin');
    const restored=(await db.query(restore)).rows[0];
    assert.equal(restored.archived,false);
    for (const key of Object.keys(before).filter(value=>!['archived','updated_at'].includes(value))) assert.deepEqual(restored[key],before[key]);
    assert.equal((await db.query(restore)).rows.length,1);
    assert.equal((await db.query('SELECT count(*) AS total FROM public.historial')).rows[0].total,history);
    await asOwner(db);await role(db,'operador');
    assert.equal((await db.query("SELECT id FROM public.elementos WHERE id='ELM-001' AND archived=false")).rows.length,1);
    await asOwner(db);await db.exec('SET ROLE anon');
    await assert.rejects(()=>db.query(restore),/permission denied/);
  } finally {await db.close();}
});

test('outgoing photos are private, attached atomically, immutable after dispatch and independent of deleted products', async () => {
  const db = await database();
  try {
    const user='00000000-0000-0000-0000-000000000001', request='8c6d1dd1-74e8-46f1-8610-2d123c5013bf';
    const path1=`${user}/${request}/eb1e485b-348f-4db3-aadc-f33e4266e79b.jpg`;
    const path2=`${user}/${request}/3a659640-0240-4f77-8460-b73c98529c04.jpg`;
    const refs=[`outgoing://${path1}`,`outgoing://${path2}`];
    const sql='SELECT public.dispatch_inventory_with_photos($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb) AS remission';
    const args=[request,'PROY-001','Entrega','Admin','Recibe','','Registro de prueba',JSON.stringify([{elementoId:'ELM-001',cantidad:4}]),'{}',JSON.stringify(refs)];
    const before=(await db.query('SELECT id,codigo,cantidad FROM public.elementos ORDER BY id')).rows;
    await db.exec(outgoingPhotoMigration);
    assert.deepEqual((await db.query('SELECT id,codigo,cantidad FROM public.elementos ORDER BY id')).rows,before);
    assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='outgoing-images'")).rows[0].public,false);
    await role(db,'consulta');
    await assert.rejects(()=>db.query(sql,args),/No autorizado/);
    await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('outgoing-images',$1)",[path1]),/row-level security/);
    await asOwner(db); await role(db,'operador');
    await assert.rejects(()=>db.query(sql,args),/aún no está guardada/);
    assert.equal(await itemStock(db),184);
    await assert.rejects(()=>db.query(sql,[...args.slice(0,9),'{}']),/Registro fotográfico inválido/);
    await assert.rejects(()=>db.query(sql,[...args.slice(0,9),JSON.stringify([refs[0].replace(user,'00000000-0000-0000-0000-000000000002')])]),/pertenecer a esta cuenta/);
    await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('outgoing-images',$1)",[path1.replace(user,'00000000-0000-0000-0000-000000000002')]),/row-level security/);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('outgoing-images',$1),('outgoing-images',$2)",[path1,path2]);
    const staged=`${user}/${request}/229c9eb4-d73c-4d79-89fb-0e2bb643bb57.jpg`;
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('outgoing-images',$1)",[staged]);
    assert.equal((await db.query("DELETE FROM storage.objects WHERE name=$1 RETURNING name",[staged])).rows.length,1);
    await asOwner(db); await role(db,'consulta');
    assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='outgoing-images'")).rows.length,0);
    await asOwner(db); await role(db,'admin');
    await db.query('UPDATE public.elementos SET especificaciones=$1::jsonb WHERE id=$2',[JSON.stringify({peso_unitario:{valor:40,unidad:'g'}}),'ELM-001']);
    await asOwner(db); await role(db,'operador');
    const first=(await db.query(sql,args)).rows[0].remission;
    assert.deepEqual(first.fotos_salida,refs); assert.equal(first.items[0].pesoTotalKg,0.16); assert.equal(await itemStock(db),180);
    assert.deepEqual((await db.query(sql,args)).rows[0].remission,first); assert.equal(await itemStock(db),180);
    await assert.rejects(()=>db.query(sql,[...args.slice(0,9),JSON.stringify([refs[0]])]),/otras fotos/);
    const changed=[...args]; changed[7]=JSON.stringify([{elementoId:'ELM-001',cantidad:2}]);
    await assert.rejects(()=>db.query(sql,changed),/otro contenido/);
    assert.equal((await db.query("DELETE FROM storage.objects WHERE bucket_id='outgoing-images' RETURNING name")).rows.length,0);
    assert.equal((await db.query("UPDATE storage.objects SET name=name WHERE bucket_id='outgoing-images' RETURNING name")).rows.length,0);
    await assert.rejects(()=>db.query("UPDATE public.remisiones SET fotos_salida='[]' WHERE id=$1",[first.id]),/permission denied/);
    await asOwner(db); await role(db,'consulta');
    assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='outgoing-images'")).rows.length,2);
    await asOwner(db); await role(db,'admin');
    await db.query("UPDATE public.elementos SET archived=true WHERE id='ELM-001'");
    await db.query("SELECT public.delete_archived_inventory_item('ELM-001')");
    assert.deepEqual((await db.query('SELECT fotos_salida FROM public.remisiones WHERE id=$1',[first.id])).rows[0].fotos_salida,refs);
    assert.equal((await db.query("SELECT count(*) AS n FROM storage.objects WHERE bucket_id='outgoing-images'")).rows[0].n,2);
    await asOwner(db);
    await db.exec("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000002'::uuid $$;");
    await role(db,'operador');
    await assert.rejects(()=>db.query(sql,[...args.slice(0,9),'[]']),/usuario/);
    await asOwner(db); await db.exec('SET ROLE anon');
    await assert.rejects(()=>db.query(sql,args),/permission denied/);
  } finally { await db.close(); }
});

test('only admins can permanently delete archived items; history, codes and cleanup retries survive', async () => {
  const db = await database();
  try {
    const deletion = 'SELECT public.delete_archived_inventory_item($1) AS job';
    for (const userRole of ['consulta', 'operador', '']) {
      await role(db, userRole);
      await assert.rejects(() => db.query(deletion, ['ELM-001']), /No autorizado/);
      await assert.rejects(() => db.query('SELECT public.inventory_image_cleanup_jobs()'), /No autorizado/);
      await asOwner(db);
    }
    await db.exec('SET ROLE anon');
    await assert.rejects(() => db.query(deletion, ['ELM-001']), /permission denied/);
    await asOwner(db); await role(db, 'admin');
    await assert.rejects(() => db.query(deletion, ['ELM-001']), /Solo se pueden eliminar elementos archivados/);
    await assert.rejects(() => db.query("DELETE FROM public.elementos WHERE id='ELM-001'"), /permission denied/);
    const prefix = (await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data.prefijos.find(row => row.prefijo === 'PAN');
    const own = 'storage://account/main/full.jpg', extra = 'storage://account/extra/full.jpg', shared = 'storage://account/shared/full.jpg';
    const input = { nombre:'Material a archivar',categoria:'PANELES',cantidad:4,stock_minimo:0,unidad:'UND',
      almacen_id:'ALM-BOG-01',foto_url:own,especificaciones:{fotos_adicionales:[extra,shared]} };
    const creation = 'SELECT public.create_inventory_item_auto($1,$2::uuid,$3::jsonb) AS item';
    const args = [prefix.id,'742f307a-fbbd-450f-99b1-8ab34fb0699a',JSON.stringify(input)];
    const created = (await db.query(creation,args)).rows[0].item;
    await db.query('UPDATE public.elementos SET foto_url=$1 WHERE id=$2',[shared,'ELM-002']);
    const rem = (await db.query('SELECT public.dispatch_inventory_with_unit_weights($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) AS remission',
      ['77989d34-fcc6-4aa9-86b8-5bdd6c4e79c8','PROY-001','Entrega','Admin','Recibe','','',JSON.stringify([{elementoId:created.id,cantidad:1}]),'{}'])).rows[0].remission;
    const historyBefore = (await db.query('SELECT * FROM public.historial WHERE elemento_id=$1 ORDER BY id',[created.id])).rows;
    await db.query('UPDATE public.elementos SET archived=true WHERE id=$1',[created.id]);
    await asOwner(db);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('item-images','account/main/full.jpg'),('item-images','account/main/thumb.jpg'),('item-images','account/extra/full.jpg'),('item-images','account/shared/full.jpg')");
    await assert.rejects(() => db.query("DELETE FROM public.elementos WHERE id='ELM-001'"), /Solo se pueden eliminar elementos archivados/);
    await role(db,'admin');
    const job = (await db.query(deletion,[created.id])).rows[0].job;
    assert.deepEqual(job.fotos.sort(),[own,extra].sort());
    assert.equal((await db.query('SELECT count(*) AS n FROM public.elementos WHERE id=$1',[created.id])).rows[0].n,0);
    assert.deepEqual((await db.query('SELECT * FROM public.historial WHERE elemento_id=$1 ORDER BY id',[created.id])).rows,historyBefore);
    assert.deepEqual((await db.query('SELECT items FROM public.remisiones WHERE id=$1',[rem.id])).rows[0].items,rem.items);
    assert.deepEqual((await db.query(deletion,[created.id])).rows[0].job,job);
    await assert.rejects(() => db.query('SELECT public.complete_inventory_image_cleanup($1)',[created.id]), /Quedan fotos/);
    assert.equal((await db.query('SELECT public.inventory_image_cleanup_jobs() AS jobs')).rows[0].jobs.length,1);
    await assert.rejects(() => db.query('UPDATE public.elementos SET foto_url=$1 WHERE id=$2',[own,'ELM-002']), /producto eliminado/);
    await assert.rejects(() => db.query(creation,args), /eliminado definitivamente/);
    const next = (await db.query(creation,[prefix.id,'0a80e1f2-35dd-4ac1-9043-d729a8f70a57',JSON.stringify({...input,foto_url:'',especificaciones:{}})])).rows[0].item;
    assert.equal(Number(next.codigo.slice(3)),Number(created.codigo.slice(3))+1);
    await assert.rejects(() => db.query('SELECT public.create_inventory_item($1::jsonb)',[JSON.stringify({...input,codigo:created.codigo,foto_url:'',especificaciones:{}})]), /código ya pertenecía/);
    await db.query('UPDATE public.elementos SET archived=true WHERE id=$1',[next.id]);
    await db.query(deletion,[next.id]);
    await db.query('SELECT public.save_inventory_catalog_entry($1,$2::jsonb)',['prefijo',JSON.stringify({id:prefix.id,prefijo:'SOL',nombre:'Solar',activo:true})]);
    const newCatalog = (await db.query('SELECT public.save_inventory_catalog_entry($1,$2::jsonb) AS data',['prefijo',JSON.stringify({prefijo:'PAN',nombre:'Paneles nuevos',activo:true})])).rows[0].data;
    const recreatedPrefix = newCatalog.prefijos.find(row=>row.prefijo==='PAN');
    const afterPrefixChange = (await db.query(creation,[recreatedPrefix.id,'1d315fef-2026-4e57-9f98-00f6716d87bb',JSON.stringify({...input,foto_url:'',especificaciones:{}})])).rows[0].item;
    assert.equal(Number(afterPrefixChange.codigo.slice(3)),Number(next.codigo.slice(3))+1);
    await assert.rejects(() => db.query('SELECT * FROM public.inventario_eliminaciones'), /permission denied/);
    await asOwner(db);
    assert.equal((await db.query('SELECT elemento_id FROM public.inventario_altas WHERE request_id=$1',[args[1]])).rows[0].elemento_id,null);
    await db.exec(archivedMigration);
    await db.query("DELETE FROM storage.objects WHERE name IN ('account/main/full.jpg','account/main/thumb.jpg','account/extra/full.jpg')");
    await role(db,'admin');
    assert.equal((await db.query('SELECT public.complete_inventory_image_cleanup($1) AS done',[created.id])).rows[0].done,true);
    assert.deepEqual((await db.query('SELECT public.inventory_image_cleanup_jobs() AS jobs')).rows[0].jobs,[]);
    await asOwner(db);
    assert.equal((await db.query("SELECT count(*) AS n FROM storage.objects WHERE name='account/shared/full.jpg'")).rows[0].n,1);
  } finally { await db.close(); }
});

test('entries add decimal quantities atomically, record the signed-in operator and reject archived or pending items', async () => {
  const db = await database();
  try {
    await role(db,'operador');
    const sql = 'SELECT public.record_inventory_movement($1::uuid,$2,$3,$4::numeric,$5) AS movement';
    const args = ['f883fbca-58c4-4a17-8f4a-9786d050b636','ELM-001','ENTRADA',1.125,'Recepción de material'];
    const movement = (await db.query(sql,args)).rows[0].movement;
    assert.equal(movement.stock_anterior,184); assert.equal(movement.stock_nuevo,185.125);
    assert.equal(movement.responsable,'Operador de prueba');
    assert.equal((await db.query(sql,args)).rows[0].movement.id,movement.id);
    assert.equal(await itemStock(db),185.125);
    for (const quantity of [0,-1,0.0001]) await assert.rejects(() => db.query(sql,['3c7bf4e7-8199-4490-80c1-f0e4f7835bcd','ELM-001','ENTRADA',quantity,'Recepción']), /Movimiento inválido/);
    await asOwner(db); await db.exec("UPDATE public.elementos SET archived=true WHERE id='ELM-001'; UPDATE public.elementos SET stock_pendiente=true WHERE id='ELM-002'");
    await role(db,'operador');
    await assert.rejects(() => db.query(sql,['8906b098-7637-42f7-b984-0f0b8ba0c7e8','ELM-001','ENTRADA',2,'Recepción']), /Componente no encontrado/);
    await assert.rejects(() => db.query(sql,['8906b098-7637-42f7-b984-0f0b8ba0c7e8','ELM-002','ENTRADA',2,'Recepción']), /stock pendiente/);
    await asOwner(db); await role(db,'consulta');
    await assert.rejects(() => db.query(sql,['8906b098-7637-42f7-b984-0f0b8ba0c7e8','ELM-003','ENTRADA',2,'Recepción']), /No autorizado/);
    await asOwner(db);
    await db.exec(`CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"app_metadata":{}}'::jsonb $$; SET ROLE authenticated;`);
    await assert.rejects(() => db.query(sql,['8906b098-7637-42f7-b984-0f0b8ba0c7e8','ELM-003','ENTRADA',2,'Recepción']), /No autorizado/);
    await assert.rejects(() => db.query('SELECT public.delete_archived_inventory_item($1)',['ELM-001']), /No autorizado/);
  } finally { await db.close(); }
});

test('data catalogs preserve inventory, enforce permissions and support editable names and prefixes', async () => {
  const db = await database();
  try {
    const before = (await db.query('SELECT id,codigo,categoria,cantidad FROM public.elementos ORDER BY id')).rows;
    await db.exec(catalogMigration);
    assert.deepEqual((await db.query('SELECT id,codigo,categoria,cantidad FROM public.elementos ORDER BY id')).rows, before);
    await role(db, 'consulta');
    const catalog = (await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data;
    assert.equal(catalog.prefijos.find(row => row.prefijo === 'PAN').ultimo, 550);
    const save = 'SELECT public.save_inventory_catalog_entry($1,$2::jsonb) AS data';
    const category = { clave:'FERRETERIA',nombre:'Ferretería',activo:true };
    await assert.rejects(() => db.query(save,['categoria',JSON.stringify(category)]), /No autorizado/);
    await assert.rejects(() => db.query('SELECT * FROM public.inventario_altas'), /permission denied/);
    await asOwner(db); await role(db,'admin');
    const created = (await db.query(save,['categoria',JSON.stringify(category)])).rows[0].data;
    assert.equal(created.categorias.find(row => row.id === 'FERRETERIA').nombre,'Ferretería');
    await db.query(save,['categoria',JSON.stringify({id:'FERRETERIA',nombre:'Material de ferretería',activo:false})]);
    await db.query(save,['prefijo',JSON.stringify({prefijo:'ABC',nombre:'Accesorios',activo:true})]);
    const id = (await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data.prefijos.find(row => row.prefijo === 'ABC').id;
    await db.query(save,['prefijo',JSON.stringify({id,prefijo:'XYZ',nombre:'Accesorios varios',activo:false})]);
    await assert.rejects(() => db.query(save,['prefijo',JSON.stringify({prefijo:'AB',nombre:'Inválido'})]), /tres letras/);
    await asOwner(db); await db.exec(catalogMigration); await role(db,'admin');
    const updated = (await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data;
    assert.equal(updated.categorias.find(row => row.id === 'FERRETERIA').activo,false);
    assert.equal(updated.prefijos.find(row => row.id === id).prefijo,'XYZ');
    assert.deepEqual((await db.query('SELECT id,codigo,categoria,cantidad FROM public.elementos ORDER BY id')).rows, before);
    await asOwner(db); await db.exec('SET ROLE anon');
    await assert.rejects(() => db.query('SELECT public.inventory_data_catalog()'), /permission denied/);
  } finally { await db.close(); }
});

test('automatic item codes include archived numbers, grow past 999 and retry without duplicating stock', async () => {
  const db = await database();
  try {
    await role(db,'admin');
    const save = 'SELECT public.save_inventory_catalog_entry($1,$2::jsonb) AS data';
    const catalog = (await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data;
    const prefix = catalog.prefijos.find(row => row.prefijo === 'PAN');
    const item = { codigo:'FORGED999',nombre:'Elemento de prueba',categoria:'PANELES',cantidad:4,stock_minimo:0,unidad:'UND' };
    const sql = 'SELECT public.create_inventory_item_auto($1,$2::uuid,$3::jsonb) AS item';
    const args = [prefix.id,'11000000-0000-0000-0000-000000000001',JSON.stringify(item)];
    const first = (await db.query(sql,args)).rows[0].item;
    assert.equal(first.codigo,'PAN551');
    assert.equal((await db.query(sql,args)).rows[0].item.id,first.id);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.historial WHERE elemento_id=$1',[first.id])).rows[0].n),1);
    await db.query('UPDATE public.elementos SET archived=true WHERE id=$1',[first.id]);
    args[1]='11000000-0000-0000-0000-000000000002';
    assert.equal((await db.query(sql,args)).rows[0].item.codigo,'PAN552');
    args[2]=JSON.stringify({...item,nombre:'Otro contenido'});
    await assert.rejects(() => db.query(sql,args), /otro contenido o usuario/);
    // A legacy client can insert a higher number; automatic creation still reads that maximum.
    await db.query('SELECT public.create_inventory_item($1::jsonb)',[JSON.stringify({...item,codigo:'PAN999'})]);
    args[1]='11000000-0000-0000-0000-000000000003'; args[2]=JSON.stringify(item);
    assert.equal((await db.query(sql,args)).rows[0].item.codigo,'PAN1000');
    args[1]='11000000-0000-0000-0000-000000000004'; args[2]=JSON.stringify({...item,categoria:'NO_REGISTRADA'});
    await assert.rejects(() => db.query(sql,args), /incompletos/);
    assert.equal((await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data.prefijos.find(row=>row.id===prefix.id).ultimo,1000);
    await db.query(save,['categoria',JSON.stringify({clave:'FERRETERIA',nombre:'Ferretería'})]);
    args[2]=JSON.stringify({...item,categoria:'FERRETERIA'});
    const custom = (await db.query(sql,args)).rows[0].item;
    assert.equal(custom.codigo,'PAN1001'); assert.equal(custom.categoria,'FERRETERIA');
    await db.query(save,['prefijo',JSON.stringify({id:prefix.id,prefijo:'NUE',nombre:'Nuevo',activo:true})]);
    args[1]='11000000-0000-0000-0000-000000000005';
    assert.equal((await db.query(sql,args)).rows[0].item.codigo,'NUE1002');
    assert.equal((await db.query('SELECT codigo FROM public.elementos WHERE id=$1',[first.id])).rows[0].codigo,'PAN551');
    const parallel = await Promise.all([
      db.query(sql,[prefix.id,'11000000-0000-0000-0000-000000000006',args[2]]),
      db.query(sql,[prefix.id,'11000000-0000-0000-0000-000000000007',args[2]]),
    ]);
    assert.deepEqual(parallel.map(result=>result.rows[0].item.codigo).sort(),['NUE1003','NUE1004']);
    await db.query(save,['prefijo',JSON.stringify({id:prefix.id,prefijo:'NUE',nombre:'Nuevo',activo:false})]);
    args[1]='11000000-0000-0000-0000-000000000008';
    await assert.rejects(() => db.query(sql,args),/prefijo activo/);
    await asOwner(db); await role(db,'operador');
    await assert.rejects(() => db.query(sql,args),/No autorizado/);
  } finally { await db.close(); }
});

test('unit weights calculate from the locked catalog, preserve snapshots and ignore forged totals', async () => {
  const db = await database();
  try {
    await db.exec(unitWeightMigration);
    await role(db, 'admin');
    assert.equal((await db.query('SELECT public.unit_weight_dispatch_ready() AS ready')).rows[0].ready, true);
    await db.query(`UPDATE public.elementos SET especificaciones = especificaciones || '{"peso_unitario":{"valor":40,"unidad":"g"}}'::jsonb WHERE id='ELM-001'`);
    await db.query(`UPDATE public.elementos SET especificaciones = especificaciones || '{"peso_unitario":{"valor":2.5,"unidad":"kg"}}'::jsonb WHERE id='ELM-002'`);
    await db.query(`UPDATE public.elementos SET especificaciones = especificaciones || '{"peso_unitario":{"valor":0.001,"unidad":"g"}}'::jsonb WHERE id='ELM-006'`);
    await assert.rejects(() => db.query(`UPDATE public.elementos SET especificaciones = '{"peso_unitario":{"valor":0,"unidad":"g"}}'::jsonb WHERE id='ELM-001'`), /Peso unitario inválido/);
    const sql = 'SELECT public.dispatch_inventory_with_unit_weights($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) AS rem';
    const args = ['61f8c2c5-7b60-4920-b2a5-a320b6792c2f','PROY-001','Bodega','Admin','Obra','Residente','',JSON.stringify([
      { elementoId: 'ELM-001', cantidad: 20, pesoTotalKg: 999 }, { elementoId: 'ELM-002', cantidad: 2 },
      { elementoId: 'ELM-003', cantidad: 1 }, { elementoId: 'ELM-006', cantidad: 0.001 },
    ]),'{}'];
    const first = (await db.query(sql,args)).rows[0].rem;
    assert.equal(first.items.find(item => item.elementoId === 'ELM-001').pesoTotalKg, 0.8);
    assert.equal(first.items.find(item => item.elementoId === 'ELM-002').pesoTotalKg, 5);
    assert.equal(first.items.find(item => item.elementoId === 'ELM-003').pesoTotalKg, undefined);
    assert.equal(first.items.find(item => item.elementoId === 'ELM-006').pesoTotalKg, 0.000000001);
    assert.deepEqual(first.items.find(item => item.elementoId === 'ELM-001').pesoUnitario, { valor: 40, unidad: 'g' });
    await db.query(`UPDATE public.elementos SET especificaciones = especificaciones || '{"peso_unitario":{"valor":50,"unidad":"g"}}'::jsonb WHERE id='ELM-001'`);
    const repeat = (await db.query(sql,args)).rows[0].rem;
    assert.equal(repeat.id,first.id);
    assert.equal(repeat.items.find(item => item.elementoId === 'ELM-001').pesoTotalKg,0.8);
    assert.equal(await itemStock(db),164);
    const changed = [...args]; changed[7] = JSON.stringify([{ elementoId:'ELM-001',cantidad:1 }]);
    await assert.rejects(() => db.query(sql,changed),/otro contenido o usuario/);
    await asOwner(db); await role(db,'consulta');
    await assert.rejects(() => db.query(sql,args),/No autorizado/);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.remisiones')).rows[0].n,1);
  } finally { await db.close(); }
});

test('transport and weights are saved atomically, validated and included in request identity', async () => {
  const db = await database();
  try {
    await db.exec(transportMigration); // Safe to apply again.
    await role(db, 'consulta');
    const sql = 'SELECT public.dispatch_inventory_with_transport($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) AS rem';
    const data = { transportador: 'Conductor', cedulaTransportador: '00123', placaVehiculo: 'ABC123', telefonoRecibe: '+57 300', fechaDespacho: '2026-10-05', fechaDevolucion: '2026-10-10' };
    const args = ['dfc6c2e6-98e1-4bd1-837b-9d0d788d8b03','PROY-001','Bodega','Operador','Obra','Residente','',JSON.stringify([{ elementoId: 'ELM-001', cantidad: 2, pesoTotalKg: 4.125 }]),JSON.stringify(data)];
    await assert.rejects(() => db.query(sql, args), /No autorizado/);
    await asOwner(db); await role(db, 'operador');
    const invalid = [...args]; invalid[8] = JSON.stringify({ ...data, fechaDevolucion: '2026-10-04' });
    await assert.rejects(() => db.query(sql, invalid), /anterior al despacho/);
    invalid[8] = args[8]; invalid[7] = JSON.stringify([{ elementoId: 'ELM-001', cantidad: 2, pesoTotalKg: -1 }]);
    await assert.rejects(() => db.query(sql, invalid), /Peso inválido/);
    assert.equal(await itemStock(db), 184);
    const first = (await db.query(sql, args)).rows[0].rem;
    assert.equal(first.datos_transporte.cedulaTransportador, '00123');
    assert.equal(first.items[0].pesoTotalKg, 4.125);
    assert.equal(first.items[0].codigo, 'PAN550');
    assert.equal((await db.query(sql, args)).rows[0].rem.id, first.id);
    assert.equal(await itemStock(db), 182);
    const changed = [...args]; changed[8] = JSON.stringify({ ...data, placaVehiculo: 'OTR123' });
    await assert.rejects(() => db.query(sql, changed), /otro contenido o usuario/);
    changed[8] = args[8]; changed[7] = JSON.stringify([{ elementoId: 'ELM-001', cantidad: 2, pesoTotalKg: 5 }]);
    await assert.rejects(() => db.query(sql, changed), /otro contenido o usuario/);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.remisiones')).rows[0].n, 1);
  } finally { await db.close(); }
});

test('projects support admin management, safe example retries and reject finalized destinations', async () => {
  const db = await database();
  try {
    await role(db, 'operador');
    await assert.rejects(() => db.query("INSERT INTO public.proyectos(id,nombre,cliente,estado) VALUES ('PROY-TEST','Proyecto','EL TURPIAL','ACTIVO')"), /row-level security/);
    await asOwner(db); await role(db, 'admin');
    const seed = "INSERT INTO public.proyectos(id,nombre,cliente,estado) VALUES ('PROY-TEST','Ejemplo','EL TURPIAL','ACTIVO') ON CONFLICT(id) DO NOTHING";
    await db.query(seed);
    const dispatchSql = 'SELECT public.dispatch_inventory($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb) AS rem';
    const payload = ['bd8e7d90-a2c7-401b-a926-59047b6a8948', 'PROY-TEST', 'Bodega', 'Admin', 'Obra', 'Residente', '', JSON.stringify([{ elementoId: 'ELM-001', cantidad: 1 }])];
    await db.query(dispatchSql, payload);
    await db.query("UPDATE public.proyectos SET nombre='Nombre editado',estado='FINALIZADO' WHERE id='PROY-TEST'");
    await db.query(seed);
    const project = (await db.query("SELECT nombre,estado FROM public.proyectos WHERE id='PROY-TEST'")).rows[0];
    assert.equal(project.nombre, 'Nombre editado');
    assert.equal(project.estado, 'FINALIZADO');
    assert.equal((await db.query("SELECT proyecto_nombre FROM public.remisiones WHERE proyecto_id='PROY-TEST'")).rows[0].proyecto_nombre, 'Ejemplo');
    payload[0] = 'd70932d4-dd07-4674-8f97-16972f4d2c59';
    await assert.rejects(() => db.query(dispatchSql, payload), /Proyecto no disponible/);
    assert.equal(await itemStock(db), 183);
    await db.query("UPDATE public.proyectos SET estado='ACTIVO' WHERE id='PROY-TEST'");
    await db.query(dispatchSql, payload);
    assert.equal(await itemStock(db), 182);
  } finally { await db.close(); }
});

test('postdeploy audit runs against the migrated schema without changing inventory', async () => {
  const db = await database();
  try {
    const before = Number((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n);
    const results = await db.exec(postdeployAudit);
    assert.equal(Number(results[0].rows[0].productos_activos), before);
    assert.equal(Number(results[0].rows[0].cantidades_invalidas), 0);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.elementos')).rows[0].n), before);
  } finally { await db.close(); }
});

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
      stock_minimo: 0, unidad: 'UND', almacen_id: 'ALM-BOG-01', estanteria_id: 'EST-A01', cantidad_danados: 0,
      foto_url: 'storage://account/main/full.jpg', especificaciones: { fotos_adicionales: ['storage://account/extra/full.jpg'], entrada_excel: '42' } });
    const result = (await db.query('SELECT public.create_inventory_item($1::jsonb) AS item', [input])).rows[0].item;
    assert.equal(result.codigo, 'NUE001');
    assert.match(result.id, /^ELM-/);
    assert.equal(result.foto_url, 'storage://account/main/full.jpg');
    assert.deepEqual(result.especificaciones.fotos_adicionales, ['storage://account/extra/full.jpg']);
    await db.query('UPDATE public.elementos SET especificaciones = $1::jsonb WHERE id = $2',
      [JSON.stringify({ ...result.especificaciones, fotos_adicionales: ['storage://account/new/full.jpg'] }), result.id]);
    const changed = (await db.query('SELECT especificaciones FROM public.elementos WHERE id = $1', [result.id])).rows[0].especificaciones;
    assert.deepEqual(changed.fotos_adicionales, ['storage://account/new/full.jpg']);
    assert.equal(changed.entrada_excel, '42');
    const history = await db.query('SELECT stock_anterior,stock_nuevo FROM public.historial WHERE elemento_id = $1', [result.id]);
    assert.deepEqual(history.rows[0], { stock_anterior: '0.000', stock_nuevo: '4.000' });
    const badLocation = JSON.stringify({ ...JSON.parse(input), codigo: 'NUE002', almacen_id: 'ALM-MED-02' });
    await assert.rejects(() => db.query('SELECT public.create_inventory_item($1::jsonb)', [badLocation]), /Estantería fuera del almacén/);
  } finally { await db.close(); }
});


test('storage levels preserve legacy boxes, enforce roles and reject mismatched parents without changing stock', async () => {
  const db=await database();
  try {
    assert.equal((await db.query('SELECT * FROM public.niveles_estanteria')).rows.length,0);
    assert.equal((await db.query('SELECT * FROM public.cajas WHERE nivel_id IS NOT NULL')).rows.length,0);
    const stock=await itemStock(db);
    await role(db,'consulta');
    await assert.rejects(()=>db.query("INSERT INTO public.niveles_estanteria VALUES('N1','EST-A01','N1','Superior','',now())"),/row-level security/);
    await asOwner(db);await role(db,'admin');
    await db.exec("INSERT INTO public.niveles_estanteria(id,estanteria_id,codigo,nombre) VALUES('N1','EST-A01','N1','Superior'),('N2','EST-C03','N1','Inferior')");
    await assert.rejects(()=>db.exec("INSERT INTO public.niveles_estanteria(id,estanteria_id,codigo,nombre) VALUES('DUP','EST-A01','N1','Duplicado')"),/unique/);
    await assert.rejects(()=>db.exec("INSERT INTO public.cajas(id,estanteria_id,codigo,nombre) VALUES('BOX','EST-A01','BOX','Caja')"),/nivel/);
    await assert.rejects(()=>db.exec("INSERT INTO public.cajas(id,estanteria_id,nivel_id,codigo,nombre) VALUES('BOX','EST-A01','N2','BOX','Caja')"),/no pertenece/);
    await db.exec("INSERT INTO public.cajas(id,estanteria_id,nivel_id,codigo,nombre) VALUES('BOX','EST-A01','N1','BOX','Caja')");
    await assert.rejects(()=>db.exec("UPDATE public.elementos SET nivel_id='N2' WHERE id='ELM-001'"),/no pertenece/);
    await assert.rejects(()=>db.exec("UPDATE public.elementos SET caja_id='BOX' WHERE id='ELM-001'"),/no pertenece/);
    assert.equal(await itemStock(db),stock);
    assert.equal((await db.query("SELECT * FROM public.historial WHERE elemento_id='ELM-001' AND tipo='REUBICACION'")).rows.length,0);
    await db.exec("UPDATE public.elementos SET nivel_id='N1',caja_id='BOX' WHERE id='ELM-001'");
    const movement=(await db.query("SELECT * FROM public.historial WHERE elemento_id='ELM-001' AND tipo='REUBICACION'")).rows[0];
    assert.match(movement.destino_ubicacion,/Nivel Superior/);assert.equal(Number(movement.stock_anterior),stock);assert.equal(Number(movement.stock_nuevo),stock);
    await asOwner(db);await role(db,'operador');
    assert.equal((await db.query('SELECT * FROM public.niveles_estanteria')).rows.length,2);
    assert.equal((await db.query("UPDATE public.niveles_estanteria SET nombre='Otro' WHERE id='N1' RETURNING *")).rows.length,0);
    await asOwner(db);await db.exec('SET ROLE anon');await assert.rejects(()=>db.query('SELECT * FROM public.niveles_estanteria'),/permission denied/);
  } finally {await db.close();}
});

test('assigning a level to an existing box moves active and archived contents atomically and migration reruns preserve them', async () => {
  const db=await database();
  try {
    await role(db,'admin');
    await db.exec("INSERT INTO public.niveles_estanteria(id,estanteria_id,codigo,nombre) VALUES('N1','EST-C03','N1','Inferior'),('N2','EST-C03','N2','Superior')");
    const contents=(await db.query("SELECT id,cantidad FROM public.elementos WHERE caja_id='CAJ-A01-01'")).rows;
    assert.ok(contents.length>0);
    await db.query("UPDATE public.elementos SET archived=true WHERE id=$1",[contents[0].id]);
    await db.exec("UPDATE public.cajas SET nivel_id='N1' WHERE id='CAJ-A01-01'");
    const after=(await db.query("SELECT id,cantidad,nivel_id FROM public.elementos WHERE caja_id='CAJ-A01-01'")).rows;
    assert.deepEqual(after.map(row=>({id:row.id,cantidad:row.cantidad})),contents);
    assert.ok(after.every(row=>row.nivel_id==='N1'));
    assert.equal((await db.query("SELECT * FROM public.historial WHERE tipo='REUBICACION' AND elemento_id=$1",[contents[0].id])).rows.length,1);
    await assert.rejects(()=>db.query("UPDATE public.elementos SET nivel_id='N2',caja_id=null WHERE id=$1",[contents[0].id]),/archivado/);
    await db.exec("UPDATE public.cajas SET nivel_id='N2' WHERE id='CAJ-A01-01'");
    await asOwner(db);await db.exec(levelsMigration);
    assert.ok((await db.query("SELECT nivel_id FROM public.elementos WHERE caja_id='CAJ-A01-01'")).rows.every(row=>row.nivel_id==='N2'));
    assert.equal((await db.query("SELECT archived FROM public.elementos WHERE id=$1",[contents[0].id])).rows[0].archived,true);
  } finally {await db.close();}
});

test('automatic item creation saves its full location and brand, and remissions retain the first brand after edits and retries', async () => {
  const db=await database();
  try {
    await role(db,'admin');
    await db.exec("INSERT INTO public.niveles_estanteria(id,estanteria_id,codigo,nombre) VALUES('N1','EST-A01','N1','Superior'); INSERT INTO public.cajas(id,estanteria_id,nivel_id,codigo,nombre) VALUES('BOX','EST-A01','N1','BOX','Caja')");
    const prefix=(await db.query('SELECT public.inventory_data_catalog() AS data')).rows[0].data.prefijos.find(row=>row.prefijo==='PAN').id;
    const input={nombre:'Material de prueba',categoria:'PANELES',cantidad:4,stock_minimo:0,unidad:'UND',almacen_id:'ALM-BOG-01',estanteria_id:'EST-A01',nivel_id:'N1',caja_id:'BOX',especificaciones:{marca:'Marca original',valor_unitario_cop:50,peso_unitario:{valor:40,unidad:'g'}}};
    const sql='SELECT public.create_inventory_item_auto($1,$2::uuid,$3::jsonb) AS item';
    const args=[prefix,'c6a1ba86-01b2-4a5a-a2b2-8ad2c409bb2f',JSON.stringify(input)];
    const created=(await db.query(sql,args)).rows[0].item;
    assert.equal(created.nivel_id,'N1');assert.equal(created.caja_id,'BOX');assert.equal(created.especificaciones.marca,'Marca original');
    assert.deepEqual((await db.query(sql,args)).rows[0].item,created);
    const dispatch='SELECT public.dispatch_inventory_with_photos($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb) AS remission';
    const values=['7d37fc13-c4cf-4bc8-b35a-5fec79dc379b','PROY-001','Entrega','Almacenista','Recibe','','',JSON.stringify([{elementoId:created.id,cantidad:1,marca:'Falsa'}]),'{}','[]'];
    const first=(await db.query(dispatch,values)).rows[0].remission;
    assert.equal(first.items[0].marca,'Marca original');assert.equal(first.items[0].valorTotalCOP,50);assert.equal(first.items[0].pesoTotalKg,0.04);
    await db.query("UPDATE public.elementos SET especificaciones=especificaciones||$1::jsonb WHERE id=$2",[JSON.stringify({marca:'Marca nueva'}),created.id]);
    assert.deepEqual((await db.query(dispatch,values)).rows[0].remission,first);
    assert.equal((await db.query('SELECT items FROM public.remisiones WHERE id=$1',[first.id])).rows[0].items[0].marca,'Marca original');
    for(const marca of [123,'X'.repeat(101)]) await assert.rejects(()=>db.query("UPDATE public.elementos SET especificaciones=especificaciones||$1::jsonb WHERE id=$2",[JSON.stringify({marca}),created.id]),/marca/);
  } finally {await db.close();}
});

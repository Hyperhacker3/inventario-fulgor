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
const demoSeed = fs.readFileSync(new URL('../fixtures/demo_seed.sql', import.meta.url), 'utf8');
const postdeployAudit = fs.readFileSync(new URL('../../supabase/postdeploy_readonly.sql', import.meta.url), 'utf8');

async function database() {
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
  return db;
}

const role = (db, value) => db.exec(`SELECT set_config('app.test_role','${value}',false); SET ROLE authenticated;`);
const asOwner = db => db.exec('RESET ROLE;');
const itemStock = async db => Number((await db.query("SELECT cantidad FROM public.elementos WHERE id = 'ELM-001'")).rows[0].cantidad);

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

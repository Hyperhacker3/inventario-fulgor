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
const routeMigration = fs.readFileSync(new URL('../../supabase/migrations/20261007000200_remission_route.sql', import.meta.url), 'utf8');
const uppercaseMigration = fs.readFileSync(new URL('../../supabase/migrations/20261007000300_uppercase_registration.sql', import.meta.url), 'utf8');
const webpMigration = fs.readFileSync(new URL('../../supabase/migrations/20261010000100_webp_photos.sql', import.meta.url), 'utf8');
const projectCityMigration = fs.readFileSync(new URL('../../supabase/migrations/20261027000100_project_city_remission_code.sql', import.meta.url), 'utf8');
const automaticCodesMigration = fs.readFileSync(new URL('../../supabase/migrations/20261029000100_automatic_location_category_codes.sql', import.meta.url), 'utf8');
const editUnitMigration = fs.readFileSync(new URL('../../supabase/migrations/20261028000200_edit_item_units.sql', import.meta.url), 'utf8');
const reportHistoryMigration = fs.readFileSync(new URL('../../supabase/migrations/20261028000100_inventory_report_history.sql', import.meta.url), 'utf8');
const demoSeed = fs.readFileSync(new URL('../fixtures/demo_seed.sql', import.meta.url), 'utf8');
const postdeployAudit = fs.readFileSync(new URL('../../supabase/postdeploy_readonly.sql', import.meta.url), 'utf8');
const warehouseProfile = fs.readFileSync(new URL('../../supabase/configure_warehouse_profile.sql', import.meta.url), 'utf8');

async function database({ company = true, route = false, uppercase = false } = {}) {
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
  if (route || uppercase) await db.exec(routeMigration);
  if (uppercase) await db.exec(uppercaseMigration);
  return db;
}

const role = (db, value) => db.exec(`SELECT set_config('app.test_role','${value}',false); SET ROLE authenticated;`);
const asOwner = db => db.exec('RESET ROLE;');
const itemStock = async db => Number((await db.query("SELECT cantidad FROM public.elementos WHERE id = 'ELM-001'")).rows[0].cantidad);

const routeSql = 'SELECT public.dispatch_inventory_with_route($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12) AS rem';
const routeArgs = (request, origin = 'Honda', destination = 'Bogotá') => [request,'PROY-001','Entrega','Operador','Recibe','Residente','',
  JSON.stringify([{ elementoId:'ELM-001',cantidad:1 }]),'{}','[]',origin,destination];

test('project city codes preserve previous records and retries, read the authoritative city and continue the annual counter', async () => {
  const db = await database({ uppercase: true });
  try {
    await db.exec("INSERT INTO storage.buckets VALUES('item-images','item-images',false,8388608,ARRAY['image/jpeg'])");
    await db.exec(webpMigration);
    await db.exec("UPDATE public.proyectos SET ubicacion='Dirección anterior 123' WHERE id='PROY-001'");
    await role(db,'operador');
    const oldArgs = routeArgs('27000000-0000-0000-0000-000000000001','Honda','Destino anterior');
    const old = (await db.query(routeSql,oldArgs)).rows[0].rem;
    await asOwner(db);
    const before = (await db.query('SELECT * FROM public.elementos ORDER BY id')).rows;
    const projectsBefore = (await db.query('SELECT * FROM public.proyectos ORDER BY id')).rows;
    await db.exec(projectCityMigration); await db.exec(projectCityMigration);
    assert.deepEqual((await db.query('SELECT * FROM public.elementos ORDER BY id')).rows,before);
    assert.deepEqual((await db.query('SELECT * FROM public.proyectos ORDER BY id')).rows,projectsBefore);
    const oldRow=(await db.query('SELECT * FROM public.remisiones WHERE id=$1',[old.id])).rows[0];
    assert.deepEqual({...oldRow,created_at:new Date(oldRow.created_at).toISOString()},{...old,created_at:new Date(old.created_at).toISOString()});
    await db.exec("UPDATE public.proyectos SET ubicacion='Bogotá' WHERE id='PROY-001'");
    await db.query("UPDATE public.elementos SET especificaciones=especificaciones||$1::jsonb WHERE id='ELM-001'", [JSON.stringify({peso_unitario:{valor:40,unidad:'g'},valor_unitario_cop:6500})]);
    const request='27000000-0000-0000-0000-000000000002';
    const photo='outgoing://00000000-0000-0000-0000-000000000001/'+request+'/27000000-0000-0000-0000-000000000003.webp';
    await db.query("INSERT INTO storage.objects VALUES('outgoing-images',$1)",[photo.slice(11)]);
    await role(db,'operador');
    assert.equal((await db.query('SELECT public.project_city_remission_ready() AS ready')).rows[0].ready,true);
    const args=routeArgs(request,'Honda','Calle 40 # 12-34, bodega principal'); args[9]=JSON.stringify([photo]);
    const issued=(await db.query(routeSql,args)).rows[0].rem;
    assert.equal(issued.numero_remision,'REM-HONDA-BOGOTA-'+issued.fecha.replaceAll('-','')+'-002');
    assert.equal(issued.ubicacion,'BOGOTÁ'); assert.equal(issued.lugar_destino,'CALLE 40 # 12-34, BODEGA PRINCIPAL');
    assert.deepEqual(issued.fotos_salida,[photo]); assert.equal(issued.items[0].pesoTotalKg,0.04);
    assert.equal(issued.items[0].valorUnitarioCOP,6500); assert.equal(issued.empresa.nit,'800.176.581');
    await asOwner(db); await db.exec("UPDATE public.proyectos SET ubicacion='Medellín', estado='FINALIZADO' WHERE id='PROY-001'");
    await role(db,'operador');
    assert.deepEqual((await db.query(routeSql,args)).rows[0].rem,issued);
    assert.deepEqual((await db.query(routeSql,oldArgs)).rows[0].rem,old);
    assert.equal(await itemStock(db),182);
    const changed=[...args]; changed[11]='Otra dirección'; await assert.rejects(() => db.query(routeSql,changed),/otros lugares/);
    await asOwner(db); await db.exec("UPDATE public.proyectos SET estado='ACTIVO' WHERE id='PROY-001'"); await role(db,'operador');
    const third=(await db.query(routeSql,routeArgs('27000000-0000-0000-0000-000000000004','Honda','Bodega 999'))).rows[0].rem;
    assert.equal(third.numero_remision,'REM-HONDA-MEDELLIN-'+third.fecha.replaceAll('-','')+'-003');
    const history=(await db.query('SELECT motivo FROM public.historial WHERE remision_id=$1',[issued.id])).rows;
    assert.equal(history[0].motivo,'Remisión '+issued.numero_remision);
  } finally { await db.close(); }
});

test('project city validation rolls back stock, documents and counters, with unchanged write permissions and no destination fallback', async () => {
  const db=await database({uppercase:true});
  try {
    await db.exec(projectCityMigration);
    const args=routeArgs('27000000-0000-0000-0000-000000000005','Honda','Bogotá');
    await db.exec('SET ROLE anon'); await assert.rejects(() => db.query(routeSql,args),/permission denied/);
    await assert.rejects(() => db.exec('SELECT public.project_city_remission_ready()'),/permission denied/); await asOwner(db);
    await role(db,'consulta'); await assert.rejects(() => db.query(routeSql,args),/No autorizado/); await asOwner(db);
    for(const city of ['', 'Bogotá, Calle 10', 'Calle Real', 'Vía Honda-Mariquita', 'Bogotá # 12', '123','---','東京','a'.repeat(81)]) {
      await db.query("UPDATE public.proyectos SET ubicacion=$1 WHERE id='PROY-001'",[city]);
      await role(db,'operador'); await assert.rejects(() => db.query(routeSql,args),/solo la ciudad/);
      assert.equal(await itemStock(db),184); assert.equal((await db.query('SELECT count(*) AS n FROM public.remisiones')).rows[0].n,0);
      await asOwner(db); assert.equal((await db.query('SELECT count(*) AS n FROM public.remision_consecutivos')).rows[0].n,0);
      assert.equal((await db.query('SELECT count(*) AS n FROM public.historial WHERE remision_id IS NOT NULL')).rows[0].n,0);
    }
    for(const city of ['San Andrés', 'São José', 'Bogotá D.C.', 'Santa Rosa de Cabal']) assert.equal((await db.query('SELECT public.normalize_project_city($1) AS city',[city])).rows[0].city,city);
    assert.equal((await db.query("SELECT has_function_privilege('authenticated','public.dispatch_inventory_with_photos(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb)','execute') AS allowed")).rows[0].allowed,false);
  } finally { await db.close(); }
});

test('WebP migration preserves inventory and permissions, supports secured outgoing evidence and preserves photo cleanup', async () => {
  const db = await database({ uppercase: true });
  try {
    await db.exec("INSERT INTO storage.buckets VALUES('item-images','item-images',false,8388608,ARRAY['image/jpeg','image/png'])");
    const before = (await db.query('SELECT * FROM public.elementos ORDER BY id')).rows;
    const policies = (await db.query("SELECT policyname,qual FROM pg_policies WHERE schemaname='storage' AND policyname IN ('outgoing_images_read','outgoing_images_delete') ORDER BY policyname")).rows;
    await db.exec(webpMigration); await db.exec(webpMigration);
    assert.deepEqual((await db.query('SELECT * FROM public.elementos ORDER BY id')).rows, before);
    assert.deepEqual((await db.query("SELECT policyname,qual FROM pg_policies WHERE schemaname='storage' AND policyname IN ('outgoing_images_read','outgoing_images_delete') ORDER BY policyname")).rows, policies);
    const buckets = (await db.query('SELECT * FROM storage.buckets ORDER BY id')).rows;
    assert.ok(buckets.every(bucket => !bucket.public && Number(bucket.file_size_limit) === 8388608 && bucket.allowed_mime_types.includes('image/webp') && bucket.allowed_mime_types.includes('image/jpeg')));
    assert.ok(buckets.find(bucket => bucket.id === 'item-images').allowed_mime_types.includes('image/png'));
    assert.equal((await db.query("SELECT has_function_privilege('authenticated','public.dispatch_inventory_with_photos(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb)','execute') AS allowed")).rows[0].allowed, false);
    const user = '00000000-0000-0000-0000-000000000001', request = '15b144be-6612-4dbe-8eba-95e4e8fe2f91';
    const path = `${user}/${request}/6710eed9-3d28-4935-8b6d-edf604a0e5e0.webp`;
    await role(db, 'consulta');
    await assert.rejects(() => db.query("INSERT INTO storage.objects VALUES('outgoing-images',$1)", [path]), /row-level security/);
    await asOwner(db); await role(db, 'operador');
    await assert.rejects(() => db.query("INSERT INTO storage.objects VALUES('outgoing-images',$1)", [path.replace('.webp','.png')]), /row-level security/);
    await assert.rejects(() => db.query("INSERT INTO storage.objects VALUES('outgoing-images',$1)", [path.replace(user,'00000000-0000-0000-0000-000000000002')]), /row-level security/);
    const jpgPath = path.replace('6710eed9-3d28-4935-8b6d-edf604a0e5e0.webp', '769eb4f1-a6e2-4598-9391-4b2310ade78c.jpg');
    await db.query("INSERT INTO storage.objects VALUES('outgoing-images',$1),('outgoing-images',$2)", [path, jpgPath]);
    const refs = [`outgoing://${path}`, `outgoing://${jpgPath}`];
    const args = routeArgs(request); args[9] = JSON.stringify(refs);
    const remission = (await db.query(routeSql, args)).rows[0].rem;
    assert.deepEqual(remission.fotos_salida, refs);
    assert.deepEqual((await db.query(routeSql, args)).rows[0].rem, remission);
    assert.equal((await db.query("DELETE FROM storage.objects WHERE name=$1 RETURNING name", [path])).rows.length, 0);
    await asOwner(db);
    await db.query("INSERT INTO public.inventario_eliminaciones(id,codigo,nombre,actor_id,fotos) VALUES('webp-cleanup','WEB001','Foto',$1,$2::jsonb)", [user, JSON.stringify([`storage://${user}/photo/full.webp`])]);
    const full = `${user}/photo/full.webp`;
    await db.query("INSERT INTO storage.objects VALUES('item-images',$1)", [full]);
    await role(db, 'operador');
    await assert.rejects(() => db.query("SELECT public.complete_inventory_image_cleanup('webp-cleanup')"), /No autorizado/);
    await asOwner(db); await role(db, 'admin');
    await assert.rejects(() => db.query("SELECT public.complete_inventory_image_cleanup('webp-cleanup')"), /Quedan fotos/);
    await asOwner(db); await db.query("DELETE FROM storage.objects WHERE name=$1", [full]);
    await role(db, 'admin');
    assert.equal((await db.query("SELECT public.complete_inventory_image_cleanup('webp-cleanup') AS done")).rows[0].done, true);
  } finally { await db.close(); }
});

test('uppercase registration preserves previous records and stock while new outputs snapshot uppercase names, locations and signed-in users', async () => {
  const db=await database({route:true});
  try {
    await db.exec(`UPDATE public.elementos SET nombre='Módulo solar',especificaciones=especificaciones||'{"marca":"Fabricante"}'::jsonb WHERE id='ELM-001';
      UPDATE public.proyectos SET nombre='Proyecto solar',cliente='Cliente de prueba',ubicacion='Bogotá, dirección 1' WHERE id='PROY-001';`);
    await role(db,'operador');
    const oldArgs=routeArgs('91000000-0000-0000-0000-000000000001');
    const old=(await db.query(routeSql,oldArgs)).rows[0].rem;
    const stock=await itemStock(db);
    await asOwner(db);await db.exec(uppercaseMigration);await db.exec(uppercaseMigration);
    assert.equal(await itemStock(db),stock);
    const previous=(await db.query('SELECT to_jsonb(rem) AS rem FROM public.remisiones AS rem WHERE id=$1',[old.id])).rows[0].rem;
    assert.equal(previous.proyecto_nombre,old.proyecto_nombre);assert.deepEqual(previous.items,old.items);assert.equal(previous.lugar_destino,'Bogotá');
    // Updating stock or unrelated metadata must not silently rename the old catalog.
    await db.exec("UPDATE public.elementos SET cantidad=cantidad,especificaciones=especificaciones||'{\"otra\":\"sin cambios\"}'::jsonb WHERE id='ELM-001'");
    assert.equal((await db.query("SELECT nombre,especificaciones->>'marca' AS marca FROM public.elementos WHERE id='ELM-001'")).rows[0].marca,'Fabricante');
    await role(db,'operador');assert.deepEqual((await db.query(routeSql,oldArgs)).rows[0].rem,previous);
    const args=routeArgs('91000000-0000-0000-0000-000000000002');args[8]='{"transportador":"José Pérez","placaVehiculo":"abc123","fechaDespacho":"2026-10-07","telefonoRecibe":"12345"}';
    const rem=(await db.query(routeSql,args)).rows[0].rem;
    assert.equal(rem.proyecto_nombre,'PROYECTO SOLAR');assert.equal(rem.cliente,'CLIENTE DE PRUEBA');assert.equal(rem.ubicacion,'BOGOTÁ, DIRECCIÓN 1');
    assert.equal(rem.lugar_remision,'HONDA');assert.equal(rem.lugar_destino,'BOGOTÁ');assert.equal(rem.entregado_por,'ENTREGA');assert.equal(rem.recibido_por,'RECIBE');
    assert.equal(rem.cargo_entregado,'OPERADOR');assert.equal(rem.cargo_recibido,'RESIDENTE');assert.equal(rem.items[0].nombre,'MÓDULO SOLAR');assert.equal(rem.items[0].marca,'FABRICANTE');
    assert.equal(rem.datos_transporte.transportador,'JOSÉ PÉREZ');assert.equal(rem.datos_transporte.placaVehiculo,'ABC123');assert.equal(rem.datos_transporte.fechaDespacho,'2026-10-07');assert.equal(rem.datos_transporte.telefonoRecibe,'12345');
    const history=(await db.query('SELECT elemento_nombre,proyecto_nombre,responsable FROM public.historial WHERE remision_id=$1',[rem.id])).rows[0];
    assert.deepEqual(history,{elemento_nombre:'MÓDULO SOLAR',proyecto_nombre:'PROYECTO SOLAR',responsable:'OPERADOR DE PRUEBA'});
    assert.deepEqual((await db.query(routeSql,args)).rows[0].rem,rem);assert.equal(await itemStock(db),stock-1);
    await asOwner(db);await db.exec(uppercaseMigration);
    assert.deepEqual((await db.query('SELECT to_jsonb(rem) AS rem FROM public.remisiones AS rem WHERE id=$1',[rem.id])).rows[0].rem,rem);
    await assert.rejects(()=>db.query('UPDATE public.remisiones SET uppercase_names=false WHERE id=$1',[rem.id]),/política de nombres/);
  } finally {await db.close();}
});

test('new and edited product names/brands are persisted uppercase without weakening permissions, quantities or other metadata', async () => {
  const db=await database({uppercase:true});
  try {
    await role(db,'admin');
    await db.exec(`UPDATE public.elementos SET nombre='  Tornillo de fijación  ',especificaciones=especificaciones||'{"marca":"  Acmé  ","nota":"Texto conservado"}'::jsonb WHERE id='ELM-001'`);
    const item=(await db.query("SELECT * FROM public.elementos WHERE id='ELM-001'")).rows[0];
    assert.equal(item.nombre,'TORNILLO DE FIJACIÓN');assert.equal(item.especificaciones.marca,'ACMÉ');assert.equal(item.especificaciones.nota,'Texto conservado');assert.equal(Number(item.cantidad),184);
    const input={codigo:'NEW001',nombre:'Nombre nuevo',categoria:'OTROS',cantidad:0,stock_minimo:0,unidad:'UND',especificaciones:{marca:'Marca nueva'}};
    const created=(await db.query('SELECT public.create_inventory_item($1::jsonb) AS item',[JSON.stringify(input)])).rows[0].item;
    assert.equal(created.nombre,'NOMBRE NUEVO');assert.equal(created.especificaciones.marca,'MARCA NUEVA');
    await asOwner(db);await role(db,'operador');assert.equal((await db.query("UPDATE public.elementos SET nombre='no autorizado' WHERE id='ELM-001' RETURNING id")).rows.length,0);
    assert.equal((await db.query("SELECT nombre FROM public.elementos WHERE id='ELM-001'")).rows[0].nombre,'TORNILLO DE FIJACIÓN');
    await asOwner(db);await role(db,'consulta');await assert.rejects(()=>db.query(routeSql,routeArgs('91000000-0000-0000-0000-000000000003')),/No autorizado/);
    await asOwner(db);await db.exec('SET ROLE anon');await assert.rejects(()=>db.exec('SELECT public.uppercase_inventory_names()'),/permission/);
  } finally {await db.close();}
});

test('new route preserves old remissions and annual counters, stores places/code/date and retries the exact transaction without deducting twice', async () => {
  const db = await database();
  try {
    await role(db,'operador');
    const old = (await db.query("SELECT public.dispatch_inventory_with_photos('10000000-0000-0000-0000-000000000001'::uuid,'PROY-001','Entrega','Operador','Recibe','Residente','', '[{\"elementoId\":\"ELM-001\",\"cantidad\":2}]'::jsonb,'{}'::jsonb,'[]'::jsonb) AS rem")).rows[0].rem;
    await asOwner(db); await db.exec(routeMigration); await role(db,'operador');
    const args = routeArgs('10000000-0000-0000-0000-000000000002',' Honda  ',' Bogotá  ');
    const first = (await db.query(routeSql,args)).rows[0].rem;
    assert.equal(first.lugar_remision,'Honda'); assert.equal(first.lugar_destino,'Bogotá');
    assert.match(first.fecha,/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(first.numero_remision,`REM-HONDA-BOGOTA-${first.fecha.replaceAll('-','')}-002`);
    assert.notEqual(first.id,first.numero_remision); // Stable internal references remain intact.
    const previous = (await db.query('SELECT * FROM public.remisiones WHERE id=$1',[old.id])).rows[0];
    assert.equal(previous.numero_remision,old.numero_remision); assert.deepEqual(previous.items,old.items);
    assert.equal(previous.lugar_remision,null); assert.equal(previous.lugar_destino,null);
    const repeat = (await db.query(routeSql,args)).rows[0].rem;
    assert.deepEqual(repeat,first); assert.equal(await itemStock(db),181);
    const movements = (await db.query('SELECT remision_id,motivo FROM public.historial WHERE remision_id=$1',[first.id])).rows;
    assert.equal(movements.length,1); assert.equal(movements[0].motivo,`Remisión ${first.numero_remision}`);
    const changed = [...args]; changed[11]='Medellín'; await assert.rejects(() => db.query(routeSql,changed), /otros lugares/);
    const changedItems = [...args]; changedItems[7]='[{"elementoId":"ELM-001","cantidad":3}]';
    await assert.rejects(() => db.query(routeSql,changedItems), /otro contenido/);
    assert.equal(await itemStock(db),181);
    await asOwner(db); await db.exec(routeMigration); await role(db,'consulta');
    assert.equal((await db.query('SELECT numero_remision FROM public.remisiones WHERE id=$1',[first.id])).rows[0].numero_remision,first.numero_remision);
  } finally { await db.close(); }
});

test('route rejects unauthorized users, missing places and legacy write bypasses before changing stocks or allocating a counter', async () => {
  const db = await database({ route:true });
  const args = routeArgs('20000000-0000-0000-0000-000000000001');
  try {
    await db.exec('SET ROLE anon'); await assert.rejects(() => db.query(routeSql,args), /permission denied/); await asOwner(db);
    for (const accountRole of ['consulta','']) { await role(db,accountRole); await assert.rejects(() => db.query(routeSql,args), /No autorizado/); await asOwner(db); }
    await role(db,'operador');
    for (const place of [null,'','---','a'.repeat(81)]) { const invalid=[...args]; invalid[10]=place; await assert.rejects(() => db.query(routeSql,invalid), /lugares/); }
    const invalidDest=[...args]; invalidDest[11]=''; await assert.rejects(() => db.query(routeSql,invalidDest), /lugares/);
    await assert.rejects(() => db.query('SELECT public.dispatch_inventory_with_photos($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb)',args.slice(0,10)), /permission denied/);
    const tooMany=[...args]; tooMany[7]='[{"elementoId":"ELM-001","cantidad":185}]'; await assert.rejects(() => db.query(routeSql,tooMany), /Stock no disponible/);
    assert.equal(await itemStock(db),184); assert.equal((await db.query('SELECT count(*) AS n FROM public.remisiones')).rows[0].n,0);
    await asOwner(db); assert.equal((await db.query('SELECT count(*) AS n FROM public.remision_consecutivos')).rows[0].n,0);
  } finally { await db.close(); }
});

test('route keeps authoritative weight/price/company/photos snapshots and freezes issued places, code, date and retry identity', async () => {
  const db = await database({ route:true });
  const request='30000000-0000-0000-0000-000000000001';
  const photo=`outgoing://00000000-0000-0000-0000-000000000001/${request}/30000000-0000-0000-0000-000000000002.jpg`;
  try {
    await db.exec("UPDATE public.elementos SET especificaciones=especificaciones||'{\"peso_unitario\":{\"valor\":40,\"unidad\":\"g\"},\"valor_unitario_cop\":6500}'::jsonb WHERE id='ELM-001'");
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('outgoing-images',$1)",[photo.slice(11)]);
    await role(db,'admin'); const args=routeArgs(request,'São José','Bogotá'); args[9]=JSON.stringify([photo]);
    const first=(await db.query(routeSql,args)).rows[0].rem;
    assert.match(first.numero_remision,/^REM-SAO-JOSE-BOGOTA-/); assert.deepEqual(first.fotos_salida,[photo]);
    assert.deepEqual(first.items[0].pesoUnitario,{ valor:40,unidad:'g' }); assert.equal(first.items[0].pesoTotalKg,0.04);
    assert.equal(first.items[0].valorUnitarioCOP,6500); assert.equal(first.empresa.nit,'800.176.581');
    await asOwner(db);
    for (const [column,value] of [['lugar_remision','Otra ciudad'],['lugar_destino','Medellín'],['numero_remision','FALSA'],['fecha','2000-01-01']]) {
      await assert.rejects(() => db.query(`UPDATE public.remisiones SET ${column}=$1 WHERE id=$2`,[value,first.id]), /no se pueden modificar/);
    }
    await assert.rejects(() => db.query("UPDATE public.remisiones SET request_payload=request_payload-'route_request' WHERE id=$1",[first.id]), /no se pueden modificar/);
    await db.exec("UPDATE public.elementos SET especificaciones=especificaciones||'{\"peso_unitario\":{\"valor\":1,\"unidad\":\"kg\"},\"valor_unitario_cop\":1}'::jsonb WHERE id='ELM-001'");
    await role(db,'admin'); assert.deepEqual((await db.query(routeSql,args)).rows[0].rem,first);
    const changedPhotos=[...args]; changedPhotos[9]='[]'; await assert.rejects(() => db.query(routeSql,changedPhotos), /otras fotos/);
    assert.equal(await itemStock(db),183);
  } finally { await db.close(); }
});

test('annual route counters grow past three and four digits without truncation and remain intact after rerunning the migration', async () => {
  const db = await database({ route:true });
  try {
    const year=Number((await db.query("SELECT extract(year FROM now() AT TIME ZONE 'America/Bogota') AS year")).rows[0].year);
    await db.query('INSERT INTO public.remision_consecutivos(anio,ultimo) VALUES($1,999)',[year]);
    await role(db,'operador'); const first=(await db.query(routeSql,routeArgs('40000000-0000-0000-0000-000000000001'))).rows[0].rem;
    assert.match(first.numero_remision,/-1000$/);
    await asOwner(db); await db.query('UPDATE public.remision_consecutivos SET ultimo=9999 WHERE anio=$1',[year]);
    await role(db,'operador'); const second=(await db.query(routeSql,routeArgs('40000000-0000-0000-0000-000000000002'))).rows[0].rem;
    assert.match(second.numero_remision,/-10000$/); assert.match(second.id,/-10000$/);
    await asOwner(db); await db.exec(routeMigration); await role(db,'operador');
    const third=(await db.query(routeSql,routeArgs('40000000-0000-0000-0000-000000000003'))).rows[0].rem;
    assert.match(third.numero_remision,/-10001$/); assert.equal(await itemStock(db),181);
  } finally { await db.close(); }
});

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

const reportPayload = () => ({
  createdAt: '2026-10-28T15:00:00Z', generatedBy: 'Persona de la cuenta',
  company: { nombre: 'EL TURPIAL', nit: '800.176.581', direccion: '', telefono: '', logo: '/logo-completo.png' },
  rows: [{id:'ELM-001',code:'PAN001',name:'Producto del informe',brand:'Marca',category:'PANELES',condition:'BUENO',location:'Honda > Uno > Nivel Piso > CAJA-1',quantity:2,unit:'UND',damaged:0,unitWeight:{valor:250,unidad:'g'},weightKg:0.5,unitValueCOP:100,valueCOP:200}],
  quantities:[{unit:'UND',quantity:2}],pendingQuantity:0,weightKg:0.5,pendingWeight:0,valueCOP:200,pendingValue:0,zeroPrice:0,
});
const reportSaveSql='SELECT public.save_inventory_report($1::uuid,$2::jsonb) AS report';
test('report history saves immutable snapshots for read roles, retries once, preserves deleted products and never changes stock', async () => {
  const db=await database();
  try {
    const before=(await db.query('SELECT * FROM public.elementos ORDER BY id')).rows;
    const historyBefore=(await db.query('SELECT * FROM public.historial ORDER BY id')).rows;
    const remissionsBefore=(await db.query('SELECT * FROM public.remisiones ORDER BY id')).rows;
    await db.exec(reportHistoryMigration); await db.exec(reportHistoryMigration);
    const payload=reportPayload(), request='28000000-0000-0000-0000-000000000001';
    await role(db,'consulta');
    assert.equal((await db.query('SELECT public.inventory_report_history_ready() AS ready')).rows[0].ready,true);
    const saved=(await db.query(reportSaveSql,[request,JSON.stringify(payload)])).rows[0].report;
    assert.equal(saved.generatedBy,payload.generatedBy); assert.deepEqual(saved.rows,payload.rows); assert.notEqual(saved.createdAt,payload.createdAt);
    assert.deepEqual((await db.query(reportSaveSql,[request,JSON.stringify(payload)])).rows[0].report,saved);
    await assert.rejects(()=>db.query(reportSaveSql,[request,JSON.stringify({...payload,valueCOP:999})]),/otro informe/);
    for (const userRole of ['admin','operador','consulta']) {
      await role(db,userRole);
      assert.equal((await db.query('SELECT count(*) AS n FROM public.inventario_informes')).rows[0].n,1);
      await assert.rejects(()=>db.exec('UPDATE public.inventario_informes SET product_count=99'),/permission denied/);
      await assert.rejects(()=>db.exec('DELETE FROM public.inventario_informes'),/permission denied/);
      await assert.rejects(()=>db.exec("INSERT INTO public.inventario_informes(id) VALUES(gen_random_uuid())"),/permission denied/);
    }
    await asOwner(db);
    assert.deepEqual((await db.query('SELECT * FROM public.elementos ORDER BY id')).rows,before);
    assert.deepEqual((await db.query('SELECT * FROM public.historial ORDER BY id')).rows,historyBefore);
    assert.deepEqual((await db.query('SELECT * FROM public.remisiones ORDER BY id')).rows,remissionsBefore);
    await assert.rejects(()=>db.exec('UPDATE public.inventario_informes SET product_count=99'),/no se pueden modificar/);
    await db.exec("UPDATE public.elementos SET cantidad=999, nombre='Nombre actual', archived=true WHERE id='ELM-001'");
    await db.query("UPDATE public.inventario_empresa SET perfil=jsonb_set(perfil,'{nombre}',$1::jsonb)",[JSON.stringify('Empresa actual')]);
    await role(db,'operador');
    assert.deepEqual((await db.query('SELECT snapshot FROM public.inventario_informes WHERE id=$1',[request])).rows[0].snapshot,saved);
    await asOwner(db);
    await db.exec("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000002'::uuid $$");
    await role(db,'operador');
    await assert.rejects(()=>db.query(reportSaveSql,[request,JSON.stringify(payload)]),/otro informe/);
  } finally { await db.close(); }
});

test('report history rejects unauthorized access and malformed snapshots and preserves more than 1000 report rows', async () => {
  const db=await database();
  try {
    await db.exec(reportHistoryMigration);
    await role(db,'sin_rol');
    await assert.rejects(()=>db.query(reportSaveSql,['28000000-0000-0000-0000-000000000002',JSON.stringify(reportPayload())]),/No autorizado/);
    assert.equal((await db.query('SELECT count(*) AS n FROM public.inventario_informes')).rows[0].n,0);
    await asOwner(db); await db.exec('SET ROLE anon');
    await assert.rejects(()=>db.query('SELECT * FROM public.inventario_informes'),/permission denied/);
    await assert.rejects(()=>db.query(reportSaveSql,['28000000-0000-0000-0000-000000000002','{}']),/permission denied/);
    await asOwner(db); await role(db,'admin');
    const request='28000000-0000-0000-0000-000000000003';
    for (const invalid of [{}, {...reportPayload(),rows:[]}, {...reportPayload(),rows:[reportPayload().rows[0],reportPayload().rows[0]]}, {...reportPayload(),pendingWeight:100}, {...reportPayload(),rows:[{...reportPayload().rows[0],unitWeight:{valor:-1,unidad:'g'}}]}]) {
      await assert.rejects(()=>db.query(reportSaveSql,[request,JSON.stringify(invalid)]),/inválid|empresa/);
    }
    assert.equal((await db.query('SELECT count(*) AS n FROM public.inventario_informes')).rows[0].n,0);
    const large=reportPayload(); large.rows=Array.from({length:1203},(_,index)=>({...large.rows[0],id:String(index)}));
    large.quantities=[{unit:'UND',quantity:2406}]; large.weightKg=601.5; large.valueCOP=240600;
    const saved=(await db.query(reportSaveSql,[request,JSON.stringify(large)])).rows[0].report;
    assert.equal(saved.rows.length,1203);
    assert.equal((await db.query('SELECT product_count FROM public.inventario_informes')).rows[0].product_count,1203);
  } finally { await db.close(); }
});

test('admin can correct item units without converting quantities or changing historical snapshots; future movements use the new unit', async () => {
  const db=await database();
  try {
    const original=(await db.query('SELECT * FROM public.elementos ORDER BY id')).rows;
    await db.exec(editUnitMigration);await db.exec(editUnitMigration);
    assert.deepEqual((await db.query('SELECT * FROM public.elementos ORDER BY id')).rows,original);
    await role(db,'admin');
    assert.equal((await db.query('SELECT public.inventory_item_unit_edit_ready() AS ready')).rows[0].ready,true);
    assert.equal((await db.query("SELECT has_column_privilege(current_user,'public.elementos','cantidad','UPDATE') AS allowed")).rows[0].allowed,false);
    const dispatch='SELECT public.dispatch_inventory_with_photos($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb) AS rem';
    const args=['29000000-0000-0000-0000-000000000001','PROY-001','Entrega','Admin','Recibe','','',JSON.stringify([{elementoId:'ELM-001',cantidad:1}]),'{}','[]'];
    const first=(await db.query(dispatch,args)).rows[0].rem;
    const before=(await db.query("SELECT * FROM public.elementos WHERE id='ELM-001'")).rows[0];
    const history=(await db.query("SELECT * FROM public.historial WHERE elemento_id='ELM-001' ORDER BY id")).rows;
    const changed=(await db.query("UPDATE public.elementos SET unidad='MTS' WHERE id='ELM-001' RETURNING *")).rows[0];
    assert.equal(changed.unidad,'MTS');assert.equal(Number(changed.cantidad),Number(before.cantidad));
    for(const invalid of ['', '   ', null, 'X'.repeat(41)]) await assert.rejects(()=>db.query("UPDATE public.elementos SET unidad=$1 WHERE id='ELM-001'",[invalid]),/Unidad de medida inválida/);
    assert.deepEqual(changed.especificaciones,before.especificaciones);assert.equal(changed.cantidad_danados,before.cantidad_danados);
    assert.deepEqual((await db.query("SELECT * FROM public.historial WHERE elemento_id='ELM-001' ORDER BY id")).rows,history);
    assert.deepEqual((await db.query(dispatch,args)).rows[0].rem,first);
    assert.deepEqual((await db.query('SELECT items FROM public.remisiones WHERE id=$1',[first.id])).rows[0].items,first.items);
    for(const value of ['operador','consulta']){
      await role(db,value);
      await assert.rejects(()=>db.query('SELECT public.inventory_item_unit_edit_ready()'),/No autorizado/);
      assert.equal((await db.query("UPDATE public.elementos SET unidad='KG' WHERE id='ELM-001' RETURNING id")).rows.length,0);
    }
    await role(db,'operador');
    const next=[...args];next[0]='29000000-0000-0000-0000-000000000002';
    const second=(await db.query(dispatch,next)).rows[0].rem;
    assert.equal(second.items[0].unidad,'mts');assert.notEqual(first.items[0].unidad,second.items[0].unidad);
    assert.equal(await itemStock(db),Number(before.cantidad)-1);
    assert.equal((await db.query('SELECT unidad FROM public.historial WHERE remision_id=$1',[second.id])).rows[0].unidad,'MTS');
  } finally {await db.close();}
});

const autoLocationSql='SELECT public.create_inventory_location_auto($1::uuid,$2,$3::jsonb) AS row';
const autoCategorySql='SELECT public.create_inventory_category_auto($1::uuid,$2,$3) AS catalog';
const autoId=(number)=>'29100000-0000-0000-0000-'+String(number).padStart(12,'0');
test('automatic location migration preserves existing data, continues global sequences beyond 999 and keeps codes immutable',async()=>{
 const db=await database();try{
  await db.exec("INSERT INTO public.almacenes(id,codigo,nombre) VALUES('AUTO-W','ALM009','Almacén anterior'); INSERT INTO public.estanterias(id,codigo,nombre,almacen_id) VALUES('AUTO-R','EST-999','Estantería anterior','AUTO-W'); INSERT INTO public.niveles_estanteria(id,codigo,nombre,estanteria_id) VALUES('AUTO-L','NIV007','Nivel anterior','AUTO-R'); INSERT INTO public.cajas(id,codigo,nombre,estanteria_id,nivel_id) VALUES('AUTO-B','CAJ012','Caja anterior','AUTO-R','AUTO-L')");
  const tables=['elementos','almacenes','estanterias','niveles_estanteria','cajas','historial','remisiones'];
  const before=await Promise.all(tables.map(async table=>(await db.query('SELECT * FROM public.'+table+' ORDER BY id')).rows));
  const categories=(await db.query('SELECT id,nombre,activo FROM public.inventario_categorias ORDER BY id')).rows;
  await db.exec(automaticCodesMigration);await db.exec(automaticCodesMigration);
  for(const [index,table] of tables.entries())assert.deepEqual((await db.query('SELECT * FROM public.'+table+' ORDER BY id')).rows,before[index]);
  assert.deepEqual((await db.query('SELECT id,nombre,activo FROM public.inventario_categorias ORDER BY id')).rows,categories);
  await role(db,'admin');
  const create=async(n,kind,payload)=>(await db.query(autoLocationSql,[autoId(n),kind,JSON.stringify(payload)])).rows[0].row;
  const warehouse=await create(1,'almacen',{nombre:'Nuevo almacén',ciudad:'Honda'});assert.equal(warehouse.codigo,'ALM010');
  const rack=await create(2,'estanteria',{nombre:'Nuevo estante',parent_id:warehouse.id});assert.equal(rack.codigo,'EST1000');
  const level=await create(3,'nivel',{nombre:'Nuevo nivel',parent_id:rack.id});assert.equal(level.codigo,'NIV008');
  const box=await create(4,'caja',{parent_id:rack.id,nivel_id:level.id});assert.equal(box.codigo,'CAJ013');assert.equal(box.nombre,'CAJ013');
  assert.deepEqual(await create(2,'estanteria',{nombre:'Nuevo estante',parent_id:warehouse.id}),rack);
  await assert.rejects(()=>create(2,'estanteria',{nombre:'Datos diferentes',parent_id:warehouse.id}),/otros datos/);
  for(const [table,row] of [['almacenes',warehouse],['estanterias',rack],['niveles_estanteria',level],['cajas',box]]){
   await assert.rejects(()=>db.query('UPDATE public.'+table+" SET codigo='EDITADO' WHERE id=$1",[row.id]),/no se puede modificar/);
  }
  await db.query("UPDATE public.estanterias SET nombre='Nombre modificado' WHERE id=$1",[rack.id]);
  assert.equal((await db.query('SELECT codigo FROM public.estanterias WHERE id=$1',[rack.id])).rows[0].codigo,rack.codigo);
  await asOwner(db);await db.exec(automaticCodesMigration);await role(db,'admin');
  const next=await create(5,'estanteria',{nombre:'Otro estante',parent_id:'AUTO-W'});assert.equal(next.codigo,'EST1001');
  const direct=(await db.query("INSERT INTO public.almacenes(id,codigo,nombre) VALUES('AUTO-DIRECT','MANUAL','Creación anterior') RETURNING codigo")).rows[0];assert.equal(direct.codigo,'ALM011');
 }finally{await db.close();}
});

test('category codes backfill three unique letters without changing names, identities or product references and survive rename/retry',async()=>{
 const db=await database();try{
  await db.exec("INSERT INTO public.inventario_categorias(id,nombre) VALUES('CABLES_RED','Cables redes'),('CABLES_DUP','CABLES')");
  await db.exec("UPDATE public.elementos SET categoria='SIN_CATALOGO' WHERE id='ELM-001'");
  const before=(await db.query('SELECT id,nombre,activo FROM public.inventario_categorias ORDER BY id')).rows;
  const products=(await db.query('SELECT * FROM public.elementos ORDER BY id')).rows;
  await db.exec(automaticCodesMigration);await role(db,'admin');
  const catalog=(await db.query('SELECT public.inventory_data_catalog() AS c')).rows[0].c;
  assert.equal(new Set(catalog.categorias.map(c=>c.codigo)).size,before.length+1);
  assert.ok(catalog.categorias.every(c=>/^[A-Z]{3}$/.test(c.codigo)));
  assert.deepEqual(catalog.categorias.filter(c=>c.id!=='SIN_CATALOGO').map(({id,nombre,activo})=>({id,nombre,activo})).sort((a,b)=>a.id.localeCompare(b.id)),before.toSorted((a,b)=>a.id.localeCompare(b.id)));
  assert.deepEqual((await db.query('SELECT * FROM public.elementos ORDER BY id')).rows,products);
  const created=(await db.query(autoCategorySql,[autoId(11),'Cables especiales',true])).rows[0].catalog;
  const category=created.categorias.find(c=>c.nombre==='Cables especiales');assert.match(category.codigo,/^[A-Z]{3}$/);assert.notEqual(category.id,category.codigo);
  const repeated=(await db.query(autoCategorySql,[autoId(11),'Cables especiales',true])).rows[0].catalog;
  assert.equal(repeated.categorias.length,created.categorias.length);
  const reused=(await db.query(autoCategorySql,[autoId(12),'  Cables   especiales  ',true])).rows[0].catalog;assert.equal(reused.categorias.length,created.categorias.length);
  const prefix=created.prefijos[0];
  const newItem=(await db.query('SELECT public.create_inventory_item_auto($1,$2::uuid,$3::jsonb) AS item',[prefix.id,autoId(13),JSON.stringify({nombre:'Producto de categoría nueva',categoria:category.id,cantidad:0,stock_minimo:0,unidad:'UND'})])).rows[0].item;assert.equal(newItem.categoria,category.id);
  const edited=(await db.query('SELECT public.save_inventory_catalog_entry($1,$2::jsonb) AS c',['categoria',JSON.stringify({id:category.id,nombre:'Nombre conservando código',activo:true})])).rows[0].c;
  assert.equal(edited.categorias.find(c=>c.id===category.id).codigo,category.codigo);
  await asOwner(db);
  await assert.rejects(()=>db.query("UPDATE public.inventario_categorias SET codigo='ZZZ' WHERE id=$1",[category.id]),/no se puede modificar/);
  await assert.rejects(()=>db.query("UPDATE public.inventario_categorias SET id='OTRA' WHERE id=$1",[category.id]),/no se puede modificar/);
  await db.exec(automaticCodesMigration);assert.equal((await db.query('SELECT codigo FROM public.inventario_categorias WHERE id=$1',[category.id])).rows[0].codigo,category.codigo);
 }finally{await db.close();}
});

test('automatic code creation rejects unprivileged access and mismatched parents without consuming sequences or duplicating requests',async()=>{
 const db=await database();try{
  await db.exec(automaticCodesMigration);
  for(const value of ['operador','consulta','sin_rol']){
   await role(db,value);
   await assert.rejects(()=>db.query(autoLocationSql,[autoId(21),'almacen','{"nombre":"No autorizado"}']),/No autorizado/);
   await assert.rejects(()=>db.query(autoCategorySql,[autoId(22),'No autorizada',true]),/No autorizado/);
   await assert.rejects(()=>db.query('SELECT * FROM public.inventario_ubicacion_consecutivos'),/permission denied/);
   await assert.rejects(()=>db.query("SELECT public.next_inventory_category_code('Manual')"),/permission denied/);
  }
  await asOwner(db);await db.exec('SET ROLE anon');
  await assert.rejects(()=>db.query(autoLocationSql,[autoId(21),'almacen','{}']),/permission denied/);
  await asOwner(db);const counters=(await db.query('SELECT * FROM public.inventario_ubicacion_consecutivos ORDER BY prefijo')).rows;await role(db,'admin');
  await assert.rejects(()=>db.query(autoLocationSql,[autoId(23),'nivel','{"nombre":"Error","parent_id":"inexistente"}']),/not present|no existe|not found|foreign key/);
  await assert.rejects(()=>db.query(autoLocationSql,[autoId(24),'caja','{}']),/nivel/);
  await assert.rejects(()=>db.query(autoCategorySql,[autoId(25),'',true]),/inválido/);
  await asOwner(db);assert.deepEqual((await db.query('SELECT * FROM public.inventario_ubicacion_consecutivos ORDER BY prefijo')).rows,counters);
  assert.equal((await db.query('SELECT count(*) AS n FROM public.inventario_autocodigo_solicitudes')).rows[0].n,0);
  await role(db,'admin');const result=(await db.query(autoLocationSql,[autoId(21),'almacen','{"nombre":"Autorizado"}'])).rows[0].row;
  await asOwner(db);await db.exec("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000002'::uuid $$");await role(db,'admin');
  await assert.rejects(()=>db.query(autoLocationSql,[autoId(21),'almacen','{"nombre":"Autorizado"}']),/otros datos/);
  assert.ok(result.codigo.startsWith('ALM'));
 }finally{await db.close();}
});

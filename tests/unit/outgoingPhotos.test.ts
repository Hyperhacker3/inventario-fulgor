import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OutgoingPhotoSubmission } from '../../src/domain/outgoingPhotos';
import { evidenceSize } from '../../src/shared/evidenceCanvas';
import { uploadOutgoingImage } from '../../src/shared/outgoingImageUpload';
import { isDatabaseRejection } from '../../src/data/databaseErrors';

test('evidence keeps the entire portrait or landscape frame within 1200 pixels without upscaling',()=>{
  assert.deepEqual(evidenceSize(1600,900),{width:1200,height:675});
  assert.deepEqual(evidenceSize(900,1600),{width:675,height:1200});
  assert.deepEqual(evidenceSize(200,300),{width:200,height:300});
  assert.throws(()=>evidenceSize(0,300),/dimensiones/);
});
test('outgoing uploads use a separate bucket, signed-in owner and stable dispatch folder',async()=>{
  const calls:{bucket:string;path:string;options:unknown}[]=[];
  const db={auth:{getUser:async()=>({data:{user:{id:'account'}},error:null})},storage:{from:(bucket:string)=>({upload:async(path:string,_image:Blob,options:unknown)=>{calls.push({bucket,path,options});return{error:null};}})}} as unknown as Pick<SupabaseClient,'auth'|'storage'>;
  const ref=await uploadOutgoingImage(db,new Blob(['test'],{type:'image/jpeg'}),'request');
  assert.equal(calls[0].bucket,'outgoing-images'); assert.match(calls[0].path,/^account\/request\/[0-9a-f-]+\.jpg$/);
  assert.equal(ref,`outgoing://${calls[0].path}`); assert.deepEqual(calls[0].options,{contentType:'image/jpeg',upsert:false});
});

test('outgoing WebP uploads keep their request folder and use JPEG only for an explicit MIME rejection', async () => {
  const calls: { path: string; type: string; options: unknown }[] = [];
  let denyWebp = false, permissionError = false;
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'account' } }, error: null }) },
    storage: { from: () => ({ upload: async (path: string, image: Blob, options: unknown) => {
      calls.push({ path, type: image.type, options });
      return { error: permissionError ? { message: 'No autorizado' } : denyWebp && image.type === 'image/webp' ? { message: 'mime type image/webp is not supported', statusCode: '415' } : null };
    } }) } } as unknown as Pick<SupabaseClient, 'auth' | 'storage'>;
  const webp = new Blob(['photo'], { type: 'image/webp' }), jpeg = new Blob(['photo'], { type: 'image/jpeg' });
  let fallbackCalls = 0;
  const fallback = async () => { fallbackCalls++; return jpeg; };
  assert.match(await uploadOutgoingImage(db, webp, 'request', fallback), /^outgoing:\/\/account\/request\/[\da-f-]+\.webp$/);
  assert.deepEqual(calls[0].options, { contentType: 'image/webp', upsert: false });
  denyWebp = true;
  assert.match(await uploadOutgoingImage(db, webp, 'request', fallback), /\.jpg$/);
  assert.equal(fallbackCalls, 1);
  permissionError = true;
  await assert.rejects(uploadOutgoingImage(db, webp, 'request', fallback), /No autorizado/);
  assert.equal(fallbackCalls, 1);
});
test('a lost dispatch response preserves evidence and retries the exact files without reuploading',async()=>{
  const submission=new OutgoingPhotoSubmission<string>();
  const uploaded:string[]=[],removed:string[]=[],committed:string[][]=[];
  const ops={save:async(source:string)=>{uploaded.push(source);return`outgoing://${source}`;},remove:async(source:string)=>{removed.push(source);}};
  let fail=true;
  const commit=async(refs:string[])=>{committed.push([...refs]);if(fail)throw new Error('Respuesta perdida');return'saved';};
  await assert.rejects(()=>submission.submit('req',{cantidad:4},['one','two'],ops,commit),/Respuesta perdida/);
  assert.deepEqual(removed,[]); assert.equal(submission.has('req'),true);
  await assert.rejects(()=>submission.submit('req',{cantidad:2},['one','two'],ops,commit),/pendiente cambió/);
  fail=false;
  assert.equal(await submission.submit('req',{cantidad:4},['one','two'],ops,commit),'saved');
  assert.deepEqual(uploaded,['one','two']); assert.deepEqual(committed,[['outgoing://one','outgoing://two'],['outgoing://one','outgoing://two']]);
  assert.equal(submission.has('req'),false);
});
test('partial photo uploads are removed before any stock transaction is attempted',async()=>{
  const submission=new OutgoingPhotoSubmission<void>(),removed:string[]=[];
  let commits=0;
  await assert.rejects(()=>submission.submit('req',{},['one','two'],{save:async(source)=>{if(source==='two')throw new Error('Sin conexión');return`outgoing://${source}`;},remove:async(source)=>{removed.push(source);}},async()=>{commits++;}),/Sin conexión/);
  assert.equal(commits,0);assert.deepEqual(removed,['outgoing://one']);assert.equal(submission.has('req'),false);
});
test('a confirmed first database rollback releases its files and allows correcting the outgoing form',async()=>{
  const submission=new OutgoingPhotoSubmission<string>(),removed:string[]=[];
  const ops={save:async(source:string)=>`outgoing://${source}`,remove:async(source:string)=>{removed.push(source);},definitelyRejected:isDatabaseRejection};
  await assert.rejects(()=>submission.submit('req',{quantity:999},['one'],ops,async()=>{throw Object.assign(new Error('Stock insuficiente'),{code:'P0001'});}),/Stock insuficiente/);
  assert.equal(submission.has('req'),false);assert.deepEqual(removed,['outgoing://one']);
  assert.equal(await submission.submit('req',{quantity:1},['one'],ops,async()=>'saved'),'saved');
  assert.equal(isDatabaseRejection(new Error('Failed to fetch')),false);
});

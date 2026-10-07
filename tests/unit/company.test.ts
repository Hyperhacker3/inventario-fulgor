import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_COMPANY, mapCompany, validateCompany } from '../../src/domain/company';
import { mapRemision } from '../../src/data/mappers';
import { RemissionHeader } from '../../src/components/remission/RemissionSections';
import { CompanyProfileForm } from '../../src/components/administration/CompanyProfileEditor';
import { prepareCompanyLogo } from '../../src/shared/companyLogo';
import type { CompanyProfile, CompanySettings } from '../../src/types';

const dom = new JSDOM('<html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const logo = 'data:image/png;base64,iVBORw0KGgo=';
const custom = { nombre: 'Empresa guardada', nit: '900.123.456-1', direccion: 'Calle 20', telefono: '+57 1234', logo };

test('company validates shared data, preserves text NIT and rejects unsafe logo sources and excess lengths', () => {
  assert.deepEqual(mapCompany(undefined), DEFAULT_COMPANY);
  assert.deepEqual(validateCompany({ ...custom, nombre: '  Empresa   guardada ' }), custom);
  assert.equal(mapCompany({ ...custom, nit: '001.234.567-8' }).nit, '001.234.567-8');
  for (const patch of [{nombre:''}, {nombre:'a'.repeat(121)}, {nit:'abc'}, {direccion:'a'.repeat(241)}, {telefono:'a'.repeat(61)},
    {logo:'https://external.example/logo.png'}, {logo:'data:image/svg+xml;base64,PHN2Zz4='}, {logo:'data:image/png;base64,'+'A'.repeat(160000)}]) {
    assert.throws(() => validateCompany({ ...custom, ...patch }));
  }
  assert.equal(mapCompany({ ...custom, logo:'javascript:alert(1)' }).logo, DEFAULT_COMPANY.logo);
});

test('printed header places NIT directly beneath the logo for legacy and snapshotted remissions with company contact data', () => {
  for (const company of [undefined, custom]) {
    const remission = mapRemision({ numero_remision:'REM-1', empresa:company, items:[] });
    const markup = renderToStaticMarkup(h(RemissionHeader, { remision:remission }));
    const document = new JSDOM(markup).window.document, brand = document.querySelector('.rm-company')!;
    const image = brand.querySelector('img')!;
    assert.equal(image.nextElementSibling!.textContent, `NIT: ${(company ?? DEFAULT_COMPANY).nit}`);
    assert.equal(image.getAttribute('src'), (company ?? DEFAULT_COMPANY).logo);
    assert.match(brand.textContent!, new RegExp((company ?? DEFAULT_COMPANY).nombre));
    if (company) { assert.match(brand.textContent!, /Calle 20/); assert.match(brand.textContent!, /Tel.: \+57 1234/); }
    assert.deepEqual(remission.empresa, company ?? DEFAULT_COMPANY);
  }
});

async function form(canEdit: boolean, onSave: (profile: CompanyProfile, version: number) => Promise<CompanySettings>, check: (host: HTMLElement) => Promise<void>) {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(CompanyProfileForm, { initial: { perfil:DEFAULT_COMPANY, version:1 }, canEdit, onSave })));
    await check(host);
  } finally { await act(() => root.unmount()); host.remove(); }
}
async function type(host: HTMLElement, id: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(`#${id}`)!;
  await act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input,value);
    input.dispatchEvent(new dom.window.Event('input', {bubbles:true}));
  });
}
const submit = async (host: HTMLElement) => { await act(async () => { host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', {bubbles:true,cancelable:true})); }); };

test('company form preserves failed drafts, confirms server data and uses the returned revision for subsequent saves', async () => {
  const versions: number[] = []; let fail = true;
  await form(true, async (profile, version) => {
    versions.push(version); if (fail) throw new Error('Sin conexión'); return { perfil:profile,version:version+1 };
  }, async host => {
    await type(host,'company-name','Empresa editada'); await type(host,'company-nit','900.123.456-1');
    await type(host,'company-address','Calle 10'); await type(host,'company-phone','555 000');
    await submit(host); assert.match(host.querySelector('[role="alert"]')!.textContent!, /Sin conexión/);
    assert.equal(host.querySelector<HTMLInputElement>('#company-name')!.value,'Empresa editada');
    assert.equal(host.querySelector('[role="status"]'),null);
    fail = false; await submit(host); assert.match(host.querySelector('[role="status"]')!.textContent!, /guardados/);
    await type(host,'company-phone','555 111'); await submit(host); assert.deepEqual(versions,[1,1,2]);
  });
});

test('company form blocks non-admin writes, validation errors and duplicate submissions while saving', async () => {
  let calls = 0;
  await form(false, async () => { calls++; return {perfil:custom,version:2}; }, async host => {
    assert.equal(host.querySelector('fieldset')!.disabled,true); assert.equal(host.querySelector('[type="submit"]'),null);
    await submit(host); assert.equal(calls,0);
  });
  let resolve!: (value: CompanySettings) => void;
  await form(true, async () => { calls++; return new Promise<CompanySettings>(done => { resolve=done; }); }, async host => {
    await type(host,'company-nit','incorrecto'); await submit(host); assert.equal(calls,0); assert.match(host.querySelector('[role="alert"]')!.textContent!, /NIT/);
    await type(host,'company-nit',DEFAULT_COMPANY.nit);
    await act(() => {
      for (let index=0;index<2;index++) host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
    });
    assert.equal(calls,1); assert.equal(host.querySelector('fieldset')!.disabled,true);
    await act(async () => { resolve({perfil:DEFAULT_COMPANY,version:2}); });
    assert.equal(host.querySelector('fieldset')!.disabled,false);
  });
});

test('logo upload preserves proportions, uses PNG for transparency and closes decoded images; invalid files are rejected', async () => {
  const previousBitmap = globalThis.createImageBitmap, previousContext = dom.window.HTMLCanvasElement.prototype.getContext;
  const previousData = dom.window.HTMLCanvasElement.prototype.toDataURL;
  let closed = 0; const draws: number[][] = [];
  try {
    globalThis.createImageBitmap = async () => ({width:450,height:900,close:() => {closed++;}} as ImageBitmap);
    dom.window.HTMLCanvasElement.prototype.getContext = (() => ({drawImage: (_image: unknown, ...args: number[]) => { draws.push(args); }})) as unknown as typeof previousContext;
    dom.window.HTMLCanvasElement.prototype.toDataURL = function (type) { assert.equal(type,'image/png'); return logo; };
    assert.equal(await prepareCompanyLogo(new File(['image'],'logo.png',{type:'image/png'})),logo);
    assert.deepEqual(draws,[[0,0,120,240]]); assert.equal(closed,1);
    await assert.rejects(() => prepareCompanyLogo(new File(['svg'],'logo.svg',{type:'image/svg+xml'})),/PNG/);
    await assert.rejects(() => prepareCompanyLogo(new File([new Uint8Array(5*1024*1024+1)],'large.png',{type:'image/png'})),/5 MB/);
    assert.equal(closed,1);
  } finally {
    globalThis.createImageBitmap = previousBitmap;
    dom.window.HTMLCanvasElement.prototype.getContext = previousContext; dom.window.HTMLCanvasElement.prototype.toDataURL = previousData;
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { mapElemento } from '../../src/data/mappers';
import { colombiaToday, emptyMaintenance, lifeRecordSections, maintenancePayload, mapMaintenance, nextMaintenance, normalizeLifeData,
  toolTypeFor, validateLifeData, validateMaintenance, type LifeData, type LifeRecord, type MaintenanceInput, type MaintenanceRecord } from '../../src/domain/toolLifeRecord';
import type { Categoria, UserProfile } from '../../src/types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const { ItemDetailContent } = await import('../../src/components/ItemDetailModal');
const { ToolLifeRecordDialog } = await import('../../src/components/tools/ToolLifeRecordDialog');

const categories: Categoria[] = [{ id: 'HERRAMIENTAS_ELECTRICAS', nombre: 'HERRAMIENTAS ELÉCTRICAS', activo: true, hoja_vida_tipo: 'ELECTRICA' },
  { id: 'HERRAMIENTAS_COMBUSTION', nombre: 'HERRAMIENTAS A COMBUSTIÓN', activo: true, hoja_vida_tipo: 'COMBUSTION' }, { id: 'CABLES', nombre: 'CABLES', activo: true }];
const tool = mapElemento({ id: 'TOOL-1', codigo: 'HER001', nombre: 'TALADRO PERCUTOR', categoria: 'HERRAMIENTAS_ELECTRICAS', cantidad: 2, unidad: 'UND',
  especificaciones: { marca: 'BOSCH', valor_unitario_cop: 350000 } });
const cable = { ...tool, id: 'CAB-1', codigo: 'CAB001', categoria: 'CABLES' };
const TODAY = '2026-11-26';

test('only the two tool categories have a life record, with technical fields by tool type', () => {
  assert.equal(toolTypeFor(tool, categories), 'ELECTRICA');
  assert.equal(toolTypeFor({ categoria: 'HERRAMIENTAS_COMBUSTION' }, categories), 'COMBUSTION');
  assert.equal(toolTypeFor(cable, categories), null); assert.equal(toolTypeFor(null, categories), null);
  const keys = (type: 'ELECTRICA' | 'COMBUSTION') => lifeRecordSections(type).flatMap(section => section.fields.map(field => field.key));
  assert.ok(keys('ELECTRICA').includes('voltaje')); assert.ok(!keys('ELECTRICA').includes('cilindrada'));
  assert.ok(keys('COMBUSTION').includes('cilindrada')); assert.ok(keys('COMBUSTION').includes('mezcla_aceite')); assert.ok(!keys('COMBUSTION').includes('voltaje'));
  for (const type of ['ELECTRICA', 'COMBUSTION'] as const)
    for (const key of ['modelo', 'numero_serie', 'fecha_adquisicion', 'proveedor', 'garantia_hasta', 'responsable', 'frecuencia_mantenimiento', 'epp_requerido', 'recomendaciones_seguridad'])
      assert.ok(keys(type).includes(key), `${type} includes ${key}`);
  assert.deepEqual(normalizeLifeData({ modelo: ' GSB ', numero_serie: '  ', cilindrada: '196 cc' }), { modelo: 'GSB', cilindrada: '196 cc' });
  for (const [data, message] of [[{ modelo: 'x'.repeat(201) }, /200/], [{ fecha_adquisicion: '2026-02-30' }, /fecha válida/],
    [{ anio_fabricacion: '1850' }, /1900/], [{ observaciones: 'x'.repeat(2001) }, /2000/]] as [LifeData, RegExp][])
    assert.throws(() => validateLifeData(data, 'ELECTRICA'), message);
  assert.doesNotThrow(() => validateLifeData({ fecha_adquisicion: '2024-02-29', anio_fabricacion: '2024', cilindrada: 'ignored for electric' }, 'ELECTRICA'));
});

test('maintenance validation, payload, Colombian date and next maintenance follow the Supabase rules', () => {
  assert.equal(colombiaToday(new Date('2026-11-27T03:00:00Z')), '2026-11-26');
  const valid: MaintenanceInput = { ...emptyMaintenance(TODAY), descripcion: ' Cambio de carbones ', realizadoPor: ' Taller ', costoCop: 45000.5, horasUso: 12.5, proximaFecha: '2027-01-10' };
  assert.doesNotThrow(() => validateMaintenance(valid, TODAY));
  for (const [patch, message] of [[{ fecha: '2026-11-27' }, /futura/], [{ tipo: 'LAVADO' }, /tipo/], [{ descripcion: ' ' }, /Describa/], [{ realizadoPor: '' }, /quién/],
    [{ costoCop: -1 }, /costo/], [{ costoCop: 1.005 }, /dos decimales/], [{ horasUso: 1.25 }, /un decimal/], [{ proximaFecha: '2026-01-01' }, /posterior/]] as [Partial<MaintenanceInput>, RegExp][])
    assert.throws(() => validateMaintenance({ ...valid, ...patch }, TODAY), message);
  assert.deepEqual(maintenancePayload(valid), { fecha: TODAY, tipo: 'PREVENTIVO', descripcion: 'Cambio de carbones', realizado_por: 'Taller', repuestos: '',
    costo_cop: 45000.5, horas_uso: 12.5, proxima_fecha: '2027-01-10', observaciones: '' });
  assert.equal(maintenancePayload({ ...valid, proximaFecha: '' }).proxima_fecha, null);
  const row = mapMaintenance({ id: 'm1', fecha: '2026-11-20', tipo: 'PREVENTIVO', costo_cop: '45000.50', horas_uso: null, proxima_fecha: '2026-12-01', fotos: ['maintenance://a', 3] });
  assert.equal(row.costoCop, 45000.5); assert.equal(row.horasUso, null); assert.deepEqual(row.fotos, ['maintenance://a']);
  assert.deepEqual(nextMaintenance(row, TODAY), { date: '2026-12-01', days: 5, overdue: false });
  assert.deepEqual(nextMaintenance(row, '2026-12-03'), { date: '2026-12-01', days: -2, overdue: true });
  assert.equal(nextMaintenance({ ...row, proximaFecha: '' }, TODAY), null); assert.equal(nextMaintenance(undefined, TODAY), null);
});

const user = (role: UserProfile['role']): UserProfile => ({ name: 'Persona', email: 'p@app.test', avatar: '', role });
const detailInventory = (role: UserProfile['role'] = 'consulta') => ({ user: user(role), almacenes: [], estanterias: [], niveles: [], cajas: [], categorias: categories,
  updateElemento: async () => {}, deleteElemento: async () => {}, getLocationString: () => 'Bodega > A', categoryLabel: (id: string) => id,
  openQuickMovement: () => {}, addToDispatchCart: () => {} });
async function mount(element: ReturnType<typeof h>, check: (host: HTMLElement, rerender: (next: ReturnType<typeof h>) => Promise<void>) => Promise<void>) {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try { await act(() => root.render(element)); await check(host, async next => { await act(() => root.render(next)); }); }
  finally { await act(() => root.unmount()); host.remove(); }
}
// Buttons with an icon also contain the icon's ligature text before the label.
const buttonByText = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(row => row.textContent?.trim().endsWith(text) && !!row.textContent.trim().replace(text, '').match(/^[a-z_]*$/));
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

function services(initial: LifeRecord | null = null, rows: MaintenanceRecord[] = []) {
  const calls = { saves: [] as { version: number; datos: LifeData }[], registers: [] as { requestId: string; input: MaintenanceInput; photos: string[] }[], reads: 0 };
  let record = initial; const list = [...rows];
  let failSave: Error | null = null, failRegister: Error | null = null;
  return { calls, setFailSave: (value: Error | null) => { failSave = value; }, setFailRegister: (value: Error | null) => { failRegister = value; },
    value: {
      readRecord: async () => record,
      saveRecord: async (_id: string, version: number, datos: LifeData) => { calls.saves.push({ version, datos }); if (failSave) throw failSave;
        record = { datos, version: version + 1, updatedAt: '2026-11-26T15:00:00Z', updatedBy: 'Persona' }; return record; },
      readMaintenance: async () => { calls.reads++; return { rows: [...list], total: list.length }; },
      register: async (requestId: string, _id: string, input: MaintenanceInput, photos: string[]) => {
        calls.registers.push({ requestId, input, photos }); if (failRegister) throw failRegister;
        const saved = { ...input, id: `m-${list.length + 1}`, elementoId: tool.id, elementoCodigo: tool.codigo, elementoNombre: tool.nombre, fotos: [], registradoPor: 'Persona', createdAt: '' };
        list.unshift(saved); return saved; },
      resolvePhoto: async (source: string) => `https://signed.test/${source.slice(14)}`,
      today: () => TODAY,
    } };
}

test('the detail shows Ver hoja de vida only for tools and opens the record above it', async () => {
  const fake = services();
  await mount(h(ItemDetailContent, { item: cable, onClose: () => {}, inventory: detailInventory() }), async (_host, rerender) => {
    assert.equal(buttonByText('Ver hoja de vida'), undefined, 'other categories have no life record');
    await rerender(h(ItemDetailContent, { item: tool, onClose: () => {}, inventory: detailInventory(), lifeServices: fake.value }));
    const open = buttonByText('Ver hoja de vida')!;
    assert.ok(open); assert.equal(open.getAttribute('aria-pressed'), 'false');
    await act(() => open.click()); await settle();
    const dialog = document.querySelector<HTMLElement>('[data-tool-life-dialog]')!;
    assert.match(dialog.textContent!, /Hoja de vida · HER001/); assert.match(dialog.textContent!, /Herramienta eléctrica/);
    assert.match(dialog.textContent!, /Voltaje/); assert.doesNotMatch(dialog.textContent!, /Cilindrada/);
    assert.match(dialog.textContent!, /Aún no hay mantenimientos registrados/);
    assert.equal(document.querySelector('[role="dialog"][aria-labelledby="item-detail-heading"]')!.getAttribute('aria-hidden'), 'true', 'the detail is inert below');
    assert.equal(open.getAttribute('aria-pressed'), 'true');
    assert.equal(buttonByText('Editar datos'), undefined, 'read-only roles cannot edit');
    assert.equal(buttonByText('Registrar mantenimiento'), undefined, 'read-only roles cannot register');
  });
});

test('administration edits the life record with its version, keeping other data and the draft on conflicts', async () => {
  const fake = services({ datos: { modelo: 'GSB 13', cilindrada: 'dato anterior' }, version: 3, updatedAt: '2026-11-01T10:00:00Z', updatedBy: 'Otra persona' });
  await mount(h(ToolLifeRecordDialog, { item: tool, type: 'ELECTRICA', user: user('admin'), categoryLabel: (id: string) => id, location: 'Bodega', onClose: () => {}, services: fake.value }), async () => {
    await settle();
    const dialog = document.querySelector<HTMLElement>('[data-tool-life-dialog]')!;
    assert.match(dialog.textContent!, /GSB 13/); assert.match(dialog.textContent!, /Sin registrar/); assert.match(dialog.textContent!, /por Otra persona/);
    await act(() => buttonByText('Editar datos')!.click());
    const input = (label: string) => document.getElementById([...dialog.querySelectorAll<HTMLLabelElement>('label')].find(row => row.childNodes[0]?.textContent === label)!.htmlFor) as HTMLInputElement;
    assert.equal(input('Modelo').value, 'GSB 13');
    await act(() => { const target = input('Voltaje'); Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(target, ' 120 V '); target.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
    fake.setFailSave(new Error('La hoja de vida cambió en otra sesión. Actualice y vuelva a guardar'));
    await act(async () => { buttonByText('Guardar hoja de vida')!.click(); });
    assert.match(dialog.querySelector('[role="alert"]')!.textContent!, /otra sesión/);
    assert.equal(input('Voltaje').value, ' 120 V ', 'the draft survives the conflict');
    fake.setFailSave(null);
    await act(async () => { buttonByText('Guardar hoja de vida')!.click(); });
    assert.deepEqual(fake.calls.saves.at(-1), { version: 3, datos: { modelo: 'GSB 13', cilindrada: 'dato anterior', voltaje: '120 V' } }, 'keys of the other tool type are preserved');
    assert.match(dialog.textContent!, /Hoja de vida guardada/); assert.match(dialog.textContent!, /120 V/);
  });
});

test('operators register maintenance with validation, a reused request on retry and a refreshed history with photos', async () => {
  const previous = mapMaintenance({ id: 'm-0', fecha: '2026-10-01', tipo: 'CORRECTIVO', descripcion: 'Cambio de cable', realizado_por: 'TALLER', costo_cop: 20000,
    proxima_fecha: '2026-11-20', fotos: ['maintenance://user/request/photo.webp'], registrado_por: 'Persona' });
  const fake = services(null, [previous]);
  let closed = 0;
  await mount(h(ToolLifeRecordDialog, { item: tool, type: 'ELECTRICA', user: user('operador'), categoryLabel: (id: string) => id, location: 'Bodega', onClose: () => { closed++; }, services: fake.value }), async () => {
    await settle(); await settle();
    const dialog = document.querySelector<HTMLElement>('[data-tool-life-dialog]')!;
    assert.match(dialog.textContent!, /Mantenimiento vencido desde el/);
    assert.match(dialog.textContent!, /Cambio de cable/); assert.match(dialog.textContent!, /CORRECTIVO/);
    const link = dialog.querySelector<HTMLAnchorElement>('a[aria-label="Abrir foto 1 del mantenimiento"]')!;
    assert.equal(link.href, 'https://signed.test/user/request/photo.webp');
    assert.equal(buttonByText('Editar datos'), undefined, 'operators cannot edit the life record');
    await act(() => buttonByText('Registrar mantenimiento')!.click());
    const form = dialog.querySelector<HTMLFormElement>('form')!;
    // Empty required fields are stopped by the browser's own validation before the app validates.
    await act(async () => { buttonByText('Guardar mantenimiento')!.click(); });
    assert.equal(form.checkValidity(), false); assert.equal(fake.calls.registers.length, 0);
    const type = async (selector: string, value: string) => act(() => {
      const target = dialog.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      const prototype = target instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(target, value); target.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    // Blank text passes the native check, so the shared validation explains what is missing.
    await type('textarea[maxlength="2000"]', '   ');
    await type('input[maxlength="120"]', 'Taller central');
    await act(async () => { buttonByText('Guardar mantenimiento')!.click(); });
    assert.match(dialog.querySelector('[role="alert"]')!.textContent!, /Describa el trabajo/); assert.equal(fake.calls.registers.length, 0);
    await type('textarea[maxlength="2000"]', 'Limpieza y lubricación');
    fake.setFailRegister(new Error('Respuesta desconocida'));
    await act(async () => { buttonByText('Guardar mantenimiento')!.click(); });
    assert.match(dialog.querySelector('[role="alert"]')!.textContent!, /Respuesta desconocida/);
    await act(() => { document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    fake.setFailRegister(null);
    const save = buttonByText('Guardar mantenimiento')!;
    await act(async () => { save.click(); save.click(); });
    await settle();
    assert.equal(fake.calls.registers.length, 2, 'a double click sends one request');
    assert.equal(fake.calls.registers[1].requestId, fake.calls.registers[0].requestId, 'the retry reuses the uncertain request');
    assert.equal(fake.calls.registers[1].input.descripcion, 'Limpieza y lubricación'); assert.equal(fake.calls.registers[1].input.fecha, TODAY);
    assert.match(dialog.textContent!, /Mantenimiento registrado/); assert.match(dialog.textContent!, /Historial de mantenimiento \(2\)/);
    assert.equal(buttonByText('Guardar mantenimiento'), undefined, 'the form closes after saving');
    assert.equal(closed, 1, 'Escape closes when nothing is pending');
  });
});

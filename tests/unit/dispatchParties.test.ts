import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement as h, Fragment, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectSelectorFields } from '../../src/components/dispatch/ProjectSelector';
import { DispatchPartiesFields } from '../../src/components/dispatch/DispatchPartiesFields';
import { TransportFields, ShipmentDates } from '../../src/components/dispatch/TransportFields';
import { emptyTransport } from '../../src/domain/remissionTransport';
import { RemissionHeader, RemissionClosing } from '../../src/components/remission/RemissionSections';
import { RemissionCard } from '../../src/components/remission/RemissionCard';
import { mapRemision } from '../../src/data/mappers';
import type { Proyecto } from '../../src/types';
import type { ProjectInput } from '../../src/state/useProjectActions';

const dom = new JSDOM('<html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
async function type(host: HTMLElement, selector: string, value: string) {
  await act(() => {
    const input = host.querySelector<HTMLInputElement>(selector)!;
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

test('inline project creation requires a city, preserves failed drafts and blocks double saves until the created project is selected', async () => {
  const inputs: ProjectInput[] = []; let fail = true;
  let finish!: (project: Proyecto) => void;
  function Form() {
    const [projects, setProjects] = useState<Proyecto[]>([]), [id, setId] = useState('');
    return h('form', null, h(ProjectSelectorFields, { projects, value: id, onChange: setId, canCreate: true, disabled: false,
      onCreate: async input => {
        inputs.push(input);
        if (fail) throw new Error('Sin conexión');
        const project = await new Promise<Proyecto>(resolve => { finish = resolve; });
        setProjects([project]); return project;
      } }));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const createButton = () => [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => /Crear y seleccionar/.test(button.textContent!))!;
  try {
    await act(() => root.render(h(Form)));
    await type(host, '#dispatch-project-name', ' Bogotá ');
    await act(() => createButton().click());
    assert.equal(inputs.length, 0); assert.match(host.querySelector('[role="alert"]')!.textContent!, /ciudad/);
    await type(host, '#dispatch-project-location', '  Bogotá  ');
    await act(async () => { createButton().click(); });
    assert.match(host.querySelector('[role="alert"]')!.textContent!, /Sin conexión/);
    assert.equal(host.querySelector<HTMLInputElement>('#dispatch-project-location')!.value, '  Bogotá  ');
    fail = false;
    await act(() => { const button = createButton(); button.click(); button.click(); });
    assert.equal(inputs.length, 2); assert.equal(host.querySelector('fieldset')!.disabled, true);
    assert.deepEqual(inputs[1], { nombre: 'Bogotá', ubicacion: 'Bogotá', cliente: '', estado: 'ACTIVO' });
    await act(async () => { finish({ ...inputs[1], id: 'P-1', createdAt: '2026-10-27' }); });
    assert.equal(host.querySelector<HTMLSelectElement>('#select-dispatch-project-value')!.value, 'P-1');
    assert.equal(host.querySelector('#dispatch-project-location'), null);
    assert.match(host.textContent!, /Bogotá/);
    assert.equal(host.querySelector('form')!.checkValidity(), true);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('existing project selection preserves location and client metadata while non-admins cannot create projects', async () => {
  const project: Proyecto = { id: 'P-1', nombre: 'Bogotá', cliente: 'Cliente histórico', ubicacion: 'Dirección guardada', estado: 'ACTIVO', createdAt: '' };
  const before = structuredClone(project); let selected = '', writes = 0;
  function Form({ disabled = false }: { disabled?: boolean }) {
    const [id, setId] = useState('');
    return h(ProjectSelectorFields, { projects: [project], value: id, onChange: value => { selected = value; setId(value); },
      canCreate: false, disabled, onCreate: async () => { writes++; return project; } });
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Form)));
    await type(host, '#dispatch-project-name', 'Bogotá');
    assert.equal(selected, 'P-1'); assert.match(host.textContent!, /Dirección guardada/);
    assert.equal(host.querySelector('#dispatch-project-location'), null);
    await type(host, '#dispatch-project-name', 'Proyecto nuevo');
    assert.match(host.textContent!, /solicite a administración/);
    assert.equal([...host.querySelectorAll('button')].some(button => /Crear y seleccionar/.test(button.textContent!)), false);
    await act(() => root.render(h(Form, { disabled: true })));
    assert.ok(host.querySelector('input')!.matches(':disabled'));
    assert.equal(writes, 0); assert.deepEqual(project, before);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('sender, recipient and carrier contacts are independent and changing a phone preserves vehicle and shipment dates', async () => {
  const initial = { ...emptyTransport(), telefonoRemite: '111', telefonoRecibe: '222', telefonoTransportador: '333',
    transportador: 'Conductor', cedulaTransportador: '00123', placaVehiculo: 'ABC123', fechaDespacho: '2026-10-27' };
  let saved = initial;
  function Form({ disabled = false }: { disabled?: boolean }) {
    const [transport, setTransport] = useState(initial), [recipient, setRecipient] = useState('Destinatario');
    saved = transport;
    return h('form', null, h('fieldset', { disabled },
      h(DispatchPartiesFields, { sender: 'Almacenista', onSenderChange: () => {}, senderRole: 'Bodega', onSenderRoleChange: () => {},
        recipient, onRecipientChange: setRecipient, transport, onTransportChange: setTransport, contactsDisabled: disabled }),
      h(TransportFields, { value: transport, onChange: setTransport, disabled }), h(ShipmentDates, { value: transport, onChange: setTransport, disabled })));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(h(Form)));
    const section = (title: string) => [...host.querySelectorAll('fieldset')].find(field => field.querySelector(':scope > legend')?.textContent === title)!;
    const sender = section('Datos del remitente'), recipient = section('Datos del destinatario'), carrier = section('Datos del transportador y vehículo');
    assert.equal(sender.querySelectorAll('input').length, 3); assert.equal(recipient.querySelectorAll('input').length, 2);
    assert.equal(carrier.querySelectorAll('input').length, 4);
    assert.equal(recipient.querySelector('input')!.required, true);
    assert.doesNotMatch(host.textContent!, /RECIBE EN OBRA|CARGO DE QUIEN RECIBE/);
    const phone = recipient.querySelector<HTMLInputElement>('input[type="tel"]')!; phone.id = 'recipient-phone-test';
    await type(host, '#recipient-phone-test', '+57 999');
    assert.deepEqual(saved, { ...initial, telefonoRecibe: '+57 999' });
    await act(() => root.render(h(Form, { disabled: true })));
    assert.ok([...host.querySelectorAll('input')].every(input => input.matches(':disabled')));
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('printed remission separates the parties and uses the declared recipient once, retaining snapshots and legacy client fallback', () => {
  const rem = mapRemision({ numero_remision: 'REM-HONDA-TOLIMA-BOGOTA-CUNDINAMARCA-20261027-008', fecha: '2026-10-27',
    proyecto_nombre: 'Proyecto guardado', ubicacion: 'Ubicación guardada', cliente: 'Cliente del proyecto',
    entregado_por: 'Almacenista guardado', cargo_entregado: 'Almacén', recibido_por: 'Destinatario guardado', cargo_recibido: 'Cargo antiguo',
    datos_transporte: { ...emptyTransport(), telefonoRemite: '111', telefonoRecibe: '222', transportador: 'Conductor', telefonoTransportador: '333' } });
  const before = structuredClone(rem);
  const css = fs.readFileSync(new URL('../../src/components/remission/remission.css', import.meta.url), 'utf8');
  const markup = renderToStaticMarkup(h(Fragment, null, h(RemissionHeader, { remision: rem }), h(RemissionClosing, { remision: rem, notes: [], indices: [1, 2] })));
  const printed = new JSDOM(`<style>${css}</style><div class="rm-content">${markup}</div>`);
  try {
    const doc = printed.window.document, header = doc.querySelector('.rm-header')!;
    assert.match(doc.querySelector('.rm-sender')!.textContent!, /Almacenista guardado.*111/);
    assert.match(doc.querySelector('.rm-recipient')!.textContent!, /Cliente \/ destinatarioDestinatario guardado.*222/);
    assert.equal((header.textContent!.match(/Destinatario guardado/g) || []).length, 1);
    assert.doesNotMatch(header.textContent!, /Entregar a|Cargo antiguo|Cliente del proyecto/);
    assert.match(doc.querySelector('.rm-delivery')!.textContent!, /Conductor.*333/);
    assert.equal(doc.querySelector('.rm-code')!.textContent, rem.numeroRemision);
    assert.equal(doc.querySelector('.rm-brand')!.nextElementSibling, doc.querySelector('.rm-code'));
    const style = (selector: string) => printed.window.getComputedStyle(doc.querySelector(selector)!);
    assert.equal(style('.rm-brand').display, 'grid'); assert.equal(doc.querySelector('.rm-brand')!.children.length, 3);
    assert.equal(style('.rm-company').textAlign, 'center'); assert.equal(style('.rm-document-meta').textAlign, 'right');
    assert.equal(style('.rm-code').textAlign, 'left'); assert.equal(style('.rm-code').width, '100%'); assert.equal(style('.rm-code').fontSize, '18px');
    assert.match(renderToStaticMarkup(h(RemissionCard, { remission: rem, onPdf: () => {}, onPhotos: () => {} })), /Destinatario guardado/);
    const legacy = { ...rem, recibidoPor: '', cliente: 'Cliente histórico' };
    assert.match(renderToStaticMarkup(h(RemissionHeader, { remision: legacy })), /Cliente histórico/);
    assert.deepEqual(rem, before);
  } finally { printed.window.close(); }
});

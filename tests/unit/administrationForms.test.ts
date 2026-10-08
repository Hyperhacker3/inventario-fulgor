import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { CLOSE_DURATION } from '../../src/components/ui/Motion';
import { act, createElement as h } from 'react';
import { CatalogManager } from '../../src/components/administration/CatalogEditor';
import { ProjectsManager } from '../../src/components/ProjectsView';
import type { Proyecto, UserProfile } from '../../src/types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const user: UserProfile = { name: 'Administrador', email: 'admin@example.test', role: 'admin', avatar: '' };
const button = (container: ParentNode, label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(value => value.textContent === label)!;
const change = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
};
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, CLOSE_DURATION + 30)); });
const submit = () => document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

for (const kind of ['prefijo', 'categoria'] as const) test(`${kind} opens only on request, preserves failed edits and closes after a confirmed save`, async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const calls: Record<string, unknown>[] = [];
  let fail = true;
  const prefijos = [{ id: 'PREF-1', prefijo: 'CAB', nombre: 'Cables', activo: true, ultimo: 10 }];
  const categorias = [{ id: 'ELECTRICO', nombre: 'Eléctrico', activo: true }];
  const saveCatalogEntry = async (received: string, values: Record<string, unknown>) => {
    assert.equal(received, kind); calls.push(values);
    if (fail) throw new Error('No se pudo guardar');
    return { prefijos, categorias };
  };
  try {
    await act(() => root.render(h(CatalogManager, { kind, user, elementos: [], prefijos, categorias, saveCatalogEntry })));
    assert.equal(document.querySelector('form'), null); assert.equal(document.querySelector('[role="dialog"]'), null);
    const create = button(host, kind === 'prefijo' ? 'Crear código' : 'Crear categoría');
    await act(() => { create.focus(); create.click(); }); assert.ok(document.querySelector('[role="dialog"]'));
    await act(() => document.querySelector<HTMLButtonElement>('[data-dialog-close]')!.click()); await settle();
    assert.equal(document.querySelector('form'), null); assert.equal(document.activeElement, create);
    await act(() => button(host, 'Editar').click());
    const inputs = document.querySelectorAll<HTMLInputElement>('input');
    assert.equal(inputs[0].value, kind === 'prefijo' ? 'CAB' : 'ELECTRICO');
    assert.equal(inputs[0].disabled, kind === 'categoria');
    await act(() => change(inputs[1], 'Nombre corregido'));
    await act(async () => submit());
    assert.match(document.querySelector('[role="dialog"] [role="alert"]')!.textContent!, /No se pudo guardar/);
    assert.equal(document.querySelectorAll<HTMLInputElement>('input')[1].value, 'Nombre corregido');
    fail = false;
    await act(async () => { submit(); submit(); }); assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], { id: kind === 'prefijo' ? 'PREF-1' : 'ELECTRICO', nombre: 'Nombre corregido', activo: true,
      ...(kind === 'prefijo' ? { prefijo: 'CAB' } : { clave: 'ELECTRICO' }) });
    await settle(); assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.match(host.querySelector('[role="status"]')!.textContent!, /guardados/);
    await act(() => create.click()); assert.equal(document.querySelector<HTMLInputElement>('input')!.value, '');
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('project creation and editing use a closed-by-default dialog, keep failed drafts, and block dismissal while saving', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const existing: Proyecto = { id: 'PROY-1', nombre: 'Proyecto existente', cliente: 'Cliente', ubicacion: 'Honda', estado: 'ACTIVO', createdAt: '2026-10-06' };
  let added = 0, updated = 0, fail = true;
  let complete!: (value: Proyecto) => void;
  const pending = new Promise<Proyecto>(resolve => { complete = resolve; });
  try {
    await act(() => root.render(h(ProjectsManager, { user, proyectos: [existing], syncStatus: 'synced',
      addProyecto: async input => { added++; assert.equal(input.nombre, 'Proyecto nuevo'); return pending; },
      updateProyecto: async (id, input) => { updated++; assert.equal(id, existing.id); if (fail) throw new Error('Conexión perdida'); return { ...existing, ...input, id }; },
      addExampleProjects: async () => {} })));
    assert.equal(document.querySelector('input'), null);
    await act(() => button(host, 'Crear proyecto').click());
    await act(() => change(document.querySelector<HTMLInputElement>('input')!, 'Proyecto nuevo'));
    await act(() => { submit(); submit(); }); assert.equal(added, 1);
    assert.equal(document.querySelector<HTMLButtonElement>('[data-dialog-close]')!.disabled, true);
    await act(() => document.activeElement!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.ok(document.querySelector('[role="dialog"]'));
    await act(async () => complete({ ...existing, id: 'PROY-2', nombre: 'Proyecto nuevo' })); await settle();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    await act(() => button(host, 'Editar').click());
    assert.equal(document.querySelector<HTMLInputElement>('input')!.value, existing.nombre);
    await act(() => change(document.querySelector<HTMLInputElement>('input')!, 'Corrección'));
    await act(async () => submit());
    assert.equal(updated, 1); assert.equal(document.querySelector<HTMLInputElement>('input')!.value, 'Corrección');
    assert.match(document.querySelector('[role="dialog"] [role="alert"]')!.textContent!, /Conexión perdida/);
    fail = false; await act(async () => submit()); await settle(); assert.equal(updated, 2);
    assert.equal(document.querySelector('form'), null);
    await act(() => button(host, 'Crear proyecto').click());
    await act(async () => button(document, 'Añadir dos proyectos de ejemplo').click());
    assert.match(document.querySelector('[role="dialog"] [role="status"]')!.textContent!, /proyectos de ejemplo/);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('read-only accounts see the catalogs and projects without creation or editing controls', async () => {
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const readonly = { ...user, role: 'consulta' };
  try {
    await act(() => root.render(h(CatalogManager, { kind: 'categoria', user: readonly, prefijos: [], elementos: [],
      categorias: [{ id: 'CAT', nombre: 'Categoría', activo: true }], saveCatalogEntry: async () => { throw new Error('Must not save'); } })));
    assert.equal(host.querySelector('button'), null); assert.equal(document.querySelector('[role="dialog"]'), null);
    await act(() => root.render(h(ProjectsManager, { user: readonly, proyectos: [], syncStatus: 'synced',
      addProyecto: async () => { throw new Error('Must not save'); }, updateProyecto: async () => { throw new Error('Must not save'); }, addExampleProjects: async () => {} })));
    assert.equal(host.querySelector('button'), null); assert.equal(document.querySelector('input'), null);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('page layout has one vertical scroll owner, natural page height and clipped outgoing transitions', () => {
  const app = fs.readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
  assert.match(app, /app-main[^"`]*overflow-y-auto/);
  assert.match(css, /\.app-screen > \.ui-screen-current\s*\{\s*display:\s*block/);
  assert.match(css, /\.ui-screen-previous\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.app-viewport\s*\{[^}]*position:\s*fixed/);
  for (const name of ['HistoryView', 'EntryView', 'ItemRegistrationForm', 'ExplorerView', 'DispatchView', 'RemissionView', 'DataAdministrationView']) {
    const source = fs.readFileSync(new URL(`../../src/components/${name}.tsx`, import.meta.url), 'utf8');
    const rootClass = source.match(/return\s*\(?\s*<div\b[^>]*\bclassName="([^"]+)"/)![1];
    assert.doesNotMatch(rootClass, /overflow-y-auto|h-full|h-screen/, `${name} must use the main scroll area`);
  }
});

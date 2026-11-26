import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { act, createElement, lazy, useState } from 'react';
import { AppInitialContent } from '../../src/components/AppLoadingScreen';
import { StateIcon } from '../../src/components/ui/StateIcon';
import { combinedInitialStatus, initialQueryStatus } from '../../src/domain/initialLoad';
import { loadStartupFonts } from '../../src/shared/startupAssets';
import { useViewNavigation } from '../../src/state/useViewNavigation';
import { ScreenTransition } from '../../src/components/ui/Motion';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://app.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');

test('startup waits for every initial result, accepts empty inventory and ignores background refreshes with cached data', () => {
  const loading = {data:undefined,isError:false,fetchStatus:'fetching' as const};
  const ready = {data:[],isError:false,fetchStatus:'idle' as const};
  assert.equal(initialQueryStatus([ready,loading]),'loading');
  assert.equal(initialQueryStatus([ready,ready]),'ready');
  assert.equal(initialQueryStatus([{...ready,isError:true,fetchStatus:'fetching'}]),'ready');
  assert.equal(initialQueryStatus([{...loading,isError:true,fetchStatus:'idle'}]),'error');
  assert.equal(initialQueryStatus([{...loading,fetchStatus:'paused'}]),'error');
  assert.equal(initialQueryStatus([{...loading,isError:true}]),'loading');
  assert.equal(combinedInitialStatus('ready','loading'),'loading');
  assert.equal(combinedInitialStatus('ready','error'),'error');
  assert.equal(combinedInitialStatus('ready','ready'),'ready');
});

test('the full screen stays behind a spinner until data and the lazy screen are ready; retry is accessible', async () => {
  const pendingView = deferred<{default: () => ReturnType<typeof createElement>}>();
  function Screen() {const [draft,setDraft]=useState('');return createElement('section',null,
    createElement('h2',null,'Inventario completo'),createElement('input',{value:draft,onChange:event=>setDraft(event.currentTarget.value)}));}
  const View=lazy(()=>pendingView.promise);
  let retries=0;
  const host=document.body.appendChild(document.createElement('div')),root=createRoot(host);
  const render=(status:'loading'|'ready'|'error')=>createElement(AppInitialContent,{status,onRetry:()=>{retries++;},children:createElement(View)});
  try {
    await act(()=>root.render(render('loading')));
    assert.equal(host.querySelector('input'),null);assert.equal(host.querySelector('[role="status"]')?.getAttribute('aria-busy'),'true');
    assert.equal(host.querySelector('h1'),null);assert.ok(host.querySelector('.app-spinner'));
    await act(()=>root.render(render('ready')));
    assert.equal(host.querySelector('input'),null);assert.match(host.textContent!,/Preparando pantalla/);
    await act(async()=>pendingView.resolve({default:Screen}));
    assert.match(host.textContent!,/Inventario completo/);assert.equal(host.querySelector('[role="status"]'),null);
    const input=host.querySelector('input')!;
    const set=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
    await act(()=>{set.call(input,'42');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
    await act(()=>root.render(render(initialQueryStatus([{data:[],isError:false,fetchStatus:'fetching'}]))));
    assert.equal(host.querySelector('input'),input);assert.equal(input.value,'42');
    await act(()=>root.render(render('loading')));
    assert.equal(host.querySelector('.app-spinner'),null);assert.equal(host.querySelector('input'),input);assert.equal(input.value,'42');
    await act(()=>root.render(render('error')));
    assert.equal(host.querySelector('input'),null);assert.ok(host.querySelector('[role="alert"]'));
    await act(()=>host.querySelector('button')!.click());assert.equal(retries,1);
    await act(()=>root.render(render('ready')));assert.ok(host.querySelector('input'));
  } finally {await act(()=>root.unmount());host.remove();}
});

test('navigation retains the visible screen while lazy views load, handles rapid choices and browser back without another spinner', async () => {
  window.history.replaceState(null, '', '#/dashboard');
  const explorer = deferred<{ default: () => ReturnType<typeof createElement> }>();
  const history = deferred<{ default: () => ReturnType<typeof createElement> }>();
  const newItem = deferred<{ default: () => ReturnType<typeof createElement> }>();
  const Explorer = lazy(() => explorer.promise), History = lazy(() => history.promise), NewItem = lazy(() => newItem.promise);
  const screen = (name: string) => () => createElement('h2', null, name);
  function Navigation() {
    const { activeView, navigationView, setActiveView } = useViewNavigation();
    const [draft, setDraft] = useState('');
    const view = activeView === 'explorer' ? createElement(Explorer) : activeView === 'history' ? createElement(History)
      : activeView === 'entries' ? createElement(NewItem) : createElement('section', null,
        createElement('h2', null, 'Inicio'), createElement('input', { value: draft, onChange: event => setDraft(event.currentTarget.value) }));
    return createElement('main', null,
      createElement('button', { onClick: () => setActiveView('explorer'), id: 'go-explorer', 'data-selected': navigationView === 'explorer' }, 'Inventario'),
      createElement('button', { onClick: () => setActiveView('history'), id: 'go-history' }, 'Historial'),
      createElement(ScreenTransition, { screen: activeView, children: view }));
  }
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  const current = () => host.querySelector('.ui-screen-current')!;
  const navigate = (id: string) => act(() => host.querySelector<HTMLButtonElement>(`#${id}`)!.click());
  try {
    await act(() => root.render(createElement(AppInitialContent, { status: 'ready', onRetry: () => {}, children: createElement(Navigation) })));
    const input = host.querySelector('input')!;
    await act(() => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, '42');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
    await navigate('go-explorer');
    assert.equal(host.querySelector('#go-explorer')!.getAttribute('data-selected'), 'true');
    assert.equal(window.location.hash, '#/explorer'); assert.match(current().textContent!, /Inicio/);
    assert.equal(input.value, '42'); assert.equal(host.querySelector('.app-spinner'), null);
    assert.equal(host.querySelector('main')!.style.display, '');
    await navigate('go-history');
    await act(async () => explorer.resolve({ default: screen('Inventario listo') }));
    assert.match(current().textContent!, /Inicio/); assert.equal(host.querySelector('.app-spinner'), null);
    await act(async () => history.resolve({ default: screen('Historial listo') }));
    assert.match(current().textContent!, /Historial listo/); assert.equal(host.querySelector('.app-spinner'), null);
    await navigate('go-explorer'); assert.match(current().textContent!, /Inventario listo/);
    await act(() => { window.history.replaceState(null, '', '#/new-item'); window.dispatchEvent(new dom.window.PopStateEvent('popstate')); });
    assert.match(current().textContent!, /Inventario listo/); assert.equal(host.querySelector('.app-spinner'), null);
    await act(async () => newItem.resolve({ default: screen('Entradas listas') }));
    assert.match(current().textContent!, /Entradas listas/); assert.equal(host.querySelector('.app-spinner'), null);
  } finally { await act(() => root.unmount()); host.remove(); window.history.replaceState(null, '', '/'); }
});

test('font preparation waits for all local faces and layout, and rejects missing or failed fonts', async () => {
  const symbols=deferred<FontFace[]>(), layout=deferred<FontFaceSet>();
  const calls:string[]=[];
  let complete=false;
  const fonts={load:async (name:string)=>{calls.push(name);return name.includes('Material')?symbols.promise:[{} as FontFace];},ready:layout.promise};
  const pending=loadStartupFonts(fonts).then(()=>{complete=true;});
  await Promise.resolve();assert.equal(calls.length,3);assert.equal(complete,false);
  symbols.resolve([{} as FontFace]);await Promise.resolve();assert.equal(complete,false);
  layout.resolve({} as FontFaceSet);await pending;assert.equal(complete,true);
  await assert.rejects(loadStartupFonts({load:async()=>[],ready:Promise.resolve({} as FontFaceSet)}),/fuentes/);
  await assert.rejects(loadStartupFonts({load:async()=>{throw new Error('Network failed');},ready:Promise.resolve({} as FontFaceSet)}),/Network failed/);
});

test('first HTML has an independent spinner and module error recovery; fonts are local WOFF2 assets with licenses', async () => {
  const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const shell=new JSDOM(html,{runScripts:'dangerously'}),initial=shell.window.document;
  await new Promise<void>(resolve=>initial.addEventListener('DOMContentLoaded',()=>resolve(),{once:true}));
  assert.ok(initial.querySelector('#root .app-spinner'));assert.ok(initial.querySelector('#root [role="status"]'));
  assert.equal(initial.querySelector('#root h1'),null);
  assert.match(initial.querySelector('style')!.textContent!,/@keyframes app-spin/);
  initial.querySelector('script[type="module"]')!.dispatchEvent(new shell.window.Event('error'));
  assert.equal(initial.querySelector('#root main')?.getAttribute('aria-busy'),'false');
  assert.equal(initial.querySelector('#root main')?.getAttribute('role'),'alert');
  assert.equal(initial.querySelector<HTMLButtonElement>('#startup-retry')!.hidden,false);
  assert.equal(initial.querySelector<HTMLElement>('.app-spinner')!.hidden,true);
  shell.window.close();
  assert.doesNotMatch(html,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  const manifest=JSON.parse(fs.readFileSync(new URL('../../public/fonts/manifest.json',import.meta.url),'utf8'));
  assert.ok(manifest.iconNames.includes('inventory_2'));assert.ok(manifest.iconNames.includes('photo_library'));
  let total=0;
  for(const font of manifest.fonts) {
    const bytes=fs.readFileSync(new URL(`../../public/fonts/${font.file}`,import.meta.url));
    assert.equal(bytes.subarray(0,4).toString(),'wOF2');assert.equal(bytes.length,font.bytes);total+=bytes.length;
  }
  assert.ok(total<120_000);
  for(const file of ['Hanken-Grotesk-OFL.txt','JetBrains-Mono-OFL.txt','Material-Symbols-LICENSE.txt']) {
    assert.ok(fs.readFileSync(new URL(`../../public/fonts/${file}`,import.meta.url),'utf8').length>1000);
  }
  // Every icon referenced in src/ must exist in the vendored font or as an SVG in StateIcon.
  const available = new Set<string>(manifest.iconNames);
  const stateIconSource = fs.readFileSync(new URL('../../src/components/ui/StateIcon.tsx', import.meta.url), 'utf8');
  for (const match of stateIconSource.matchAll(/^\s+([a-z][a-z0-9_]*):\s*\{/gm)) available.add(match[1]);
  const used = new Set<string>();
  const collect = (node: ts.Node) => {
    if (ts.isConditionalExpression(node)) { collect(node.whenTrue); collect(node.whenFalse); return; }
    if (ts.isStringLiteralLike(node) && /^[a-z][a-z0-9_]*$/.test(node.text)) used.add(node.text);
    if (ts.isJsxText(node) && /^[a-z][a-z0-9_]*$/.test(node.text.trim())) used.add(node.text.trim());
    ts.forEachChild(node, collect);
  };
  const scan = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(target);
      else if (/\.tsx?$/.test(target)) {
        const source = ts.createSourceFile(target, fs.readFileSync(target, 'utf8'), ts.ScriptTarget.Latest, true);
        const visit = (node: ts.Node) => {
          if (ts.isJsxElement(node) && node.openingElement.attributes.getText(source).includes('material-symbols-outlined')) node.children.forEach(collect);
          if (ts.isJsxAttribute(node) && node.name.getText(source) === 'icon' && node.initializer) collect(node.initializer);
          if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'icon') collect(node.initializer);
          if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'icons' && node.initializer) collect(node.initializer);
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    }
  };
  scan(path.resolve(import.meta.dirname, '../../src'));
  const missing = [...used].filter(name => !available.has(name));
  assert.deepEqual(missing, [], `missing vendored/SVG icons: ${missing.join(', ')}`);
  // The bulk-selection checklist icon renders as an inline SVG with outline/solid states, never fallback text.
  const host = document.body.appendChild(document.createElement('div')), root = createRoot(host);
  try {
    await act(() => root.render(createElement(StateIcon, { icon: 'checklist', filled: true, className: 'text-xl' })));
    const icon = host.querySelector('svg[data-icon="checklist"]');
    assert.ok(icon); assert.equal(icon.getAttribute('data-filled'), 'true');
    assert.equal(host.textContent, '');
    assert.ok(icon.querySelector('.ui-icon-outline') && icon.querySelector('.ui-icon-solid'));
  } finally { await act(() => root.unmount()); host.remove(); }
});

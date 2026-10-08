import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { navigateWithDialogs, registerDialogBack } from '../../src/shared/dialogHistory';

const wait = () => new Promise(resolve => setTimeout(resolve, 30));
function setup() {
  const dom = new JSDOM('', { url: 'https://app.test/#/dashboard' });
  const win = dom.window as unknown as Window;
  win.history.pushState(null, '', '#/explorer');
  const routes: string[] = [];
  win.addEventListener('popstate', () => routes.push(win.location.hash));
  return { win, routes, dom };
}

test('Back dismisses the top window, then its parent, before navigating to the previous screen', async () => {
  const { win, routes, dom } = setup();
  let parent = 0, child = 0;
  const closeParent = registerDialogBack(win, () => { parent++; closeParent(); }, () => false);
  const closeChild = registerDialogBack(win, () => { child++; closeChild(); }, () => false);
  try {
    win.history.back(); await wait();
    assert.equal(child, 1); assert.equal(parent, 0); assert.equal(win.location.hash, '#/explorer'); assert.deepEqual(routes, []);
    win.history.back(); await wait();
    assert.equal(parent, 1); assert.equal(win.location.hash, '#/explorer'); assert.deepEqual(routes, []);
    win.history.back(); await wait(); assert.equal(win.location.hash, '#/dashboard'); assert.deepEqual(routes, ['#/dashboard']);
  } finally { dom.window.close(); }
});

test('manual dismissal consumes the temporary entry and immediately opening another window preserves Back', async () => {
  const { win, routes, dom } = setup(); let closed = 0;
  const first = registerDialogBack(win, () => {}, () => false);
  first();
  const second = registerDialogBack(win, () => { closed++; second(); }, () => false);
  try {
    await wait(); win.history.back(); await wait(); assert.equal(closed, 1); assert.equal(win.location.hash, '#/explorer');
    win.history.back(); await wait(); assert.deepEqual(routes, ['#/dashboard']);
  } finally { dom.window.close(); }
});

test('Back cannot dismiss a pending write, and it works when the operation finishes', async () => {
  const { win, routes, dom } = setup(); let busy = true, closed = 0;
  const unregister = registerDialogBack(win, () => { closed++; unregister(); }, () => busy);
  try {
    win.history.back(); await wait(); assert.equal(closed, 0); assert.equal(win.history.state.fulgorDialog, true); assert.deepEqual(routes, []);
    busy = false; win.history.back(); await wait(); assert.equal(closed, 1); assert.equal(win.location.hash, '#/explorer');
  } finally { dom.window.close(); }
});

test('choosing a route from the mobile menu consumes its entry and preserves ordinary Back and Forward', async () => {
  const { win, routes, dom } = setup();
  const unregister = registerDialogBack(win, () => {}, () => false);
  try {
    navigateWithDialogs(win, '#/history'); unregister(); await wait();
    assert.equal(win.location.hash, '#/history');
    win.history.back(); await wait(); assert.equal(win.location.hash, '#/explorer');
    win.history.forward(); await wait(); assert.equal(win.location.hash, '#/history');
    assert.deepEqual(routes, ['#/explorer', '#/history']);
  } finally { dom.window.close(); }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// JSDOM cannot exercise pointer media or paint hover. Attribute states test the CSS cascade only.
const css = ['appearance.css', 'controls.css', 'interactions.css', 'sidebar.css']
  .map(file => fs.readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8')).join('\n')
  .replaceAll('@media screen and (hover: hover) and (pointer: fine)', '@media screen')
  .replaceAll(':hover', '[data-test-hover]').replaceAll(':active', '[data-test-active]');
function fixture(theme: string) {
  return new JSDOM(`<html data-ui-style="neumorphism" data-theme="${theme}"><head><style>${css}</style></head><body>
    <aside class="app-sidebar"><button id="brand" class="ui-brand-button">EL TURPIAL</button>
      <button id="nav" class="ui-sidebar-action rounded-xl">Inventario</button>
      <button id="selected" class="ui-sidebar-action rounded-xl" aria-current="page">Inicio</button>
      <button id="help" class="ui-sidebar-action rounded-xl">Ayuda</button>
      <button id="logout" class="ui-sidebar-action ui-sidebar-logout rounded-xl">Cerrar sesión</button>
    </aside><button id="save" class="rounded-xl">Guardar</button>
    <button id="mobile-brand" class="ui-brand-button">Logo móvil</button>
  </body></html>`);
}

test('sidebar actions are flat at rest, active navigation stays inset, and other actions retain their relief in both palettes', () => {
  for (const theme of ['light', 'dark']) {
    const dom = fixture(theme), document = dom.window.document;
    const computed = (id: string) => dom.window.getComputedStyle(document.getElementById(id)!);
    try {
      for (const id of ['nav', 'help', 'logout']) {
        assert.equal(computed(id).boxShadow, 'none'); assert.equal(computed(id).backgroundColor, 'rgba(0, 0, 0, 0)');
        assert.equal(computed(id).borderWidth, '0px');
      }
      assert.equal(computed('selected').boxShadow, 'var(--ui-inset-shadow)');
      assert.equal(computed('save').boxShadow, 'var(--ui-control-shadow)');
      for (const id of ['brand', 'mobile-brand']) {
        assert.equal(computed(id).boxShadow, 'none'); assert.equal(computed(id).borderWidth, '0px');
        assert.equal(computed(id).backgroundColor, 'rgba(0, 0, 0, 0)');
      }
    } finally { dom.window.close(); }
  }
});

test('hover adds relief only to inactive sidebar actions, selection and press stay inset, and the logo remains unframed', () => {
  for (const theme of ['light', 'dark']) {
    const dom = fixture(theme), document = dom.window.document;
    const computed = (id: string) => dom.window.getComputedStyle(document.getElementById(id)!);
    try {
      for (const button of document.querySelectorAll('button')) button.setAttribute('data-test-hover', '');
      assert.equal(computed('nav').boxShadow, 'var(--ui-control-shadow)');
      assert.equal(computed('help').boxShadow, 'var(--ui-control-shadow)');
      assert.equal(computed('logout').getPropertyValue('--ui-sidebar-ink'), 'var(--ui-danger)');
      assert.equal(computed('selected').boxShadow, 'var(--ui-inset-shadow)');
      document.getElementById('nav')!.setAttribute('data-test-active', '');
      assert.equal(computed('nav').boxShadow, 'var(--ui-inset-shadow)');
      for (const id of ['brand', 'mobile-brand']) {
        document.getElementById(id)!.setAttribute('data-test-active', '');
        assert.equal(computed(id).boxShadow, 'none'); assert.equal(computed(id).transform, 'none');
        assert.equal(computed(id).borderWidth, '0px');
      }
      document.getElementById('help')!.setAttribute('disabled', '');
      assert.equal(computed('help').boxShadow, 'none');
      document.getElementById('logout')!.removeAttribute('data-test-hover');
      assert.equal(computed('logout').boxShadow, 'none');
    } finally { dom.window.close(); }
  }
});

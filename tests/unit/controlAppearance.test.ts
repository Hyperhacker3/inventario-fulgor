import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const css = ['appearance.css', 'controls.css', 'interactions.css', 'calendar.css'].map(file => fs.readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8')).join('\n');
function fixture(style: string, theme: string) {
  return new JSDOM(`<html data-ui-style="${style}" data-theme="${theme}"><head><style>${css}</style></head><body>
    <input id="quantity" type="number" class="ui-number-input" style="padding-top: 8px">
    <input id="name" type="text"><input id="date" type="date">
    <button id="state" class="app-select-trigger">Bueno / Óptimo</button>
    <select id="native" class="select-form-value" style="height: 1px"><option>Bueno</option></select>
    <textarea id="description" style="height: 96px"></textarea>
    <div class="ui-search-field"><input id="search" class="bg-transparent"></div>
    <div id="avatar" class="ui-header-avatar"></div>
    <ul id="chips" class="ui-category-chips"><li><button>CAF</button></li></ul>
    <div class="movement-documents"><button id="pdf">PDF</button><button id="photos">Fotos</button></div>
    <div id="history" class="ui-history-scroll"><div id="history-card" class="ui-history-card border rounded-lg bg-[#f8fafc]"></div></div>
    <input id="date-value" type="date" class="date-form-value">
    <button id="dot" class="ui-photo-dot"><span></span></button><button id="dot-active" class="ui-photo-dot" aria-current="true"><span></span></button>
    <button id="page" class="border rounded-lg">Anterior</button>
    <button id="save" class="bg-[#3e4e9e] text-white rounded-lg">Guardar</button>
    <button id="entry" class="bg-[#e6f4ea] text-[#137333] rounded-lg">Entrada</button>
    <button id="adjust" class="bg-[#fef7e0] text-[#755b00] rounded-lg">Ajuste</button>
    <button id="dispatch" class="bg-[#dd4c42] text-white rounded-lg">Agregar a la salida</button>
    <button id="delete" class="bg-red-700 text-white rounded-lg" disabled>Eliminar</button>
    <button id="option" class="app-select-option">Opción completa</button>
    <button id="backdrop" class="ui-backdrop">Cerrar fuera</button>
    <div class="a4-print-container"><button id="print" aria-pressed="true" disabled style="color: black; background: white">Documento</button><input id="print-input" style="height: 12px"><textarea id="print-textarea" style="min-height: 12px; resize: none"></textarea></div>
  </body></html>`);
}

test('single-line quantities, names, dates and comboboxes share a height across both palettes', () => {
  for (const style of ['neumorphism']) for (const theme of ['light', 'dark']) {
    const dom = fixture(style, theme), document = dom.window.document;
    const computed = (id: string) => dom.window.getComputedStyle(document.getElementById(id)!);
    try {
      assert.equal(dom.window.getComputedStyle(document.documentElement).getPropertyValue('--ui-field-height'), '44px');
      for (const id of ['quantity', 'name', 'date', 'state']) {
        assert.equal(computed(id).height, 'var(--ui-field-height)');
        assert.equal(computed(id).minHeight, 'var(--ui-field-height)');
      }
      assert.equal(computed('native').height, '1px');
      assert.equal(computed('date-value').height, '1px'); assert.equal(computed('date-value').minHeight, '0');
      assert.equal(computed('description').height, '96px');
      assert.equal(computed('quantity').appearance, 'textfield');
      assert.match(css, /\.ui-number-input::\-webkit-inner-spin-button,[\s\S]*?\-webkit-appearance:\s*none/);
      assert.equal(computed('print-input').height, '12px');
    } finally { dom.window.close(); }
  }
});

test('fields and comboboxes focus without an outline, and textareas cannot shrink below the shared field height', () => {
  for (const theme of ['light', 'dark']) {
    const dom = fixture('neumorphism', theme), document = dom.window.document;
    const computed = (id: string) => dom.window.getComputedStyle(document.getElementById(id)!);
    try {
      for (const id of ['quantity', 'name', 'state', 'description', 'search']) {
        (document.getElementById(id) as HTMLElement).focus();
        assert.equal(computed(id).outline, 'none');
        assert.equal(computed(id).boxShadow, id === 'search' ? 'none' : 'var(--ui-field-focus-shadow)');
      }
      assert.equal(computed('description').minHeight, computed('name').minHeight);
      assert.equal(computed('description').boxSizing, 'border-box');
      assert.equal(computed('description').resize, 'vertical');
      assert.equal(computed('print-textarea').minHeight, '12px'); assert.equal(computed('print-textarea').resize, 'none');
    } finally { dom.window.close(); }
  }
});

test('document actions share width and height, avatar shares action relief, and category chips reserve shadow space', () => {
  for (const theme of ['light', 'dark']) {
    const dom = fixture('neumorphism', theme), document = dom.window.document;
    const computed = (id: string) => dom.window.getComputedStyle(document.getElementById(id)!);
    try {
      assert.equal(computed('pdf').width, '100%'); assert.equal(computed('photos').width, computed('pdf').width);
      assert.equal(computed('pdf').height, 'var(--ui-field-height)'); assert.equal(computed('photos').height, computed('pdf').height);
      assert.equal(computed('avatar').boxShadow, computed('page').boxShadow);
      assert.equal(computed('avatar').borderRadius, computed('page').borderRadius);
      assert.equal(computed('chips').padding, '12px');
      assert.equal(computed('history').padding, '12px');
      assert.equal(computed('history-card').boxShadow, computed('page').boxShadow);
      for (const id of ['dot', 'dot-active']) {
        assert.equal(computed(id).boxShadow, 'none'); assert.equal(computed(id).backgroundColor, 'rgba(0, 0, 0, 0)');
        assert.equal(computed(id).borderWidth, '0px'); assert.equal(computed(id).transform, 'none');
        (document.getElementById(id) as HTMLElement).focus(); assert.equal(computed(id).boxShadow, 'none');
      }
    } finally { dom.window.close(); }
  }
});

test('previously filled actions use the pagination material and semantic text without styling list options, backdrops or print as actions', () => {
  for (const style of ['neumorphism']) for (const theme of ['light', 'dark']) {
    const dom = fixture(style, theme), document = dom.window.document;
    const computed = (id: string) => dom.window.getComputedStyle(document.getElementById(id)!);
    try {
      const reference = computed('page');
      for (const id of ['save', 'entry', 'adjust', 'dispatch', 'delete']) {
        const action = computed(id);
        assert.equal(action.backgroundColor, reference.backgroundColor);
        assert.equal(action.backgroundImage, reference.backgroundImage);
        assert.equal(action.boxShadow, reference.boxShadow);
        assert.equal(action.borderRadius, reference.borderRadius);
        assert.equal(action.color, reference.color); // Variable value is resolved by browsers, not JSDOM.
      }
      assert.equal(computed('save').getPropertyValue('--ui-button-ink'), '');
      assert.equal(computed('entry').getPropertyValue('--ui-button-ink'), 'var(--ui-success)');
      assert.equal(computed('adjust').getPropertyValue('--ui-button-ink'), 'var(--ui-warning)');
      assert.equal(computed('dispatch').getPropertyValue('--ui-button-ink'), 'var(--ui-danger)');
      assert.equal(computed('delete').opacity, '0.45');
      for (const id of ['option', 'backdrop', 'print']) assert.notEqual(computed(id).backgroundColor, reference.backgroundColor);
      assert.equal(computed('print').color, 'rgb(0, 0, 0)');
      assert.notEqual(computed('print').boxShadow, 'var(--ui-inset-shadow)');
      assert.notEqual(computed('print').opacity, '0.45');
    } finally { dom.window.close(); }
  }
});

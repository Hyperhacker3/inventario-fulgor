import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { profileForAccount, displayCargo } from '../../src/domain/userProfile';
import { RemissionHeader } from '../../src/components/remission/RemissionSections';
import { mapRemision } from '../../src/data/mappers';

test('visible identity uses a personal name and job independently of authentication and permission role', () => {
  const profile = profileForAccount({ email: 'login@example.test', app_metadata: { role: 'admin' },
    user_metadata: { name: ' Andrés Castañeda ', cargo: ' Almacenista ', role: 'consulta' } });
  assert.equal(profile.name, 'Andrés Castañeda'); assert.equal(displayCargo(profile), 'Almacenista');
  assert.equal(profile.role, 'admin'); assert.equal(profile.email, 'login@example.test');
});
test('missing or invalid names do not expose login emails and user metadata cannot supply permissions', () => {
  const profile = profileForAccount({ email: 'login@example.test', user_metadata: { name: 'login@example.test', full_name: 'Otra persona', cargo: 'Residente', role: 'admin' } });
  assert.equal(profile.name, 'Otra persona'); assert.equal(profile.cargo, 'Residente'); assert.equal(profile.role, '');
  const unknown = profileForAccount({ email: 'login@example.test', user_metadata: { name: { invalid: true } }, app_metadata: { role: 'admin' } });
  assert.equal(unknown.name, 'Administrador'); assert.equal(displayCargo(unknown), 'Administrador');
  assert.equal(displayCargo({ role: 'operador' }), 'Operador');
});
test('the printable remission shows the warehouse keeper name and job together', () => {
  const profile = profileForAccount({ email: 'login@example.test', app_metadata: { role: 'admin' }, user_metadata: { name: 'Andrés Castañeda', cargo: 'Almacenista' } });
  const markup = renderToStaticMarkup(h(RemissionHeader, { remision: mapRemision({ entregado_por: profile.name, cargo_entregado: displayCargo(profile) }) }));
  assert.match(markup, /Andrés Castañeda · Almacenista/); assert.doesNotMatch(markup, /login@example|>admin</);
});

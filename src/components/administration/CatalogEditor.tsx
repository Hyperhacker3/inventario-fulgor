import { useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { prefixPreview } from '../../domain/dataAdministration';
import { errorMessage } from '../../shared/errors';

export function CatalogEditor({ kind }: { kind: 'prefijo' | 'categoria' }) {
  const { prefijos, categorias, elementos, saveCatalogEntry, user } = useInventory();
  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const admin = user.role === 'admin';
  const prefix = kind === 'prefijo';
  const reset = () => { setId(''); setCode(''); setName(''); setActive(true); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await saveCatalogEntry(kind, { id: id || null, nombre: name, activo: active,
        ...(prefix ? { prefijo: code } : { clave: code }) });
      reset(); setMessage('Datos guardados en Supabase.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  };
  const entries = prefix ? prefijos.map(row => ({ ...row, code: row.prefijo,
    detail: `Siguiente estimado: ${prefixPreview(row, elementos.map(item => item.codigo))}` }))
    : categorias.map(row => ({ ...row, code: row.id,
      detail: `${elementos.filter(item => item.categoria === row.id).length} productos activos` }));
  return <section className="space-y-5">
    <p className="text-sm text-slate-600">{prefix
      ? 'Cada prefijo tiene tres letras. Supabase asigna el siguiente número al guardar el producto. Editar un prefijo afecta las futuras altas; conserva los códigos existentes y el consecutivo.'
      : 'Puede editar el nombre visible. La clave identifica la categoría y se conserva para mantener asociados sus productos. Las categorías inactivas siguen visibles en el inventario.'}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    {admin && <form onSubmit={save} className="border bg-white rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-lg">{id ? 'Editar' : 'Crear'} {prefix ? 'prefijo de código' : 'categoría'}</h3>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">{prefix ? 'Prefijo (tres letras)' : 'Clave de categoría'}
          <input required maxLength={prefix ? 3 : 50} pattern={prefix ? '[A-Z]{3}' : '[A-Z][A-Z0-9_]{1,49}'}
            disabled={!prefix && Boolean(id)} value={code} onChange={event => setCode(event.target.value.toUpperCase())}
            placeholder={prefix ? 'CAB' : 'MATERIALES'} className="block border rounded-lg p-3 w-full mt-1 uppercase" />
        </label>
        <label className="text-sm">Nombre<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="block border rounded-lg p-3 w-full mt-1" /></label>
        <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Disponible para nuevos productos</label>
      </fieldset>
      <div className="flex gap-4"><button disabled={busy} className="bg-[#253685] text-white px-4 py-2 rounded-lg">{busy ? 'Guardando…' : 'Guardar'}</button>
        {id && <button type="button" disabled={busy} onClick={reset}>Cancelar edición</button>}</div>
    </form>}
    {!entries.length && <p className="text-slate-500">Todavía no hay {prefix ? 'prefijos' : 'categorías'} registrados.</p>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{entries.map(row => <article key={row.id} className="border bg-white rounded-2xl p-5 space-y-2">
      <div className="flex justify-between gap-3"><strong>{row.code}</strong><span className="text-xs text-slate-500">{row.activo ? 'Activo' : 'Inactivo'}</span></div>
      <p className="font-medium">{row.nombre}</p><p className="text-sm text-slate-600">{row.detail}</p>
      {admin && <button disabled={busy} className="text-[#253685] text-sm underline" onClick={() => { setId(row.id); setCode(row.code); setName(row.nombre); setActive(row.activo); setError(''); setMessage(''); }}>Editar</button>}
    </article>)}</div>
  </section>;
}

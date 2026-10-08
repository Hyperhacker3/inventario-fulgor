import { StateIcon } from '../ui/StateIcon';
import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { prefixPreview } from '../../domain/dataAdministration';
import { errorMessage } from '../../shared/errors';
import { FormDialog } from '../ui/FormDialog';
import { Presence } from '../ui/Motion';

type CatalogProps = Pick<ReturnType<typeof useInventory>, 'prefijos' | 'categorias' | 'elementos' | 'saveCatalogEntry' | 'user'> & {
  kind: 'prefijo' | 'categoria';
};

export function CatalogEditor({ kind }: { kind: 'prefijo' | 'categoria' }) {
  const { prefijos, categorias, elementos, saveCatalogEntry, user } = useInventory();
  return <CatalogManager {...{ kind, prefijos, categorias, elementos, saveCatalogEntry, user }} />;
}

export function CatalogManager({ kind, prefijos, categorias, elementos, saveCatalogEntry, user }: CatalogProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const admin = user.role === 'admin';
  const prefix = kind === 'prefijo';
  const reset = () => { setId(''); setCode(''); setName(''); setActive(true); };
  const close = () => { if (!saving.current) { setFormOpen(false); reset(); setError(''); } };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (saving.current || !admin || !formOpen) return;
    saving.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      await saveCatalogEntry(kind, { id: id || null, nombre: name, activo: active,
        ...(prefix ? { prefijo: code } : { clave: code }) });
      setFormOpen(false); reset(); setMessage('Datos guardados en Supabase.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setBusy(false); }
  };
  const entries = prefix ? prefijos.map(row => ({ ...row, code: row.prefijo,
    detail: `Siguiente estimado: ${prefixPreview(row, elementos.map(item => item.codigo))}` }))
    : categorias.map(row => ({ ...row, code: row.id,
      detail: `${elementos.filter(item => item.categoria === row.id).length} productos activos` }));
  return <section className="space-y-5">
    <p className="text-sm text-slate-600">{prefix
      ? 'Cada prefijo tiene tres letras. Supabase asigna el siguiente número al guardar el producto. Editar un prefijo afecta las futuras altas; conserva los códigos existentes y el consecutivo.'
      : 'Puede editar el nombre visible. La clave identifica la categoría y se conserva para mantener asociados sus productos. Las categorías inactivas siguen visibles en el inventario.'}</p>
    {error && !formOpen && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    {admin && <button type="button" disabled={busy} onClick={() => { reset(); setError(''); setMessage(''); setFormOpen(true); }}
      className="min-h-11 rounded-lg bg-[#253685] text-white px-4 py-3 text-sm font-semibold disabled:opacity-50">{prefix ? 'Crear código' : 'Crear categoría'}</button>}
    <Presence open={admin && formOpen}>{formOpen && <FormDialog title={`${id ? 'Editar' : 'Crear'} ${prefix ? 'prefijo de código' : 'categoría'}`} busy={busy} onClose={close}>
      <form autoComplete="off" key={id || 'new'} onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm">{prefix ? 'Prefijo (tres letras)' : 'Clave de categoría'}
            <input autoComplete="off" autoCorrect="off" spellCheck={false} required maxLength={prefix ? 3 : 50} pattern={prefix ? '[A-Z]{3}' : '[A-Z][A-Z0-9_]{1,49}'}
              disabled={!prefix && Boolean(id)} value={code} onChange={event => setCode(event.target.value.toUpperCase())}
              placeholder={prefix ? 'CAB' : 'MATERIALES'} className="block border rounded-lg p-3 w-full mt-1 uppercase" />
          </label>
          <label className="text-sm">Nombre<input autoComplete="off" autoCorrect="off" spellCheck={false} required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="block border rounded-lg p-3 w-full mt-1" /></label>
          <label className="flex gap-2 items-center text-sm"><input autoComplete="off" autoCorrect="off" spellCheck={false} type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Disponible para nuevos productos</label>
        </fieldset>
        <div className="responsive-actions"><button data-action="cancel" type="button" disabled={busy} onClick={close} className="border rounded-lg px-4 py-2">Cancelar</button>
          <button disabled={busy} className="bg-[#253685] text-white px-4 py-2 rounded-lg">{busy ? 'Guardando…' : 'Guardar'}</button></div>
      </form></FormDialog>}</Presence>
    {!entries.length && <p className="text-slate-500">Todavía no hay {prefix ? 'prefijos' : 'categorías'} registrados.</p>}
    {entries.length > 0 && <ul aria-label={prefix ? 'Lista de códigos' : 'Lista de categorías'} className="border border-slate-200 bg-white rounded-xl overflow-hidden divide-y divide-slate-100">
      {entries.map(row => <li key={row.id} className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 hover:bg-slate-50">
        <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(140px,auto)_auto] items-center gap-x-3 gap-y-1">
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <strong className="text-xs font-mono-code text-[#253685] break-all">{row.code}</strong>
            <span className="text-sm font-medium text-slate-800 break-words min-w-0">{row.nombre}</span>
          </div>
          <p className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 text-xs text-slate-500 break-words">{row.detail}</p>
          <span className={`col-start-2 row-start-1 sm:col-start-3 rounded-md px-2 py-1 text-[10px] font-semibold ${row.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
        {admin && <button data-action="edit" type="button" disabled={busy} className="shrink-0 min-h-11 px-2 text-[#253685] text-xs font-semibold hover:underline disabled:opacity-50" onClick={() => { setId(row.id); setCode(row.code); setName(row.nombre); setActive(row.activo); setError(''); setMessage(''); setFormOpen(true); }}><StateIcon icon="edit" />Editar</button>}
      </li>)}
    </ul>}
  </section>;
}

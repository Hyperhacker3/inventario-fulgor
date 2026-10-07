import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { DEFAULT_COMPANY, validateCompany } from '../../domain/company';
import { prepareCompanyLogo } from '../../shared/companyLogo';
import type { CompanyProfile, CompanySettings } from '../../types';

export function CompanyProfileEditor() {
  const { companySettings, companyLoading, companyError, refreshCompany, saveCompany, user } = useInventory();
  if (!companySettings) return <div className="bg-white rounded-2xl p-5 space-y-3">
    <p role={companyError ? 'alert' : 'status'}>{companyLoading ? 'Cargando datos de empresa…' : 'No se pudieron cargar los datos de empresa. Compruebe la conexión y que esté activada la configuración de empresa en Supabase.'}</p>
    <button type="button" onClick={() => { void refreshCompany(); }} className="rounded-xl px-4 py-2">Comprobar de nuevo</button>
  </div>;
  return <div className="space-y-4"><button type="button" onClick={() => { void refreshCompany(); }} disabled={companyLoading} className="rounded-xl px-4 py-2 text-sm">Actualizar datos guardados</button>
    <CompanyProfileForm initial={companySettings} canEdit={user.role === 'admin'} onSave={saveCompany} />
  </div>;
}

export function CompanyProfileForm({ initial, canEdit, onSave }: { initial: CompanySettings; canEdit: boolean;
  onSave: (profile: CompanyProfile, version: number) => Promise<CompanySettings> }) {
  const [draft, setDraft] = useState(initial.perfil), [version, setVersion] = useState(initial.version);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const pending = useRef(false);
  const update = (key: keyof CompanyProfile, value: string) => { setDraft(previous => ({ ...previous, [key]: value })); setMessage(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || pending.current) return;
    setError(''); setMessage('');
    try {
      const profile = validateCompany(draft);
      pending.current = true; setBusy(true);
      const confirmed = await onSave(profile, version);
      setDraft(confirmed.perfil); setVersion(confirmed.version); setMessage('Datos de empresa guardados. Se usarán en las próximas remisiones.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los datos.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const upload = async (file?: File) => {
    if (!file || !canEdit || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try { update('logo', await prepareCompanyLogo(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar el logo.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <form onSubmit={save} className="bg-white rounded-2xl p-4 sm:p-6 space-y-5">
    <div><h3 className="text-xl font-bold">Datos de la empresa</h3>
      <p className="mt-2 text-sm text-slate-600">El nombre y logo identifican la aplicación. Nombre, NIT, dirección y teléfono aparecen en las remisiones; los documentos emitidos conservan sus datos.</p></div>
    <fieldset disabled={!canEdit || busy} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="block text-sm font-semibold">Nombre de empresa<input id="company-name" required maxLength={120} value={draft.nombre} onChange={event => update('nombre', event.target.value)} className="block w-full mt-2 rounded-xl p-3" /></label>
        <label className="block text-sm font-semibold">NIT<input id="company-nit" required maxLength={30} value={draft.nit} onChange={event => update('nit', event.target.value)} className="block w-full mt-2 rounded-xl p-3" /></label>
        <label className="block text-sm font-semibold">Dirección<input id="company-address" maxLength={240} value={draft.direccion} onChange={event => update('direccion', event.target.value)} className="block w-full mt-2 rounded-xl p-3" /></label>
        <label className="block text-sm font-semibold">Teléfono<input id="company-phone" type="tel" maxLength={60} value={draft.telefono} onChange={event => update('telefono', event.target.value)} className="block w-full mt-2 rounded-xl p-3" /></label>
      </div>
      <div className="space-y-3"><label htmlFor="company-logo" className="block text-sm font-semibold">Logo / icono de empresa</label>
        <img src={draft.logo} alt={`Logo de ${draft.nombre || 'la empresa'}`} className="w-48 h-24 object-contain" />
        <input id="company-logo" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="company-logo-hint" className="block w-full max-w-md text-sm" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />
        <p id="company-logo-hint" className="text-xs text-slate-500">PNG, JPG o WebP, hasta 5 MB. Se conserva la proporción y la transparencia.</p>
        <button type="button" onClick={() => update('logo', DEFAULT_COMPANY.logo)} className="rounded-xl px-4 py-2 text-sm">Restaurar logo original</button>
      </div>
      {canEdit && <div className="flex flex-wrap gap-3">
        <button type="submit" className="rounded-xl px-4 py-2 font-semibold">{busy ? 'Procesando…' : 'Guardar datos de empresa'}</button>
        <button type="button" className="rounded-xl px-4 py-2" onClick={() => { setDraft(initial.perfil); setVersion(initial.version); setError(''); setMessage(''); }}>Descartar cambios</button>
      </div>}
    </fieldset>
    {!canEdit && <p className="text-sm text-slate-600">Solo administración puede editar estos datos.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-green-800">{message}</p>}
  </form>;
}

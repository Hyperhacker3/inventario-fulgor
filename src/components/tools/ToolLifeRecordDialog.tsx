import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Elemento, UserProfile } from '../../types';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useMotionActive } from '../ui/Motion';
import { StateIcon } from '../ui/StateIcon';
import { Select } from '../ui/Select';
import { NumberInput } from '../NumberInput';
import { OutgoingPhotoPicker, type EvidencePhotoLabels } from '../dispatch/OutgoingPhotoPicker';
import { errorMessage } from '../../shared/errors';
import { formatCOP } from '../../domain/money';
import { normalizeItemCondition } from '../../domain/itemCondition';
import { colombiaToday, emptyMaintenance, formatDay, lifeRecordSections, maintenanceTypes, nextMaintenance, normalizeLifeData,
  TOOL_TYPE_LABEL, validateLifeData, validateMaintenance, type LifeData, type LifeRecord, type MaintenanceInput, type MaintenanceRecord, type ToolType } from '../../domain/toolLifeRecord';
import { MAINTENANCE_PAGE_SIZE, readLifeRecord, readMaintenancePage, registerMaintenance, saveLifeRecord } from '../../data/toolLifeRecord';
import { resolveMaintenanceImage } from '../../shared/maintenanceImages';

export interface ToolLifeServices {
  readRecord: (id: string) => Promise<LifeRecord | null>;
  saveRecord: (id: string, version: number, datos: LifeData) => Promise<LifeRecord>;
  readMaintenance: (id: string, page: number) => Promise<{ rows: MaintenanceRecord[]; total: number }>;
  register: (requestId: string, id: string, input: MaintenanceInput, photos: string[]) => Promise<MaintenanceRecord>;
  resolvePhoto: (source: string) => Promise<string>;
  today: () => string;
}
const defaultServices: ToolLifeServices = { readRecord: readLifeRecord, saveRecord: saveLifeRecord, readMaintenance: readMaintenancePage,
  register: registerMaintenance, resolvePhoto: resolveMaintenanceImage, today: () => colombiaToday() };
const PHOTO_LABELS: EvidencePhotoLabels = { title: 'Fotos del mantenimiento', alt: 'Mantenimiento', photo: 'del mantenimiento', max: 12,
  description: 'Opcional, hasta 12 fotos. Puede tomar varias seguidas o subir archivos; se guardan de forma privada con este registro.' };

interface Props {
  item: Elemento; type: ToolType; user: UserProfile; categoryLabel: (id: string) => string;
  onClose: () => void; services?: ToolLifeServices;
}

export function ToolLifeRecordDialog({ item, type, user, categoryLabel, onClose, services = defaultServices }: Props) {
  const heading = useId();
  const dialog = useRef<HTMLElement>(null);
  const active = useMotionActive();
  const canEdit = user.role === 'admin';
  const canRegister = (user.role === 'admin' || user.role === 'operador') && !item.archived;
  const [record, setRecord] = useState<{ status: 'loading' | 'ready' | 'error'; value: LifeRecord | null; error?: string }>({ status: 'loading', value: null });
  const [history, setHistory] = useState<{ status: 'loading' | 'ready' | 'error'; rows: MaintenanceRecord[]; total: number; error?: string }>({ status: 'loading', rows: [], total: 0 });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [latest, setLatest] = useState<MaintenanceRecord | undefined>();
  const [editing, setEditing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const close = () => { if (!busy) onClose(); };
  useDialogFocus(dialog, close, true, '[data-life-heading]');

  useEffect(() => {
    let live = true;
    services.readRecord(item.id).then(value => { if (live) setRecord({ status: 'ready', value }); },
      cause => { if (live) setRecord({ status: 'error', value: null, error: errorMessage(cause) }); });
    return () => { live = false; };
  }, [services, item.id, reload]);
  useEffect(() => {
    let live = true;
    services.readMaintenance(item.id, page).then(result => {
      if (!live) return;
      setHistory({ status: 'ready', ...result });
      if (page === 1) setLatest(result.rows[0]);
    }, cause => { if (live) setHistory({ status: 'error', rows: [], total: 0, error: errorMessage(cause) }); });
    return () => { live = false; };
  }, [services, item.id, page, reload]);

  const today = services.today();
  const next = nextMaintenance(latest, today);
  const pages = Math.max(1, Math.ceil(history.total / MAINTENANCE_PAGE_SIZE));
  const sections = lifeRecordSections(type);

  return createPortal(<div className="ui-modal-layer fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-3 sm:p-6"
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} data-tool-life-dialog role="dialog" aria-modal="true" aria-labelledby={heading} aria-busy={busy}
      className={`ui-dialog-panel ${active ? 'ui-panel-enter' : ''} bg-white rounded-2xl border shadow-2xl w-full max-w-3xl max-h-[calc(var(--app-viewport-height,100dvh)-24px)] flex flex-col overflow-hidden`}>
      <header className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-6">
        <h2 id={heading} data-life-heading tabIndex={-1} className="font-bold text-xl flex items-center gap-3 min-w-0 break-words">
          <StateIcon icon="assignment" />Hoja de vida · {item.codigo}
        </h2>
        <button type="button" data-dialog-close aria-label="Cerrar hoja de vida" disabled={busy} onClick={close} className="shrink-0 min-w-11 min-h-11 text-2xl disabled:opacity-40">×</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6 space-y-6">
        <section aria-label="Identificación del producto" className="rounded-xl bg-[#f8fafc] p-4">
          <p className="text-xs font-semibold uppercase text-[#454651]">{TOOL_TYPE_LABEL[type]}</p>
          <p className="mt-1 text-lg font-bold break-words">{item.nombre}</p>
          <dl className="mt-3 grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Datum label="Código" value={item.codigo} />
            <Datum label="Marca" value={item.marca || ''} />
            <Datum label="Categoría" value={categoryLabel(item.categoria)} />
            <Datum label="Estado" value={normalizeItemCondition(item.estado)} />
            <Datum label="Stock" value={item.stockPendiente ? 'Pendiente de verificar' : `${item.cantidad} ${item.unidad}`} />
            <Datum label={`Valor por 1 ${item.unidad.toUpperCase()}`} value={formatCOP(item.valorUnitario || 0)} />
          </dl>
        </section>
        {next && <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${next.overdue ? 'bg-[#fce8e6] text-[#ba1a1a]' : 'bg-[#e6f4ea] text-[#137333]'}`}>
          {next.overdue ? `Mantenimiento vencido desde el ${formatDay(next.date)}.` : next.days === 0 ? 'El próximo mantenimiento es hoy.'
            : `Próximo mantenimiento: ${formatDay(next.date)} (en ${next.days} día${next.days === 1 ? '' : 's'}).`}
        </p>}
        {notice && <p role="status" className="text-sm text-[#137333]">{notice}</p>}

        <section aria-labelledby={`${heading}-data`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id={`${heading}-data`} className="text-base font-bold">Datos de la herramienta</h3>
            {canEdit && !editing && record.status === 'ready' && <button type="button" data-action="edit" disabled={busy}
              onClick={() => { setNotice(''); setEditing(true); }} className="min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2"><StateIcon icon="edit" />Editar datos</button>}
          </div>
          {record.status === 'loading' && <p role="status" className="text-sm text-slate-500">Cargando hoja de vida…</p>}
          {record.status === 'error' && <p role="alert" className="text-sm text-red-700 break-words">{record.error}</p>}
          {record.status === 'ready' && (editing
            ? <LifeDataForm itemId={item.id} type={type} record={record.value} save={services.saveRecord} onBusyChange={setBusy}
              onCancel={() => setEditing(false)} onSaved={value => { setRecord({ status: 'ready', value }); setEditing(false); setNotice('Hoja de vida guardada.'); }} />
            : <>{sections.map(section => <div key={section.title} className="rounded-xl bg-[#f8fafc] p-4">
                <h4 className="text-sm font-bold text-[#253685]">{section.title}</h4>
                <dl className="mt-3 grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {section.fields.map(field => <div key={field.key} className={field.kind === 'long' ? 'min-[400px]:col-span-2' : undefined}>
                    <Datum label={field.label} value={field.kind === 'date' ? (record.value?.datos[field.key] ? formatDay(record.value.datos[field.key]) : '') : record.value?.datos[field.key] || ''} multiline={field.kind === 'long'} />
                  </div>)}
                </dl>
              </div>)}
              {record.value?.updatedAt && <p className="text-xs text-slate-500">Actualizada el {new Date(record.value.updatedAt).toLocaleString('es-CO')}{record.value.updatedBy ? ` por ${record.value.updatedBy}` : ''}.</p>}
            </>)}
        </section>

        <section aria-labelledby={`${heading}-maintenance`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id={`${heading}-maintenance`} className="text-base font-bold">Historial de mantenimiento ({history.total})</h3>
            {canRegister && !registering && <button type="button" data-action="entry" disabled={busy}
              onClick={() => { setNotice(''); setRegistering(true); }} className="min-h-11 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2"><StateIcon icon="build" />Registrar mantenimiento</button>}
          </div>
          {registering && <MaintenanceForm itemId={item.id} today={today} register={services.register} onBusyChange={setBusy}
            onCancel={() => setRegistering(false)}
            onSaved={() => { setRegistering(false); setPage(1); setReload(value => value + 1); setNotice('Mantenimiento registrado.'); }} />}
          {history.status === 'loading' && <p role="status" className="text-sm text-slate-500">Cargando mantenimientos…</p>}
          {history.status === 'error' && <p role="alert" className="text-sm text-red-700 break-words">{history.error}</p>}
          {history.status === 'ready' && !history.rows.length && <p className="text-sm text-slate-500">Aún no hay mantenimientos registrados.</p>}
          <ol className="space-y-4">
            {history.rows.map(row => <li key={row.id}><MaintenanceCard row={row} resolvePhoto={services.resolvePhoto} /></li>)}
          </ol>
          {pages > 1 && <nav aria-label="Páginas de mantenimientos" className="flex items-center justify-center gap-3">
            <button type="button" disabled={page === 1 || busy} onClick={() => setPage(page - 1)} className="min-h-11 px-3 rounded-lg border disabled:opacity-40">Anterior</button>
            <span className="text-sm">Página {page} de {pages}</span>
            <button type="button" disabled={page === pages || busy} onClick={() => setPage(page + 1)} className="min-h-11 px-3 rounded-lg border disabled:opacity-40">Siguiente</button>
          </nav>}
        </section>
      </div>
    </section>
  </div>, document.body);
}

function Datum({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt>
    <dd className={`mt-1 break-words ${multiline ? 'whitespace-pre-wrap' : ''} ${value ? '' : 'text-slate-400'}`}>{value || 'Sin registrar'}</dd></div>;
}

function LifeDataForm({ itemId, type, record, save, onBusyChange, onCancel, onSaved }: {
  itemId: string; type: ToolType; record: LifeRecord | null; save: ToolLifeServices['saveRecord'];
  onBusyChange: (busy: boolean) => void; onCancel: () => void; onSaved: (record: LifeRecord) => void;
}) {
  const id = useId();
  // Keys of the other tool type are kept as they are.
  const [draft, setDraft] = useState<LifeData>(() => ({ ...(record?.datos || {}) }));
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current) return;
    try { validateLifeData(draft, type); } catch (cause) { setError(errorMessage(cause)); return; }
    saving.current = true; setPending(true); onBusyChange(true); setError('');
    try { onSaved(await save(itemId, record?.version ?? 0, normalizeLifeData(draft))); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); onBusyChange(false); }
  };
  return <form autoComplete="off" onSubmit={submit} aria-busy={pending} className="space-y-4">
    {error && <p role="alert" className="text-sm text-red-700 break-words">{error}</p>}
    <fieldset disabled={pending} className="space-y-4 min-w-0">
      {lifeRecordSections(type).map(section => <fieldset key={section.title} className="rounded-xl bg-[#f8fafc] p-4 min-w-0">
        <legend className="text-sm font-bold text-[#253685] px-1">{section.title}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {section.fields.map(field => <label key={field.key} htmlFor={`${id}-${field.key}`} className={`block text-sm font-semibold min-w-0 ${field.kind === 'long' ? 'sm:col-span-2' : ''}`}>{field.label}
            {field.kind === 'long'
              ? <textarea id={`${id}-${field.key}`} rows={3} maxLength={2000} value={draft[field.key] || ''} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })}
                className="block w-full mt-1 p-2.5 border rounded-lg font-normal" />
              : <input id={`${id}-${field.key}`} autoComplete="off" autoCorrect="off" spellCheck={false}
                type={field.kind === 'date' ? 'date' : 'text'} inputMode={field.kind === 'year' ? 'numeric' : undefined}
                maxLength={field.kind === 'year' ? 4 : 200} placeholder={field.placeholder} value={draft[field.key] || ''}
                onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} className="block w-full mt-1 p-2.5 border rounded-lg font-normal" />}
          </label>)}
        </div>
      </fieldset>)}
    </fieldset>
    <div className="grid grid-cols-2 gap-4">
      <button type="button" data-action="cancel" disabled={pending} onClick={onCancel} className="min-h-11 px-4 rounded-lg border text-sm">Cancelar</button>
      <button type="submit" data-action="edit" disabled={pending} className="min-h-11 px-4 rounded-lg text-sm font-semibold">{pending ? 'Guardando…' : 'Guardar hoja de vida'}</button>
    </div>
  </form>;
}

function MaintenanceForm({ itemId, today, register, onBusyChange, onCancel, onSaved }: {
  itemId: string; today: string; register: ToolLifeServices['register'];
  onBusyChange: (busy: boolean) => void; onCancel: () => void; onSaved: () => void;
}) {
  const id = useId();
  const [input, setInput] = useState<MaintenanceInput>(() => emptyMaintenance(today));
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  // The same UUID is reused while the data and photos stay the same after an uncertain error.
  const request = useRef<{ signature: string; id: string } | null>(null);
  const change = (patch: Partial<MaintenanceInput>) => setInput(previous => ({ ...previous, ...patch }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current || photoBusy) return;
    try { validateMaintenance(input, today); } catch (cause) { setError(errorMessage(cause)); return; }
    const signature = JSON.stringify([input, photos]);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    saving.current = true; setPending(true); onBusyChange(true); setError('');
    try { await register(request.current.id, itemId, input, photos); request.current = null; onSaved(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); onBusyChange(false); }
  };
  const field = 'block w-full mt-1 p-2.5 border rounded-lg font-normal';
  return <form autoComplete="off" onSubmit={submit} aria-busy={pending} className="rounded-xl bg-[#f8fafc] p-4 space-y-4">
    <h4 className="text-sm font-bold text-[#253685]">Nuevo mantenimiento</h4>
    {error && <p role="alert" className="text-sm text-red-700 break-words">{error}</p>}
    <fieldset disabled={pending} className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label htmlFor={`${id}-date`} className="block text-sm font-semibold">Fecha
          <input id={`${id}-date`} type="date" required max={today} value={input.fecha} onChange={event => change({ fecha: event.target.value })} className={field} /></label>
        <label className="block text-sm font-semibold">Tipo
          <Select value={input.tipo} onChange={event => change({ tipo: event.target.value })} className={field}>
            {maintenanceTypes.map(option => <option key={option} value={option}>{option}</option>)}
          </Select></label>
        <label htmlFor={`${id}-description`} className="block text-sm font-semibold sm:col-span-2">Trabajo realizado
          <textarea id={`${id}-description`} required rows={3} maxLength={2000} value={input.descripcion} onChange={event => change({ descripcion: event.target.value })} className={field} /></label>
        <label htmlFor={`${id}-by`} className="block text-sm font-semibold">Realizado por (técnico o taller)
          <input id={`${id}-by`} required maxLength={120} autoComplete="off" value={input.realizadoPor} onChange={event => change({ realizadoPor: event.target.value })} className={field} /></label>
        <label htmlFor={`${id}-parts`} className="block text-sm font-semibold">Repuestos o insumos
          <input id={`${id}-parts`} maxLength={1000} autoComplete="off" value={input.repuestos} onChange={event => change({ repuestos: event.target.value })} className={field} /></label>
        <label className="block text-sm font-semibold">Costo (COP)
          <NumberInput min="0" step="0.01" value={input.costoCop} onValueChange={value => change({ costoCop: value })} className={field} /></label>
        <label htmlFor={`${id}-hours`} className="block text-sm font-semibold">Horas de uso / horómetro
          <input id={`${id}-hours`} type="number" min="0" step="0.1" inputMode="decimal" value={input.horasUso ?? ''} placeholder="Opcional"
            onChange={event => change({ horasUso: event.target.value === '' || !Number.isFinite(event.target.valueAsNumber) ? null : event.target.valueAsNumber })}
            className={`ui-number-input ${field}`} /></label>
        <label htmlFor={`${id}-next`} className="block text-sm font-semibold">Próximo mantenimiento
          <input id={`${id}-next`} type="date" min={input.fecha || undefined} value={input.proximaFecha} onChange={event => change({ proximaFecha: event.target.value })} className={field} /></label>
        <label htmlFor={`${id}-notes`} className="block text-sm font-semibold sm:col-span-2">Observaciones
          <textarea id={`${id}-notes`} rows={2} maxLength={1000} value={input.observaciones} onChange={event => change({ observaciones: event.target.value })} className={field} /></label>
      </div>
    </fieldset>
    <OutgoingPhotoPicker photos={photos} onChange={setPhotos} disabled={pending} onBusyChange={setPhotoBusy} labels={PHOTO_LABELS} />
    <div className="grid grid-cols-2 gap-4">
      <button type="button" data-action="cancel" disabled={pending} onClick={onCancel} className="min-h-11 px-4 rounded-lg border text-sm">Cancelar</button>
      <button type="submit" data-action="entry" disabled={pending || photoBusy} className="min-h-11 px-4 rounded-lg text-sm font-semibold">{pending ? 'Guardando…' : 'Guardar mantenimiento'}</button>
    </div>
  </form>;
}

function MaintenanceCard({ row, resolvePhoto }: { row: MaintenanceRecord; resolvePhoto: ToolLifeServices['resolvePhoto'] }) {
  return <article data-maintenance-id={row.id} className="rounded-xl bg-[#f8fafc] p-4 space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-bold">{formatDay(row.fecha)}</p>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.tipo === 'CORRECTIVO' ? 'bg-[#fce8e6] text-[#ba1a1a]' : row.tipo === 'PREVENTIVO' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#eaedff] text-[#253685]'}`}>{row.tipo}</span>
    </div>
    <p className="whitespace-pre-wrap break-words">{row.descripcion}</p>
    <dl className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-6 gap-y-2">
      <Datum label="Realizado por" value={row.realizadoPor} />
      <Datum label="Costo" value={formatCOP(row.costoCop)} />
      <Datum label="Repuestos o insumos" value={row.repuestos} />
      <Datum label="Horas de uso" value={row.horasUso === null ? '' : `${row.horasUso.toLocaleString('es-CO')} h`} />
      <Datum label="Próximo mantenimiento" value={row.proximaFecha ? formatDay(row.proximaFecha) : ''} />
      <Datum label="Registrado por" value={row.registradoPor} />
      {row.observaciones && <div className="min-[400px]:col-span-2"><Datum label="Observaciones" value={row.observaciones} multiline /></div>}
    </dl>
    {!!row.fotos.length && <div className="photo-tiles">{row.fotos.map((photo, index) => <MaintenancePhoto key={photo} source={photo} index={index} resolve={resolvePhoto} />)}</div>}
  </article>;
}

function MaintenancePhoto({ source, index, resolve }: { source: string; index: number; resolve: ToolLifeServices['resolvePhoto'] }) {
  const [state, setState] = useState<{ source: string; url?: string; error?: boolean }>({ source });
  useEffect(() => {
    let live = true;
    resolve(source).then(url => { if (live) setState({ source, url }); }, () => { if (live) setState({ source, error: true }); });
    return () => { live = false; };
  }, [source, resolve]);
  const current = state.source === source ? state : { source };
  if (current.error) return <p className="text-xs text-red-700">No se pudo cargar la foto {index + 1}.</p>;
  if (!current.url) return <div role="status" aria-label={`Cargando foto ${index + 1}`} className="aspect-square rounded-lg bg-white" />;
  return <a href={current.url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-white" aria-label={`Abrir foto ${index + 1} del mantenimiento`}>
    <img src={current.url} alt={`Mantenimiento, foto ${index + 1}`} loading="lazy" className="w-full h-full object-contain" />
  </a>;
}

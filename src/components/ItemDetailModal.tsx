import { StateIcon } from './ui/StateIcon';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { itemConditionOptions, normalizeItemCondition } from '../domain/itemCondition';
import { Presence } from './ui/Motion';
import { ItemEditDialog } from './item/ItemEditDialog';
import { Select } from './ui/Select';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useInventory } from '../context/InventoryContext';
import type { Elemento } from '../types';
import { isDemo } from '../lib/supabase';
import { available } from '../domain/inventory';
import { errorMessage } from '../shared/errors';
import { ItemPhotoGallery } from './item/ItemPhotoGallery';
import { ItemPhotoPicker } from './ItemPhotoPicker';
import { ItemHistory } from './item/ItemHistory';
import { NumberInput } from './NumberInput';
import { ItemWeightFields } from './item/ItemWeightFields';
import { formatUnitWeight, parseWeightDraft, weightDraft } from '../domain/weight';
import { ArchivedItemActions } from './administration/ArchivedItemActions';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { ItemExistingLocationFields } from './item/ItemExistingLocationFields';
import { changedItemLocation, itemLocationDraft } from '../domain/itemLocation';
import { ItemValueField } from './item/ItemValueField';
import { formatCOP } from '../domain/money';

interface Props { item: Elemento | null; onClose: () => void; onPermanentDelete?: (item: Elemento) => Promise<void>; onRestore?: (item: Elemento) => Promise<void> }

export function ItemDetailModal(props: Props) {
  const inventory = useInventory();
  return <ItemDetailContent {...props} inventory={inventory} history={props.item && <ItemHistory itemId={props.item.id} />} />;
}
type DetailInventory = Pick<ReturnType<typeof useInventory>, 'user' | 'getLocationString' | 'openQuickMovement' | 'addToDispatchCart'
  | 'updateElemento' | 'deleteElemento' | 'categoryLabel' | 'almacenes' | 'estanterias' | 'cajas' | 'niveles'>
  & Partial<Pick<ReturnType<typeof useInventory>, 'addEstanteria' | 'addNivel' | 'addCaja' | 'quickMovementItem' | 'quickMovementType' | 'dispatchSelection'>>;
export function ItemDetailContent({ item, onClose, onPermanentDelete, onRestore, inventory, history }: Props & { inventory: DetailInventory; history?: ReactNode }) {
  const { user, getLocationString, openQuickMovement, addToDispatchCart,
    updateElemento, deleteElemento, categoryLabel, almacenes, estanterias, cajas, niveles, addEstanteria, addNivel, addCaja } = inventory;
  const [editing, setEditing] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [name, setName] = useState(item?.nombre || '');
  const [brand, setBrand] = useState(item?.marca || '');
  const [description, setDescription] = useState(item?.descripcion || '');
  const [minimum, setMinimum] = useState(item?.stockMinimo ?? 0);
  const [photo, setPhoto] = useState(item?.fotoUrl || '');
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>(item?.fotosAdicionales || []);
  const [condition, setCondition] = useState(normalizeItemCondition(item?.estado));
  const [damaged, setDamaged] = useState(item?.cantidadDanados ?? 0);
  const [weight, setWeight] = useState(() => weightDraft(item?.pesoUnitario));
  const [location, setLocation] = useState(() => itemLocationDraft(item));
  const [valorUnitario, setValorUnitario] = useState(item?.valorUnitario || 0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationDraft, setLocationDraft] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const saving = useRef(false);
  const canAdmin = isDemo || user.role === 'admin';
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);

  const busy = pending || photoBusy || locationBusy;
  const close = () => { if (!busy && !editing && !archiveConfirm) onClose(); };
  useDialogFocus(dialog, close);
  if (!item) return null;
  const entryOpen = inventory.quickMovementItem?.id === item.id && inventory.quickMovementType === 'ENTRADA';
  const adjustmentOpen = inventory.quickMovementItem?.id === item.id && inventory.quickMovementType === 'AJUSTE';
  const dispatchOpen = inventory.dispatchSelection?.itemId === item.id;
  const closeEdit = () => { if (!busy) { setEditing(false); setError(''); } };

  const startEdit = () => {
    if (editing || busy) return;
    setName(item.nombre); setBrand(item.marca || ''); setDescription(item.descripcion); setMinimum(item.stockMinimo);
    setPhoto(item.fotoUrl || ''); setCondition(normalizeItemCondition(item.estado)); setDamaged(item.cantidadDanados ?? 0);
    setAdditionalPhotos(item.fotosAdicionales || []);
    setWeight(weightDraft(item.pesoUnitario));
    setLocation(itemLocationDraft(item));
    setValorUnitario(item.valorUnitario || 0);
    setError(''); setEditing(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current || photoBusy || locationBusy || !canAdmin || item.archived) return;
    if (locationDraft) { setError('Cree o seleccione la ubicación antes de guardar el producto.'); return; }
    saving.current = true;
    setError(''); setPending(true);
    try {
      await updateElemento(item.id, { nombre: name.trim(), marca: brand.trim(), descripcion: description.trim(), stockMinimo: minimum,
        fotoUrl: photo.trim(), fotosAdicionales: additionalPhotos, estado: condition, cantidadDanados: damaged, pesoUnitario: parseWeightDraft(weight),
        valorUnitario, ...changedItemLocation(location, item) });
      setEditing(false);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };
  const archive = async () => {
    if (saving.current || busy || !canAdmin || item.archived) return;
    saving.current = true;
    setError(''); setPending(true);
    try { await deleteElemento(item.id); setArchiveConfirm(false); onClose(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };

  return <div className="ui-modal-layer fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6" role="presentation"
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="item-detail-heading"
      aria-busy={busy}
      inert={editing || archiveConfirm} aria-hidden={editing || archiveConfirm || undefined}
      className="ui-dialog-panel ui-panel-enter relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] shadow-2xl border flex flex-col overflow-hidden">
      <button data-dialog-close type="button" onClick={close} disabled={busy} aria-label="Cerrar detalle" title="Cerrar detalle"
        className="item-detail-close absolute top-6 right-6 sm:top-8 sm:right-8 z-20 w-11 h-11 rounded-xl flex items-center justify-center text-[#253685]">
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">close</span>
      </button>
      <div className="item-detail-scroll flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        {error && !editing && <p role="alert" className="text-red-700 text-sm">{error}</p>}
        {item.archived && <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">Elemento archivado. No admite entradas, salidas ni edición.</p>}
        {item.stockPendiente && <p role="status" className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          Stock pendiente de verificar desde el Excel. No disponible para salida hasta que administración registre el ajuste.
        </p>}
        <div className="item-detail-summary flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <ItemPhotoGallery key={JSON.stringify([item.fotoUrl, item.fotosAdicionales])} item={item} />
            <div className="min-w-0">
              <h2 id="item-detail-heading" className="text-xl sm:text-2xl font-bold text-[#131b2e] break-words">{item.nombre}</h2>
              <dl className="item-detail-data mt-5 grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="min-w-0"><dt className="text-xs text-slate-500">Código</dt><dd className="font-mono-code font-semibold mt-1 break-words">{item.codigo}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500">Categoría</dt><dd className="font-semibold mt-1 break-words">{categoryLabel(item.categoria)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500">Marca</dt><dd className="mt-1 break-words">{item.marca || 'Sin declarar'}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500">Estado</dt><dd className="mt-1 break-words">{normalizeItemCondition(item.estado)}</dd></div>
                <div className="min-w-0 min-[400px]:col-span-2"><dt className="text-xs text-slate-500">Ubicación</dt><dd className="mt-1 break-words">{getLocationString(item)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500">Peso por 1 {item.unidad.toUpperCase()}</dt><dd className={`mt-1 break-words ${item.pesoUnitario ? 'text-[#253685]' : 'text-amber-700'}`}>{formatUnitWeight(item.pesoUnitario)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500">Valor por 1 {item.unidad.toUpperCase()}</dt><dd className="mt-1 break-words text-[#253685]">{formatCOP(item.valorUnitario || 0)}</dd></div>
                {item.descripcion && <div className="min-w-0 min-[400px]:col-span-2"><dt className="text-xs text-slate-500">Descripción / comentarios</dt><dd className="mt-1 whitespace-pre-wrap break-words">{item.descripcion}</dd></div>}
              </dl>
            </div>
          </div>
          <div className="item-detail-stock grid grid-cols-3 gap-4 text-center">
            <div className="min-w-0 p-2 sm:p-3 rounded-xl bg-[#f8fafc]"><strong className="block text-2xl sm:text-3xl break-words">{item.cantidad}</strong><span className="text-xs">Stock {item.unidad}</span></div>
            <div className="min-w-0 p-2 sm:p-3 rounded-xl bg-[#f8fafc]"><strong className="block text-2xl sm:text-3xl break-words">{available(item)}</strong><span className="text-xs">Disponible</span></div>
            <div className="min-w-0 p-2 sm:p-3 rounded-xl bg-[#f8fafc]"><strong className="block text-2xl sm:text-3xl break-words">{item.cantidadDanados ?? 0}</strong><span className="text-xs">Dañado</span></div>
          </div>
          {item.archived && canAdmin && <ArchivedItemActions item={item} onDelete={onPermanentDelete} onRestore={onRestore} />}
        </div>
        {!item.archived && <div className="item-detail-actions">
          {canAdmin && <button type="button" data-action="edit" aria-pressed={editing} disabled={busy} onClick={startEdit} aria-label="Editar" title="Editar" className="ui-flat-choice p-2 rounded-lg"><StateIcon icon="edit" filled={editing} /></button>}
          {canOperate && !item.stockPendiente && <button type="button" data-action="entry" aria-pressed={entryOpen} disabled={busy || editing} onClick={() => openQuickMovement(item, 'ENTRADA')} aria-label="Entrada" title="Entrada" className="ui-flat-choice p-2 rounded-lg"><StateIcon icon="input" filled={entryOpen} /></button>}
          {(canAdmin || canOperate && !item.stockPendiente) && <button type="button" data-action="adjustment" aria-pressed={adjustmentOpen} disabled={busy || editing} onClick={() => openQuickMovement(item, 'AJUSTE')} aria-label={item.stockPendiente ? 'Resolver stock pendiente' : 'Ajuste'} title={item.stockPendiente ? 'Resolver stock pendiente' : 'Ajuste'} className="ui-flat-choice p-2 rounded-lg"><StateIcon icon="tune" filled={adjustmentOpen} /></button>}
          {canOperate && <button type="button" data-action="dispatch" aria-pressed={dispatchOpen} disabled={busy || editing || available(item) === 0} onClick={() => addToDispatchCart(item)} aria-label="Agregar a la salida" title="Agregar a la salida"
            className="ui-flat-choice p-2 rounded-lg disabled:opacity-40"><StateIcon icon="add_shopping_cart" filled={dispatchOpen} /></button>}
          {canAdmin && <button type="button" data-action="archive" aria-pressed={archiveConfirm} disabled={busy || editing} onClick={() => { setError(''); setArchiveConfirm(true); }} aria-label="Archivar" title="Archivar" className="ui-flat-choice p-2 rounded-lg"><StateIcon icon="archive" filled={archiveConfirm} /></button>}
        </div>}
        {history}
      </div>
    </section>
    <Presence open={editing}>{editing && <ItemEditDialog code={item.codigo} busy={busy} onClose={closeEdit}>
        <form autoComplete="off" id="item-edit-form" onSubmit={save} className="space-y-4">
          {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
          <label className="block text-sm font-semibold">Nombre
            <input autoComplete="off" autoCorrect="off" spellCheck={false} required value={name} onChange={event => setName(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg" />
          </label>
          <label className="block text-sm font-semibold">Marca
            <input autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={100} value={brand} onChange={event => setBrand(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg" />
          </label>
          <label className="block text-sm font-semibold">Descripción
            <textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={description} onChange={event => setDescription(event.target.value)} rows={3} className="block w-full mt-1 p-2.5 border rounded-lg" />
          </label>
          <ItemExistingLocationFields value={location} onChange={setLocation} warehouses={almacenes} racks={estanterias} levels={niveles} boxes={cajas} disabled={pending || photoBusy}
            onCreateRack={addEstanteria} onCreateLevel={addNivel} onCreateBox={addCaja} onBusyChange={setLocationBusy} onDraftChange={setLocationDraft} />
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Stock mínimo
              <NumberInput min="0" step="0.001" required value={minimum} onValueChange={setMinimum} className="block w-full mt-1 p-2.5 border rounded-lg" />
            </label>
            <label className="text-sm font-semibold">Unidades dañadas
              <NumberInput min="0" max={item.cantidad} step="0.001" required value={damaged} onValueChange={setDamaged} className="block w-full mt-1 p-2.5 border rounded-lg" />
            </label>
          </div>
          <ItemWeightFields value={weight} onChange={setWeight} stockUnit={item.unidad} disabled={pending} />
          <ItemValueField value={valorUnitario} onChange={setValorUnitario} unit={item.unidad} disabled={pending} />
          <label className="block text-sm font-semibold">Estado
            <Select value={condition} onChange={event => setCondition(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg">
              {!itemConditionOptions.some(option => option.value === condition) && <option value={condition}>{condition}</option>}
              {itemConditionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>
          <ItemPhotoPicker value={photo} additional={additionalPhotos} category={item.categoria} onChange={setPhoto} onAdditionalChange={setAdditionalPhotos} onBusyChange={setPhotoBusy} disabled={pending} />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button type="button" data-action="cancel" onClick={closeEdit} disabled={busy} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            <button type="submit" data-action="edit" disabled={busy || locationDraft} className="px-4 py-2 rounded-lg text-sm font-semibold">{pending ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
    </ItemEditDialog>}</Presence>
    <Presence open={archiveConfirm}>{archiveConfirm && <ConfirmDialog title="Archivar producto" message={`¿Archivar ${item.codigo} · ${item.nombre}?`} pending={pending} error={error}
      onCancel={() => { setArchiveConfirm(false); setError(''); }} onConfirm={() => { void archive(); }} />}</Presence>
  </div>;
}

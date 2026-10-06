import { ScreenTransition } from './ui/Motion';
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
  | 'updateElemento' | 'deleteElemento' | 'categoryLabel' | 'almacenes' | 'estanterias' | 'cajas'>;
export function ItemDetailContent({ item, onClose, onPermanentDelete, onRestore, inventory, history }: Props & { inventory: DetailInventory; history?: ReactNode }) {
  const { user, getLocationString, openQuickMovement, addToDispatchCart,
    updateElemento, deleteElemento, categoryLabel, almacenes, estanterias, cajas } = inventory;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item?.nombre || '');
  const [description, setDescription] = useState(item?.descripcion || '');
  const [minimum, setMinimum] = useState(item?.stockMinimo ?? 0);
  const [photo, setPhoto] = useState(item?.fotoUrl || '');
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>(item?.fotosAdicionales || []);
  const [condition, setCondition] = useState(item?.estado || 'BUENO');
  const [damaged, setDamaged] = useState(item?.cantidadDanados ?? 0);
  const [weight, setWeight] = useState(() => weightDraft(item?.pesoUnitario));
  const [location, setLocation] = useState(() => itemLocationDraft(item));
  const [valorUnitario, setValorUnitario] = useState(item?.valorUnitario || 0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const saving = useRef(false);
  const canAdmin = isDemo || user.role === 'admin';
  const canOperate = isDemo || ['admin', 'operador'].includes(user.role);

  useDialogFocus(dialog, onClose);
  if (!item) return null;

  const startEdit = () => {
    setName(item.nombre); setDescription(item.descripcion); setMinimum(item.stockMinimo);
    setPhoto(item.fotoUrl || ''); setCondition(item.estado || 'BUENO'); setDamaged(item.cantidadDanados ?? 0);
    setAdditionalPhotos(item.fotosAdicionales || []);
    setWeight(weightDraft(item.pesoUnitario));
    setLocation(itemLocationDraft(item));
    setValorUnitario(item.valorUnitario || 0);
    setError(''); setEditing(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current || photoBusy || !canAdmin || item.archived) return;
    saving.current = true;
    setError(''); setPending(true);
    try {
      await updateElemento(item.id, { nombre: name.trim(), descripcion: description.trim(), stockMinimo: minimum,
        fotoUrl: photo.trim(), fotosAdicionales: additionalPhotos, estado: condition, cantidadDanados: damaged, pesoUnitario: parseWeightDraft(weight),
        valorUnitario, ...changedItemLocation(location, item) });
      setEditing(false);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };
  const archive = async () => {
    if (!window.confirm(`¿Archivar ${item.codigo} - ${item.nombre}?`)) return;
    setError(''); setPending(true);
    try { await deleteElemento(item.id); onClose(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setPending(false); }
  };

  return <div className="ui-modal-layer fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6" role="presentation">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="item-detail-heading"
      className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] shadow-2xl border flex flex-col overflow-hidden">
      <header className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between bg-[#f8fafc]">
        <div className="min-w-0 flex flex-wrap gap-x-3 gap-y-1"><span className="font-mono-code font-bold text-[#253685]">{item.codigo}</span>
          <span className="break-words text-xs text-[#64748b]">{categoryLabel(item.categoria)}</span></div>
        <button data-dialog-close type="button" onClick={onClose} aria-label="Cerrar detalle" className="min-w-11 min-h-11 text-2xl text-[#64748b]">×</button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
        {item.archived && <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">Elemento archivado. No admite entradas, salidas ni edición.</p>}
        {item.stockPendiente && <p role="status" className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          Stock pendiente de verificar desde el Excel. No disponible para salida hasta que administración registre el ajuste.
        </p>}
        <ScreenTransition screen={editing ? "edit" : "detail"}>{editing ? <form id="item-edit-form" onSubmit={save} className="space-y-4">
          <h2 id="item-detail-heading" className="text-xl font-bold">Editar {item.codigo}</h2>
          <label className="block text-sm font-semibold">Nombre
            <input required value={name} onChange={event => setName(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg" />
          </label>
          <label className="block text-sm font-semibold">Descripción
            <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} className="block w-full mt-1 p-2.5 border rounded-lg" />
          </label>
          <ItemExistingLocationFields value={location} onChange={setLocation} warehouses={almacenes} racks={estanterias} boxes={cajas} disabled={pending || photoBusy} />
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
              {['BUENO', 'REGULAR', 'MALO', 'REPARACION', 'RETAL'].map(value => <option key={value}>{value}</option>)}
            </Select>
          </label>
          <ItemPhotoPicker value={photo} additional={additionalPhotos} category={item.categoria} onChange={setPhoto} onAdditionalChange={setAdditionalPhotos} onBusyChange={setPhotoBusy} disabled={pending} />
        </form> : <>
          <div className="flex flex-col gap-5">
            <ItemPhotoGallery key={JSON.stringify([item.fotoUrl, item.fotosAdicionales])} item={item} />
            <div className="min-w-0">
              <h2 id="item-detail-heading" className="text-xl font-bold text-[#131b2e]">{item.nombre}</h2>
              <p className="text-sm text-[#454651] mt-2">{item.descripcion}</p>
              <p className="text-xs text-[#64748b] mt-3">Ubicación: {getLocationString(item)}</p>
              <p className="text-xs text-[#64748b] mt-1">Estado: {item.estado || 'BUENO'}</p>
              <p className={`text-sm mt-2 ${item.pesoUnitario ? 'text-[#253685]' : 'text-amber-700'}`}>Peso por 1 {item.unidad.toUpperCase()}: {formatUnitWeight(item.pesoUnitario)}</p>
              <p className="text-sm mt-2 text-[#253685]">Valor por 1 {item.unidad.toUpperCase()}: {formatCOP(item.valorUnitario || 0)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="min-w-0 p-2 sm:p-3 rounded-xl bg-[#f8fafc]"><strong className="block text-lg">{item.cantidad}</strong><span className="text-xs">Stock {item.unidad}</span></div>
            <div className="min-w-0 p-2 sm:p-3 rounded-xl bg-[#f8fafc]"><strong className="block text-lg">{available(item)}</strong><span className="text-xs">Disponible</span></div>
            <div className="min-w-0 p-2 sm:p-3 rounded-xl bg-[#f8fafc]"><strong className="block text-lg">{item.cantidadDanados ?? 0}</strong><span className="text-xs">Dañado</span></div>
          </div>
          <div className="responsive-actions">
            {!item.archived && <>
            {canAdmin && <button type="button" onClick={startEdit} className="px-3 py-2 rounded-lg border text-sm font-semibold">Editar</button>}
            {canOperate && !item.stockPendiente && <button type="button" onClick={() => openQuickMovement(item, 'ENTRADA')} className="px-3 py-2 rounded-lg bg-[#e6f4ea] text-[#137333] text-sm font-semibold">Entrada</button>}
            {(canAdmin || canOperate && !item.stockPendiente) && <button type="button" onClick={() => openQuickMovement(item, 'AJUSTE')} className="px-3 py-2 rounded-lg bg-[#fef7e0] text-[#755b00] text-sm font-semibold">{item.stockPendiente ? 'Resolver stock pendiente' : 'Ajuste'}</button>}
            {canOperate && <button type="button" disabled={available(item) === 0} onClick={() => addToDispatchCart(item)}
              className="px-3 py-2 rounded-lg bg-[#dd4c42] text-white text-sm font-semibold disabled:opacity-40">Agregar a la salida</button>}
            {canAdmin && <button type="button" disabled={pending} onClick={archive} className="px-3 py-2 rounded-lg border text-red-700 text-sm font-semibold">Archivar</button>}
            </>}
          </div>
          {item.archived && canAdmin && <ArchivedItemActions item={item} onDelete={onPermanentDelete} onRestore={onRestore} />}
        </>}</ScreenTransition>
        {history}
      </div>
      <footer className="p-4 border-t bg-[#f8fafc] flex justify-end gap-2">
        {editing && <><button type="button" onClick={() => setEditing(false)} disabled={pending || photoBusy} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
          <button type="submit" form="item-edit-form" disabled={pending || photoBusy} className="px-4 py-2 bg-[#3e4e9e] text-white rounded-lg text-sm font-semibold">{pending ? 'Guardando…' : 'Guardar'}</button></>}
        {!editing && <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cerrar</button>}
      </footer>
    </section>
  </div>;
}

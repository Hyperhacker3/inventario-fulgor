import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Almacen, Caja, Elemento, Estanteria, NivelEstanteria } from '../../types';
import { ItemEditDialog } from '../item/ItemEditDialog';
import { ItemExistingLocationFields } from '../item/ItemExistingLocationFields';
import { NumberInput } from '../NumberInput';
import { Select } from '../ui/Select';
import { itemConditionOptions, normalizeItemCondition } from '../../domain/itemCondition';
import { itemLocationDraft } from '../../domain/itemLocation';
import { BulkEditRequests, sharedLocation, sharedValue, validateBulkChanges, type BulkField, type BulkItemChanges } from '../../domain/bulkEdit';
import { errorMessage } from '../../shared/errors';

export interface BulkEditProps {
  items: Elemento[];
  categories: { id: string; label: string }[];
  warehouses: Almacen[]; racks: Estanteria[]; levels: NivelEstanteria[]; boxes: Caja[];
  onCreateRack?: (input: Omit<Estanteria, 'id'>) => Promise<Estanteria>;
  onCreateLevel?: (input: Omit<NivelEstanteria, 'id'>) => Promise<NivelEstanteria>;
  onCreateBox?: (input: Omit<Caja, 'id'>) => Promise<Caja>;
  save: (ids: string[], changes: BulkItemChanges, requestId: string) => Promise<Elemento[]>;
  onClose: () => void;
  onSaved: (count: number) => void;
}

const FIELD_LABELS: Record<BulkField, string> = { categoria: 'Categoría', estado: 'Estado', marca: 'Marca', stockMinimo: 'Stock mínimo', ubicacion: 'Ubicación' };
const VISIBLE_PRODUCTS = 200;

export function BulkEditDialog(props: BulkEditProps) {
  const { items, categories, save, onClose, onSaved } = props;
  const id = useId();
  const requests = useRef(new BulkEditRequests());
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationDraft, setLocationDraft] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState<Record<BulkField, boolean>>({ categoria: false, estado: false, marca: false, stockMinimo: false, ubicacion: false });
  // Shared values start filled in; differing values start empty and are announced.
  const [shared] = useState(() => ({
    categoria: sharedValue(items, item => item.categoria), estado: sharedValue(items, item => normalizeItemCondition(item.estado)),
    marca: sharedValue(items, item => (item.marca || '').trim()), stockMinimo: sharedValue(items, item => item.stockMinimo), ubicacion: sharedLocation(items),
  }));
  const [category, setCategory] = useState(shared.categoria ?? '');
  const [condition, setCondition] = useState(shared.estado ?? '');
  const [brand, setBrand] = useState(shared.marca ?? '');
  const [minimum, setMinimum] = useState(shared.stockMinimo ?? 0);
  const [location, setLocation] = useState(() => shared.ubicacion ?? itemLocationDraft(null));
  const busy = pending || locationBusy;
  const ids = items.map(item => item.id);
  const chosen = (Object.keys(enabled) as BulkField[]).filter(field => enabled[field]);
  const changes: BulkItemChanges = {
    ...(enabled.categoria && { categoria: category }), ...(enabled.estado && { estado: condition }),
    ...(enabled.marca && { marca: brand }), ...(enabled.stockMinimo && { stockMinimo: minimum }), ...(enabled.ubicacion && { ubicacion: location }),
  };
  const toggle = (field: BulkField, value: boolean) => { setError(''); setEnabled(previous => ({ ...previous, [field]: value })); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current || locationBusy) return;
    if (enabled.ubicacion && locationDraft) { setError('Cree o seleccione la ubicación antes de guardar los productos.'); return; }
    try { validateBulkChanges(ids, changes); } catch (cause) { setError(errorMessage(cause)); return; }
    saving.current = true; setPending(true); setError('');
    try {
      const saved = await save(ids, changes, requests.current.requestFor(ids, changes));
      requests.current.confirm();
      onSaved(saved.length);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };

  const section = (field: BulkField, children: ReactNode, mixed = shared[field] === undefined) => <fieldset data-bulk-field={field}
    className="min-w-0 rounded-xl bg-[#f8fafc] p-4 space-y-2">
    <legend className="sr-only">{FIELD_LABELS[field]}</legend>
    <label className="flex items-center gap-3 min-h-11 text-sm font-semibold">
      <input type="checkbox" className="w-5 h-5 shrink-0" checked={enabled[field]} disabled={busy} onChange={event => toggle(field, event.target.checked)} />
      Cambiar {FIELD_LABELS[field].toLocaleLowerCase('es')}
    </label>
    {mixed && <p className="text-xs text-slate-500">Los productos seleccionados tienen valores distintos.</p>}
    {children}
  </fieldset>;

  return <ItemEditDialog code={`${items.length.toLocaleString('es-CO')} producto${items.length === 1 ? '' : 's'}`} busy={busy} onClose={onClose}>
    <form autoComplete="off" onSubmit={submit} className="space-y-4" aria-describedby={`${id}-help`}>
      <p id={`${id}-help`} className="text-sm text-[#454651]">Marque solo los datos que quiere cambiar. Los demás datos de cada producto se conservan, igual que sus cantidades, unidades, precios, pesos, fotos y códigos.</p>
      <details className="rounded-xl bg-[#f8fafc] p-3 text-sm">
        <summary className="min-h-11 flex items-center cursor-pointer font-semibold">Ver productos seleccionados ({items.length.toLocaleString('es-CO')})</summary>
        <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 text-xs">
          {items.slice(0, VISIBLE_PRODUCTS).map(item => <li key={item.id} className="break-words"><span className="font-mono-code">{item.codigo}</span> · {item.nombre}</li>)}
          {items.length > VISIBLE_PRODUCTS && <li className="text-slate-500">y {(items.length - VISIBLE_PRODUCTS).toLocaleString('es-CO')} más</li>}
        </ul>
      </details>
      {error && <p role="alert" className="text-red-700 text-sm break-words">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section('categoria', <label className="block text-sm font-semibold">Categoría
          <Select value={category} disabled={!enabled.categoria || busy} onChange={event => setCategory(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg">
            <option value="">Seleccione una categoría</option>
            {categories.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </Select></label>)}
        {section('estado', <label className="block text-sm font-semibold">Estado
          <Select value={condition} disabled={!enabled.estado || busy} onChange={event => setCondition(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg">
            <option value="">Seleccione un estado</option>
            {itemConditionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select></label>)}
        {section('marca', <label className="block text-sm font-semibold">Marca
          <input autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={100} value={brand} disabled={!enabled.marca || busy}
            onChange={event => setBrand(event.target.value)} className="block w-full mt-1 p-2.5 border rounded-lg" />
          <span className="block mt-1 text-xs font-normal text-slate-500">Déjela vacía para quitar la marca.</span></label>)}
        {section('stockMinimo', <label className="block text-sm font-semibold">Stock mínimo
          <NumberInput min="0" step="0.001" value={minimum} disabled={!enabled.stockMinimo || busy} onValueChange={setMinimum} className="block w-full mt-1 p-2.5 border rounded-lg" />
          <span className="block mt-1 text-xs font-normal text-slate-500">Se aplica en la unidad de medida de cada producto.</span></label>)}
      </div>
      {section('ubicacion', <ItemExistingLocationFields value={location} onChange={setLocation} warehouses={props.warehouses} racks={props.racks} levels={props.levels} boxes={props.boxes}
        disabled={!enabled.ubicacion || pending} onCreateRack={props.onCreateRack} onCreateLevel={props.onCreateLevel} onCreateBox={props.onCreateBox}
        onBusyChange={setLocationBusy} onDraftChange={setLocationDraft} />)}
      <p role="status" className="text-sm text-[#454651]">{chosen.length
        ? `Se cambiará ${chosen.map(field => FIELD_LABELS[field].toLocaleLowerCase('es')).join(', ')} en ${items.length.toLocaleString('es-CO')} producto${items.length === 1 ? '' : 's'}.`
        : 'Aún no ha marcado datos para cambiar.'}</p>
      <div className="grid grid-cols-2 gap-4 pt-2">
        <button type="button" data-action="cancel" onClick={onClose} disabled={busy} className="px-4 py-2 min-h-11 border rounded-lg text-sm">Cancelar</button>
        <button type="submit" data-action="edit" disabled={busy || !chosen.length} className="px-4 py-2 min-h-11 rounded-lg text-sm font-semibold">{pending ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  </ItemEditDialog>;
}

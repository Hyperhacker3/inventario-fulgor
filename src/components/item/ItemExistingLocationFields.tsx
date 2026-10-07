import { useEffect, useId, useState } from 'react';
import { Select } from '../ui/Select';
import type { Almacen, Estanteria, NivelEstanteria, Caja } from '../../types';
import type { ItemLocationDraft } from '../../domain/itemLocation';
import { ItemRackSelector } from './ItemRackSelector';
import { ItemLevelSelector } from './ItemLevelSelector';
import { ItemBoxSelector } from './ItemBoxSelector';

interface Props {
  value: ItemLocationDraft; onChange: (value: ItemLocationDraft) => void;
  warehouses: Almacen[]; racks: Estanteria[]; levels: NivelEstanteria[]; boxes: Caja[]; disabled?: boolean;
  onCreateRack?: (input: Omit<Estanteria, 'id'>) => Promise<Estanteria>;
  onCreateLevel?: (input: Omit<NivelEstanteria, 'id'>) => Promise<NivelEstanteria>;
  onCreateBox?: (input: Omit<Caja, 'id'>) => Promise<Caja>;
  onBusyChange?: (busy: boolean) => void; onDraftChange?: (unfinished: boolean) => void;
}
export function ItemExistingLocationFields(props: Props) {
  const { value, onChange, warehouses, racks, levels, boxes, disabled = false } = props;
  const id = useId();
  if (props.onCreateRack && props.onCreateLevel && props.onCreateBox) return <InlineLocationFields {...props}
    onCreateRack={props.onCreateRack} onCreateLevel={props.onCreateLevel} onCreateBox={props.onCreateBox} />;
  const availableRacks = racks.filter(rack => value.warehouseId && rack.almacenId === value.warehouseId);
  const availableLevels = levels.filter(level => value.rackId && level.estanteriaId === value.rackId);
  const availableBoxes = boxes.filter(box => value.rackId && box.estanteriaId === value.rackId && (box.nivelId || '') === value.levelId);
  return <fieldset disabled={disabled} className="min-w-0 border rounded-xl bg-[#f8fafc] p-4">
    <legend className="text-sm font-semibold text-[#253685] px-1">Ubicación del elemento</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="min-w-0"><label htmlFor={`${id}-warehouse`} className="block text-sm font-semibold">Almacén</label>
        <Select id={`${id}-warehouse`} value={value.warehouseId} disabled={disabled} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ warehouseId: event.target.value, rackId: '', levelId: '', boxId: '' })}>
          <option value="">Sin almacén asignado</option>
          {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre} ({warehouse.codigo})</option>)}
        </Select>
      </div>
      <div className="min-w-0"><label htmlFor={`${id}-rack`} className="block text-sm font-semibold">Estantería</label>
        <Select id={`${id}-rack`} value={value.rackId} disabled={disabled || !value.warehouseId} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ ...value, rackId: event.target.value, levelId: '', boxId: '' })}>
          <option value="">Sin estantería asignada</option>
          {availableRacks.map(rack => <option key={rack.id} value={rack.id}>{rack.codigo} - {rack.nombre}</option>)}
        </Select>
      </div>
      <div className="min-w-0"><label htmlFor={`${id}-level`} className="block text-sm font-semibold">Nivel de estantería</label>
        <Select id={`${id}-level`} value={value.levelId} disabled={disabled || !value.rackId} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ ...value, levelId: event.target.value, boxId: '' })}>
          <option value="">Sin nivel asignado</option>
          {availableLevels.map(level => <option key={level.id} value={level.id}>{level.codigo} - {level.nombre}</option>)}
        </Select>
      </div>
      <div className="min-w-0"><label htmlFor={`${id}-box`} className="block text-sm font-semibold">Caja</label>
        <Select id={`${id}-box`} value={value.boxId} disabled={disabled || !value.rackId} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ ...value, boxId: event.target.value })}>
          <option value="">Sin caja asignada</option>
          {availableBoxes.map(box => <option key={box.id} value={box.id}>{box.codigoCaja}</option>)}
        </Select>
      </div>
    </div>
    <p className="mt-3 text-xs text-slate-500">Seleccione ubicaciones existentes. La estantería, el nivel y la caja son opcionales. Las cajas anteriores sin nivel siguen visibles hasta que les asigne uno.</p>
  </fieldset>;
}

function InlineLocationFields({ value, onChange, warehouses, racks, levels, boxes, disabled,
  onCreateRack, onCreateLevel, onCreateBox, onBusyChange, onDraftChange }: Props & Required<Pick<Props, 'onCreateRack' | 'onCreateLevel' | 'onCreateBox'>>) {
  const id = useId();
  const [rackBusy, setRackBusy] = useState(false), [levelBusy, setLevelBusy] = useState(false), [boxBusy, setBoxBusy] = useState(false);
  const [rackDraft, setRackDraft] = useState(false), [levelDraft, setLevelDraft] = useState(false), [boxDraft, setBoxDraft] = useState(false);
  const [createdRacks, setCreatedRacks] = useState<Estanteria[]>([]);
  const [createdLevels, setCreatedLevels] = useState<NivelEstanteria[]>([]);
  const [createdBoxes, setCreatedBoxes] = useState<Caja[]>([]);
  const busy = rackBusy || levelBusy || boxBusy;
  const draft = rackDraft || levelDraft || boxDraft;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { onDraftChange?.(draft); }, [draft, onDraftChange]);
  useEffect(() => () => { onBusyChange?.(false); onDraftChange?.(false); }, [onBusyChange, onDraftChange]);
  const rackId = rackDraft ? '' : value.rackId, levelId = rackDraft || levelDraft ? '' : value.levelId;
  const merged = <T extends { id: string }>(saved: T[], created: T[]) => [...saved, ...created.filter(row => !saved.some(existing => existing.id === row.id))];
  return <fieldset disabled={disabled || busy} className="min-w-0 border rounded-xl bg-[#f8fafc] p-4">
    <legend className="text-sm font-semibold text-[#253685] px-1">Ubicación del elemento</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="min-w-0"><label htmlFor={`${id}-warehouse`} className="block text-sm font-semibold">Almacén</label>
        <Select id={`${id}-warehouse`} value={value.warehouseId} className="block w-full mt-1 p-2.5 border rounded-lg"
          onChange={event => onChange({ warehouseId: event.target.value, rackId: '', levelId: '', boxId: '' })}>
          <option value="">Sin almacén asignado</option>
          {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre} ({warehouse.codigo})</option>)}
        </Select>
      </div>
      <ItemRackSelector key={`rack:${value.warehouseId}`} idPrefix={`${id}-`} warehouseId={value.warehouseId} rackId={value.rackId}
        racks={merged(racks, createdRacks).filter(rack => rack.almacenId === value.warehouseId)}
        onRack={next => onChange({ ...value, rackId: next, levelId: '', boxId: '' })}
        onCreate={async input => { const saved = await onCreateRack(input); setCreatedRacks(previous => [...previous, saved]); return saved; }}
        onBusyChange={setRackBusy} onDraftChange={setRackDraft} />
      <ItemLevelSelector key={`level:${rackId}`} idPrefix={`${id}-`} label="Nivel de estantería" rackId={rackId} levelId={levelId}
        levels={merged(levels, createdLevels).filter(level => level.estanteriaId === rackId)}
        onLevel={next => onChange({ ...value, levelId: next, boxId: '' })}
        onCreate={async input => { const saved = await onCreateLevel(input); setCreatedLevels(previous => [...previous, saved]); return saved; }}
        onBusyChange={setLevelBusy} onDraftChange={setLevelDraft} />
      <ItemBoxSelector key={`box:${rackId}:${levelId}`} idPrefix={`${id}-`} rackId={rackId} levelId={levelId} allowWithoutLevel
        boxId={rackDraft || levelDraft ? '' : value.boxId}
        boxes={merged(boxes, createdBoxes).filter(box => box.estanteriaId === rackId && (box.nivelId || '') === levelId)}
        onBox={next => onChange({ ...value, boxId: next })}
        onCreate={async input => { const saved = await onCreateBox(input); setCreatedBoxes(previous => [...previous, saved]); return saved; }}
        onBusyChange={setBoxBusy} onDraftChange={setBoxDraft} />
    </div>
    <p className="mt-3 text-xs text-slate-500">Elija una ubicación o cree estantería, nivel y caja aquí. Las cajas nuevas requieren un nivel; las cajas anteriores sin nivel siguen disponibles. Crear una ubicación la guarda en el catálogo; Guardar confirma la ubicación del producto.</p>
  </fieldset>;
}

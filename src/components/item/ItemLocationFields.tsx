import { Select } from '../ui/Select';
import { useInventory } from '../../context/InventoryContext';
import { ItemBoxSelector } from './ItemBoxSelector';
import { ItemRackSelector } from './ItemRackSelector';
import { ItemLevelSelector } from './ItemLevelSelector';

interface Props {
  warehouseId: string; rackId: string; levelId: string; boxId: string;
  onWarehouse: (id: string) => void; onRack: (id: string) => void; onLevel: (id: string) => void; onBox: (id: string) => void;
  onBoxBusyChange?: (busy: boolean) => void; onBoxDraftChange?: (unfinished: boolean) => void;
  rackDraftPending?: boolean; levelDraftPending?: boolean;
  onRackBusyChange?: (busy: boolean) => void; onRackDraftChange?: (unfinished: boolean) => void;
  onLevelBusyChange?: (busy: boolean) => void; onLevelDraftChange?: (unfinished: boolean) => void;
}
export function ItemLocationFields({ warehouseId, rackId, levelId, boxId, onWarehouse, onRack, onLevel, onBox, onBoxBusyChange, onBoxDraftChange,
  rackDraftPending = false, levelDraftPending = false, onRackBusyChange, onRackDraftChange, onLevelBusyChange, onLevelDraftChange }: Props) {
  const { almacenes, estanterias, niveles, cajas, addCaja, addEstanteria, addNivel } = useInventory();
  const racks = estanterias.filter(rack => rack.almacenId === warehouseId);
  const levels = niveles.filter(level => level.estanteriaId === rackId);
  const boxes = cajas.filter(box => box.estanteriaId === rackId && box.nivelId === levelId);
  const readyRack = rackDraftPending ? '' : rackId;
  const readyLevel = rackDraftPending || levelDraftPending ? '' : levelId;
  return <section className="p-4 bg-[#f8fafc] border rounded-xl">
    <h3 className="text-xs font-bold text-[#253685] uppercase mb-3">Ubicación en almacén</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="text-xs font-semibold text-[#454651]">Almacén
        <Select id="select-almacen-form" value={warehouseId} onChange={event => { onWarehouse(event.target.value); onRack(''); onLevel(''); onBox(''); }}
          className="block w-full mt-1.5 px-3 py-2 rounded-lg border bg-white">
          {almacenes.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre} ({warehouse.codigo})</option>)}
        </Select>
      </label>
      <ItemRackSelector key={warehouseId} warehouseId={warehouseId} rackId={rackId} racks={racks}
        onRack={id => { onRack(id); onLevel(''); onBox(''); }} onCreate={addEstanteria} onBusyChange={onRackBusyChange} onDraftChange={onRackDraftChange} />
      <ItemLevelSelector key={readyRack} rackId={readyRack} levelId={readyLevel} levels={levels}
        onLevel={id => { onLevel(id); onBox(''); }} onCreate={addNivel} onBusyChange={onLevelBusyChange} onDraftChange={onLevelDraftChange} />
      <ItemBoxSelector key={readyLevel} rackId={readyRack} levelId={readyLevel} boxId={readyLevel ? boxId : ''} boxes={readyLevel ? boxes : []}
        onBox={onBox} onCreate={addCaja} onBusyChange={onBoxBusyChange} onDraftChange={onBoxDraftChange} />
    </div>
  </section>;
}

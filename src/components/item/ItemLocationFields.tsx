import { useInventory } from '../../context/InventoryContext';
import { ItemBoxSelector } from './ItemBoxSelector';

interface Props {
  warehouseId: string; rackId: string; boxId: string;
  onWarehouse: (id: string) => void; onRack: (id: string) => void; onBox: (id: string) => void;
  onBoxBusyChange?: (busy: boolean) => void;
  onBoxDraftChange?: (unfinished: boolean) => void;
}
export function ItemLocationFields({ warehouseId, rackId, boxId, onWarehouse, onRack, onBox, onBoxBusyChange, onBoxDraftChange }: Props) {
  const { almacenes, estanterias, cajas, addCaja } = useInventory();
  const racks = estanterias.filter(rack => rack.almacenId === warehouseId);
  const boxes = cajas.filter(box => box.estanteriaId === rackId);
  return <section className="p-4 bg-[#f8fafc] border rounded-xl">
    <h3 className="text-xs font-bold text-[#253685] uppercase mb-3">Ubicación en almacén</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label className="text-xs font-semibold text-[#454651]">Almacén
        <select id="select-almacen-form" value={warehouseId} onChange={event => { onWarehouse(event.target.value); onRack(''); onBox(''); }}
          className="block w-full mt-1.5 px-3 py-2 rounded-lg border bg-white">
          {almacenes.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre} ({warehouse.codigo})</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-[#454651]">Estantería
        <select id="select-estanteria-form" value={rackId} onChange={event => { onRack(event.target.value); onBox(''); }}
          disabled={!warehouseId} className="block w-full mt-1.5 px-3 py-2 rounded-lg border bg-white">
          <option value="">Sin estantería</option>
          {racks.map(rack => <option key={rack.id} value={rack.id}>{rack.codigo} - {rack.nombre}</option>)}
        </select>
      </label>
      <ItemBoxSelector key={rackId} rackId={rackId} boxId={boxId} boxes={boxes} onBox={onBox} onCreate={addCaja} onBusyChange={onBoxBusyChange} onDraftChange={onBoxDraftChange} />
    </div>
  </section>;
}

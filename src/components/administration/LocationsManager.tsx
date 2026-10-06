import { Presence } from '../ui/Motion';
import { Select } from '../ui/Select';
import { useMemo, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { WarehouseFormModal, type WarehouseFormTarget } from '../warehouses/WarehouseFormModal';
import { inventoryLocationValues } from '../../domain/money';
import { LocationValueSummary, locationValueHint } from '../warehouses/LocationValueSummary';

type Props = { kind: 'estanteria' | 'caja' } & Pick<ReturnType<typeof useInventory>,
  'almacenes' | 'estanterias' | 'cajas' | 'elementos' | 'user' | 'getAlmacenById' | 'getEstanteriaById'>;

export function LocationsManager({ kind }: Pick<Props, 'kind'>) {
  const { almacenes, estanterias, cajas, elementos, user, getAlmacenById, getEstanteriaById } = useInventory();
  return <LocationsManagerContent {...{ kind, almacenes, estanterias, cajas, elementos, user, getAlmacenById, getEstanteriaById }} />;
}
export function LocationsManagerContent({ kind, almacenes, estanterias, cajas, elementos, user, getAlmacenById, getEstanteriaById }: Props) {
  const values = useMemo(() => inventoryLocationValues(elementos), [elementos]);
  const [parentId, setParentId] = useState('');
  const [target, setTarget] = useState<WarehouseFormTarget | null>(null);
  const admin = user.role === 'admin';
  const rack = kind === 'estanteria';
  const parents = rack ? almacenes.map(row => ({ id: row.id, label: row.nombre }))
    : estanterias.map(row => ({ id: row.id, label: `${getAlmacenById(row.almacenId)?.nombre || 'Sin almacén'} / ${row.codigo} · ${row.nombre}` }));
  const entries = rack ? estanterias.map(row => ({ id: row.id, code: row.codigo, name: row.nombre, parent: row.almacenId,
    location: getAlmacenById(row.almacenId)?.nombre || 'Sin almacén', description: row.descripcion }))
    : cajas.map(row => ({ id: row.id, code: row.codigoCaja, name: row.estado, parent: row.estanteriaId,
      location: getEstanteriaById(row.estanteriaId)?.nombre || 'Sin estantería', description: row.descripcion }));
  return <section className="space-y-5">
    <p className="text-sm text-slate-600">{rack ? 'Las estanterías pertenecen a un almacén.' : 'Las cajas pertenecen a una estantería.'} Después puede asignar estas ubicaciones a los productos.</p>
    <p className="text-xs text-slate-500">{locationValueHint}</p>
    <div className="flex flex-wrap items-end gap-4">
      <label className="text-sm w-full sm:w-auto sm:min-w-60">{rack ? 'Almacén' : 'Estantería'}<Select value={parentId} onChange={event => setParentId(event.target.value)} className="block bg-white border rounded-lg p-3 mt-1 w-full">
        <option value="">Todos</option>{parents.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </Select></label>
      {admin && <button disabled={!parentId} onClick={() => setTarget({ kind, mode: 'new', parentId })} className="bg-[#253685] text-white rounded-lg px-4 py-3 disabled:opacity-50">Crear {kind}</button>}
    </div>
    {admin && !parentId && <p className="text-sm text-slate-500">Seleccione {rack ? 'un almacén' : 'una estantería'} para crear {rack ? 'una estantería' : 'una caja'}.</p>}
    {!parents.length && <p>Primero cree {rack ? 'un almacén en la pantalla Almacenes' : 'una estantería en esta administración'}.</p>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{entries.filter(row => !parentId || row.parent === parentId).map(row => <article key={row.id} className="min-w-0 break-words bg-white border rounded-2xl p-5 space-y-2">
      <strong>{row.code}</strong><p>{row.name}</p><p className="text-sm text-slate-600">{row.location}</p><p className="text-sm">{row.description}</p>
      <LocationValueSummary values={(rack ? values.racks : values.boxes).get(row.id)} />
      {admin && <button className="text-[#253685] underline text-sm" onClick={() => setTarget({ kind, mode: 'edit', id: row.id })}>Editar</button>}
    </article>)}</div>
    <Presence open={!!target}>{target && <WarehouseFormModal target={target} onClose={() => setTarget(null)} onCreatedWarehouse={() => {}} />}</Presence>
  </section>;
}

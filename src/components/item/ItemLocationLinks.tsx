import { Fragment } from 'react';
import { locationBreadcrumbs } from '../../domain/locationNavigation';
import type { InventoryFilters } from '../../domain/explorer';
import type { Almacen, Caja, Elemento, Estanteria, NivelEstanteria } from '../../types';

interface Props {
  item: Elemento; warehouses: Almacen[]; racks: Estanteria[]; levels: NivelEstanteria[]; boxes: Caja[];
  disabled?: boolean; onNavigate: (filters: InventoryFilters) => void;
}

export function ItemLocationLinks({ item, warehouses, racks, levels, boxes, disabled, onNavigate }: Props) {
  const breadcrumbs = locationBreadcrumbs(item, warehouses, racks, levels, boxes);
  if (!breadcrumbs.length) return <>Sin ubicación asignada</>;
  return <span>{breadcrumbs.map((crumb, index) => <Fragment key={crumb.kind}>
    {index > 0 && <span aria-hidden="true"> {'>'} </span>}
    <button type="button" className="item-location-link px-1" disabled={disabled}
      aria-label={`Ver inventario en ${crumb.label}`} title={`Ver inventario: ${breadcrumbs.slice(0, index + 1).map(row => row.label).join(' > ')}`}
      onClick={() => { if (!window.getSelection()?.toString().trim()) onNavigate(crumb.filters); }}>{crumb.label}</button>
  </Fragment>)}</span>;
}

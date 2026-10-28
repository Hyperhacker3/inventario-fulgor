import { readAlmacenes, readCajas, readElementosByIds, readEstanterias, readNiveles, rpc } from './repository';
import type { CompanySettings, Elemento } from '../types';
import { mapCompany } from '../domain/company';

/** Bound each request to avoid URL and server row limits on large selections. */
export async function readReportItems(ids: readonly string[], read = readElementosByIds): Promise<Elemento[]> {
  const unique = [...new Set(ids)], items: Elemento[] = [];
  for (let offset = 0; offset < unique.length; offset += 100) items.push(...await read(unique.slice(offset, offset + 100)));
  return items;
}

export async function readInventoryReportSource(ids: readonly string[]) {
  const [items, warehouses, racks, levels, boxes, company] = await Promise.all([
    readReportItems(ids), readAlmacenes(), readEstanterias(), readNiveles(), readCajas(), rpc<CompanySettings>('inventory_company_profile', {}),
  ]);
  return { items, locations: { warehouses, racks, levels, boxes }, company: mapCompany(company.perfil) };
}

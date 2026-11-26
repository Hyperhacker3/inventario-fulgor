import type { Categoria, Elemento } from '../types';
import { orderInventoryByActivity } from './explorer';
import { normalizeItemCondition } from './itemCondition';
import { roundQuantity } from './quantity';
import { toolTypeFor, type ToolType } from './toolLifeRecord';

export type ToolScope = 'ALL' | ToolType;

export interface ToolBucketSummary {
  references: number;
  units: number;
  operationalRefs: number;
  operationalUnits: number;
  forRepairRefs: number;
  forRepairUnits: number;
  inRepairRefs: number;
  inRepairUnits: number;
  badRefs: number;
  badUnits: number;
  operationalPercent: number;
}

export interface RecentRepairTool {
  item: Elemento;
  type: ToolType;
}

export interface ToolsDashboardSummary {
  all: ToolBucketSummary;
  electric: ToolBucketSummary;
  combustion: ToolBucketSummary;
  selected: ToolBucketSummary;
  categoryIds: { all: string[]; electric: string[]; combustion: string[]; selected: string[] };
  recentForRepair: RecentRepairTool[];
}

function summarizeBucket(entries: { item: Elemento; type: ToolType }[]): ToolBucketSummary {
  let units = 0, operationalRefs = 0, operationalUnits = 0, forRepairRefs = 0, forRepairUnits = 0;
  let inRepairRefs = 0, inRepairUnits = 0, badRefs = 0, badUnits = 0;
  for (const { item } of entries) {
    const qty = item.stockPendiente ? 0 : Math.max(0, item.cantidad);
    units += qty;
    const condition = normalizeItemCondition(item.estado);
    if (condition === 'PARA REPARAR') { forRepairRefs++; forRepairUnits += qty; }
    else if (condition === 'EN REPARACIÓN') { inRepairRefs++; inRepairUnits += qty; }
    else if (condition === 'MALO') { badRefs++; badUnits += qty; }
    else { operationalRefs++; operationalUnits += qty; }
  }
  const roundedUnits = roundQuantity(units);
  const roundedOperational = roundQuantity(operationalUnits);
  return {
    references: entries.length,
    units: roundedUnits,
    operationalRefs,
    operationalUnits: roundedOperational,
    forRepairRefs,
    forRepairUnits: roundQuantity(forRepairUnits),
    inRepairRefs,
    inRepairUnits: roundQuantity(inRepairUnits),
    badRefs,
    badUnits: roundQuantity(badUnits),
    operationalPercent: roundedUnits > 0 ? Math.round((roundedOperational / roundedUnits) * 100) : 0,
  };
}

/** Summarizes active electric and combustion tools and lists the latest 3 flagged PARA REPARAR. */
export function summarizeTools(
  items: Elemento[],
  categories: readonly Categoria[],
  scope: ToolScope = 'ALL',
  recentLimit = 3,
): ToolsDashboardSummary {
  const entries: { item: Elemento; type: ToolType }[] = [];
  for (const item of items) {
    if (item.archived) continue;
    const type = toolTypeFor(item, categories);
    if (type) entries.push({ item, type });
  }
  const electricEntries = entries.filter(entry => entry.type === 'ELECTRICA');
  const combustionEntries = entries.filter(entry => entry.type === 'COMBUSTION');
  const selectedEntries = scope === 'ALL' ? entries : scope === 'ELECTRICA' ? electricEntries : combustionEntries;

  const electricIds = categories.filter(c => c.hoja_vida_tipo === 'ELECTRICA').map(c => c.id);
  const combustionIds = categories.filter(c => c.hoja_vida_tipo === 'COMBUSTION').map(c => c.id);
  const allIds = [...electricIds, ...combustionIds];
  const selectedIds = scope === 'ALL' ? allIds : scope === 'ELECTRICA' ? electricIds : combustionIds;

  const repairItems = selectedEntries
    .filter(entry => normalizeItemCondition(entry.item.estado) === 'PARA REPARAR')
    .map(entry => entry.item);
  const orderedRepair = orderInventoryByActivity(repairItems).slice(0, recentLimit);
  const typeById = new Map(selectedEntries.map(entry => [entry.item.id, entry.type]));

  return {
    all: summarizeBucket(entries),
    electric: summarizeBucket(electricEntries),
    combustion: summarizeBucket(combustionEntries),
    selected: summarizeBucket(selectedEntries),
    categoryIds: { all: allIds, electric: electricIds, combustion: combustionIds, selected: selectedIds },
    recentForRepair: orderedRepair.map(item => ({ item, type: typeById.get(item.id)! })),
  };
}

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isDemo, supabase } from '../lib/supabase';
import { readAlmacenes, readCajas, readElementos, readElementosByIds, readEstanterias, readHistory, readProyectos, readRecentHistory, readRecentRemisiones } from '../data/repository';
import { mapElemento, mapRemision, type DbRow } from '../data/mappers';
import { INITIAL_ALMACENES, INITIAL_CAJAS, INITIAL_ELEMENTOS, INITIAL_ESTANTERIAS, INITIAL_HISTORIAL, INITIAL_PROYECTOS, INITIAL_REMISIONES } from '../data/initialData';
import type { Almacen, Caja, Elemento, Estanteria, HistorialMovimiento, Proyecto, Remision } from '../types';
import { useAuth } from '../context/AuthContext';

export interface DemoData {
  elementos: Elemento[]; almacenes: Almacen[]; estanterias: Estanteria[]; cajas: Caja[];
  proyectos: Proyecto[]; remisiones: Remision[]; historial: HistorialMovimiento[];
}
const defaults = (): DemoData => ({
  elementos: INITIAL_ELEMENTOS, almacenes: INITIAL_ALMACENES, estanterias: INITIAL_ESTANTERIAS,
  cajas: INITIAL_CAJAS, proyectos: INITIAL_PROYECTOS, remisiones: INITIAL_REMISIONES, historial: INITIAL_HISTORIAL,
});
const loaded = (key: string): DemoData => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (value && Array.isArray(value.elementos) && Array.isArray(value.historial)) return value;
  } catch { /* invalid legacy data: keep demo defaults */ }
  return defaults();
};

function useTableQuery<T>(key: string[], fn: () => Promise<T>, enabled: boolean) {
  return useQuery<T>({ queryKey: key, queryFn: fn, enabled, staleTime: 30_000, retry: 1 });
}

export function useInventoryData() {
  const { user } = useAuth();
  const email = user?.email;
  const client = useQueryClient();
  const demoKey = `fulgor_demo_v3_${user?.email || 'anonymous'}`;
  const [demoData, setDemoData] = useState<DemoData>(() => isDemo ? loaded(demoKey) : defaults());
  const [connected, setConnected] = useState(Boolean(supabase));
  useEffect(() => {
    if (!isDemo) return;
    try { localStorage.setItem(demoKey, JSON.stringify(demoData)); }
    catch { console.warn('El almacenamiento local está lleno. Exporte sus datos de demostración.'); }
  }, [demoData, demoKey]);

  const enabled = Boolean(supabase && user);
  const key = (name: string) => ['fulgor', user?.email || '', name];
  // Queries are deliberately separate: a stock change does not reload warehouses or projects.
  const items = useTableQuery(key('elementos'), readElementos, enabled);
  const warehouses = useTableQuery(key('almacenes'), readAlmacenes, enabled);
  const racks = useTableQuery(key('estanterias'), readEstanterias, enabled);
  const boxes = useTableQuery(key('cajas'), readCajas, enabled);
  const projects = useTableQuery(key('proyectos'), readProyectos, enabled);
  const remissions = useTableQuery(key('remisiones'), readRecentRemisiones, enabled);
  const movements = useTableQuery(key('historial'), readRecentHistory, enabled);
  const queries = [items, warehouses, racks, boxes, projects, remissions, movements];
  const syncStatus = !enabled || !connected || queries.some(q => q.isError) ? 'offline'
    : queries.some(q => q.isPending || q.isFetching) ? 'syncing' : 'synced';

  useEffect(() => {
    if (!supabase || !email) return;
    const db = supabase;
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    const channel = db.channel('fulgor_inventory')
      .on('postgres_changes', { event: '*', schema: 'public' }, event => {
        const table = event.table;
        if (!['elementos', 'almacenes', 'estanterias', 'cajas', 'proyectos', 'remisiones', 'historial'].includes(table)) return;
        if (table === 'elementos') {
          void client.invalidateQueries({ queryKey: ['fulgor', email, 'archived-items'] });
          const newRow = event.new as DbRow;
          const oldRow = event.old as DbRow;
          const changedId = String(newRow?.id ?? oldRow?.id ?? '');
          if (changedId && (event.eventType === 'DELETE' || newRow?.codigo)) {
            client.setQueryData<Elemento[]>(['fulgor', email, 'elementos'], previous => {
              if (!previous) return previous;
              const remaining = previous.filter(item => item.id !== changedId);
              if (event.eventType === 'DELETE' || newRow.archived) return remaining;
              const mapped = mapElemento(newRow);
              return previous.some(item => item.id === changedId)
                ? previous.map(item => item.id === changedId ? mapped : item) : [mapped, ...previous];
            });
            return;
          }
        }
        if (table === 'remisiones' && event.eventType === 'INSERT' && (event.new as DbRow)?.numero_remision) {
          const incoming = mapRemision(event.new as DbRow);
          client.setQueryData<Remision[]>(['fulgor', email, 'remisiones'], previous => previous
            ? [incoming, ...previous.filter(row => row.id !== incoming.id)] : previous);
          void client.invalidateQueries({ queryKey: ['fulgor', email, 'remissions-page'] });
          return;
        }
        clearTimeout(pending.get(table));
        pending.set(table, setTimeout(() => {
          void client.invalidateQueries({ queryKey: ['fulgor', email, table] });
          if (table === 'historial') void client.invalidateQueries({ queryKey: ['fulgor', email, 'item-history'] });
          if (table === 'historial') void client.invalidateQueries({ queryKey: ['fulgor', email, 'history-page'] });
          if (table === 'remisiones') void client.invalidateQueries({ queryKey: ['fulgor', email, 'remissions-page'] });
          pending.delete(table);
        }, 250));
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));
    return () => { pending.forEach(timer => clearTimeout(timer)); void db.removeChannel(channel); };
  }, [client, email]);

  const data = useMemo<DemoData>(() => isDemo ? demoData : {
    elementos: items.data || [], almacenes: warehouses.data || [], estanterias: racks.data || [], cajas: boxes.data || [],
    proyectos: projects.data || [], remisiones: remissions.data || [], historial: movements.data || [],
  }, [demoData, items.data, warehouses.data, racks.data, boxes.data, projects.data, remissions.data, movements.data]);

  const refresh = async (...tables: string[]) => {
    if (isDemo) return;
    await Promise.all(tables.map(table => client.invalidateQueries({ queryKey: ['fulgor', user?.email, table] })));
    if (tables.includes('historial')) await Promise.all([
      client.invalidateQueries({ queryKey: ['fulgor', user?.email, 'item-history'] }),
      client.invalidateQueries({ queryKey: ['fulgor', user?.email, 'history-page'] }),
    ]);
    if (tables.includes('remisiones')) await client.invalidateQueries({ queryKey: ['fulgor', user?.email, 'remissions-page'] });
  };
  const refreshItemIds = async (ids: string[]) => {
    if (isDemo || !ids.length) return;
    const uniqueIds = [...new Set(ids)];
    let changed: Elemento[];
    try { changed = await readElementosByIds(uniqueIds); }
    catch (error) {
      void client.invalidateQueries({ queryKey: key('elementos') }).catch(() => {});
      throw error;
    }
    client.setQueryData<Elemento[]>(key('elementos'), previous => {
      if (!previous) return previous;
      const byChangedId = new Map(changed.map(item => [item.id, item]));
      const affected = new Set(uniqueIds);
      const result = previous.flatMap(item => affected.has(item.id)
        ? (byChangedId.has(item.id) ? [byChangedId.get(item.id)!] : []) : [item]);
      const known = new Set(previous.map(item => item.id));
      return [...changed.filter(item => !known.has(item.id)), ...result];
    });
  };
  const applyItemChange = (id: string, item: Elemento | null) => {
    if (isDemo) return;
    client.setQueryData<Elemento[]>(key('elementos'), previous => {
      if (!previous) return item ? [item] : [];
      if (!item) return previous.filter(existing => existing.id !== id);
      return previous.some(existing => existing.id === id)
        ? previous.map(existing => existing.id === id ? item : existing) : [item, ...previous];
    });
  };
  const rememberRemission = (remission: Remision) => {
    if (isDemo) return;
    client.setQueryData<Remision[]>(key('remisiones'), previous => previous
      ? [remission, ...previous.filter(row => row.id !== remission.id)] : previous);
    void client.invalidateQueries({ queryKey: ['fulgor', email, 'remissions-page'] });
  };
  const historyPage = (page: number, pageSize: number, type?: string, search?: string) =>
    readHistory(page, pageSize, { type, search });
  return { ...data, setDemoData, refresh, refreshItemIds, applyItemChange, rememberRemission, historyPage, isCloudConnected: enabled && connected && syncStatus !== 'offline', syncStatus } as const;
}

import type { DatosTransporte, DispatchCartItem, Elemento, Almacen, Estanteria, NivelEstanteria, Caja, HistorialMovimiento, Remision, TipoMovimiento } from '../types';
import type { Dispatch, SetStateAction } from 'react';
import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DemoData } from './useInventoryData';
import { insertRow, updateRow, rpc } from '../data/repository';
import { isDatabaseRejection } from '../data/databaseErrors';
import { mapAlmacen, mapNivel, mapCaja, mapElemento, mapEstanteria, mapRemision, mapHistory } from '../data/mappers';
import { isDemo } from '../lib/supabase';
import { validateItem } from '../domain/inventory';
import { validateDispatch } from '../domain/dispatch';
import { validQuantity } from '../domain/quantity';
import { useAuth } from '../context/AuthContext';
import { displayDate, displayTime } from '../shared/dates';
import { saveImage, removeImage } from '../shared/images';
import { saveGallery } from '../domain/photos';
import { emptyTransport, validateTransport } from '../domain/remissionTransport';
import { lineWeightKg } from '../domain/weight';
import { OutgoingPhotoSubmission } from '../domain/outgoingPhotos';
import { saveOutgoingImage, removeOutgoingImage } from '../shared/outgoingImages';
import { itemLocationColumns } from '../domain/itemLocation';
import { roundCOP } from '../domain/money';
import { displayCargo } from '../domain/userProfile';

type SetDemoData = Dispatch<SetStateAction<DemoData>>;
const newId = (prefix: string) => `${prefix}-DEMO-${crypto.randomUUID()}`;
const isoNow = () => new Date().toISOString();

export function useInventoryActions(data: DemoData, setDemoData: SetDemoData,
  refresh: (...tables: string[]) => Promise<void>, refreshItemIds: (ids: string[]) => Promise<void>,
  applyItemChange: (id: string, item: Elemento | null) => void,
  rememberRemission: (remission: Remision) => void, cart: DispatchCartItem[], clearCart: () => void,
  openRemision: (rem: Remision) => void) {
  const { user } = useAuth();
  const client = useQueryClient();
  const createRequests = useRef(new Map<string, { signature: string; payload: Record<string, unknown> }>());
  const outgoingRequests = useRef(new OutgoingPhotoSubmission<Record<string, unknown>>());
  const requireAdmin = () => {
    if (!isDemo && user?.role !== 'admin') throw new Error('Esta acción requiere rol de administración.');
  };
  const requireOperator = () => {
    if (!isDemo && !['admin', 'operador'].includes(user?.role || '')) throw new Error('Su cuenta no puede modificar existencias.');
  };
  const syncAfterWrite = async (...tasks: Promise<void>[]) => {
    const results = await Promise.allSettled(tasks);
    if (results.some(result => result.status === 'rejected'))
      console.warn('La escritura se guardó, pero la actualización de datos en pantalla quedó pendiente.');
  };

  const addElemento = async (input: Omit<Elemento, 'id' | 'createdAt' | 'updatedAt'>,
    assignment: { prefixId: string; requestId: string }) => {
    requireAdmin();
    const item = { ...input, codigo: input.codigo.trim().toUpperCase() };
    validateItem(item, data.almacenes, data.estanterias, data.cajas, data.niveles);
    const signature = JSON.stringify({ item: { ...item, codigo: '' }, prefix: assignment.prefixId });
    const persist = async (payload: Record<string, unknown>) => {
      createRequests.current.set(assignment.requestId, { signature, payload });
      const created = mapElemento(await rpc<Record<string, unknown>>('create_inventory_item_auto', {
        p_prefix_id: assignment.prefixId, p_request_id: assignment.requestId, p_item: payload,
      }));
      createRequests.current.delete(assignment.requestId);
      applyItemChange(created.id, created);
      await syncAfterWrite(refreshItemIds([created.id]), refresh('historial', 'data-catalog'));
      return created;
    };
    const previous = createRequests.current.get(assignment.requestId);
    if (previous) {
      if (previous.signature !== signature) throw new Error('La solicitud cambió. Vuelva a guardar los nuevos datos.');
      return persist(previous.payload);
    }
    return saveGallery(item, { fotoUrl: '' }, { save: saveImage, remove: removeImage }, async gallery => {
      const photo = gallery.main;
      if (isDemo) {
        const created = { ...item, fotoUrl: photo, fotosAdicionales: gallery.additional, id: newId('ELM'), createdAt: isoNow(), updatedAt: isoNow() };
        setDemoData(prev => ({ ...prev, elementos: [created, ...prev.elementos] }));
        return created;
      }
      return persist({
        nombre: item.nombre, descripcion: item.descripcion, categoria: item.categoria,
        cantidad: item.cantidad, stock_minimo: item.stockMinimo, unidad: item.unidad,
        almacen_id: item.almacenId, estanteria_id: item.estanteriaId, nivel_id: item.nivelId || null, caja_id: item.cajaId,
        foto_url: photo, estado: item.estado || 'BUENO', cantidad_danados: item.cantidadDanados || 0,
        especificaciones: { ...item.especificaciones, marca: (item.marca || '').trim(), peso_unitario: item.pesoUnitario ?? null, valor_unitario_cop: item.valorUnitario ?? 0, fotos_adicionales: gallery.additional },
      });
    });
  };

  const updateElemento = async (id: string, updates: Partial<Elemento>) => {
    requireAdmin();
    const before = data.elementos.find(el => el.id === id);
    if (!before) throw new Error('Componente no encontrado.');
    if (updates.cantidad !== undefined && !isDemo) throw new Error('Use una entrada o ajuste para cambiar existencias.');
    const next = { ...before, ...updates };
    validateItem(next, data.almacenes, data.estanterias, data.cajas, data.niveles);
    return saveGallery(next, before, { save: saveImage, remove: removeImage }, async gallery => {
      const photo = gallery.main;
      if (isDemo) {
        setDemoData(prev => ({ ...prev, elementos: prev.elementos.map(el => el.id === id ? { ...el, ...updates, fotoUrl: photo, fotosAdicionales: gallery.additional, updatedAt: isoNow() } : el) }));
        return;
      }
      const saved = await updateRow('elementos', id, {
        nombre: next.nombre, descripcion: next.descripcion, stock_minimo: next.stockMinimo,
        ...itemLocationColumns(updates),
        foto_url: photo, estado: next.estado, cantidad_danados: next.cantidadDanados ?? 0,
        especificaciones: { ...next.especificaciones, marca: (next.marca || '').trim(), peso_unitario: next.pesoUnitario ?? null, valor_unitario_cop: next.valorUnitario ?? 0, fotos_adicionales: gallery.additional }, updated_at: isoNow(),
      }, mapElemento);
      applyItemChange(id, saved);
      await syncAfterWrite(refreshItemIds([id]), ...(Object.keys(itemLocationColumns(updates)).length
        ? [refresh('historial'), client.invalidateQueries({ queryKey: ['fulgor', user?.email || '', 'item-history', id] })] : []));
    });
  };
  const deleteElemento = async (id: string) => {
    requireAdmin();
    if (isDemo) setDemoData(prev => ({ ...prev, elementos: prev.elementos.filter(el => el.id !== id) }));
    else { await updateRow('elementos', id, { archived: true, updated_at: isoNow() }, mapElemento);
      applyItemChange(id, null); await syncAfterWrite(refreshItemIds([id])); }
  };

  const processDispatch = async (payload: { proyectoId: string; entregadoPor: string; cargoEntregado?: string; recibidoPor: string; cargoRecibido?: string; observaciones?: string; requestId?: string; datosTransporte?: DatosTransporte; fotosSalida?: string[] }): Promise<Remision> => {
    requireOperator();
    const requestId = payload.requestId || crypto.randomUUID();
    const retrying = outgoingRequests.current.has(requestId);
    if (!retrying) validateDispatch(cart, data.elementos);
    const project = data.proyectos.find(p => p.id === payload.proyectoId);
    if (!project || !retrying && project.estado !== 'ACTIVO') throw new Error('Seleccione un proyecto válido.');
    if (!payload.recibidoPor.trim()) throw new Error('Indique quién recibe.');
    if (payload.datosTransporte) validateTransport(payload.datosTransporte, {});
    if (!isDemo) {
      const values = {
        p_request_id: requestId, p_proyecto_id: project.id,
        p_entregado_por: payload.entregadoPor || user?.name, p_cargo_entregado: payload.cargoEntregado || displayCargo(user),
        p_recibido_por: payload.recibidoPor, p_cargo_recibido: payload.cargoRecibido || '',
        p_observaciones: payload.observaciones || '',
        p_items: cart.map(line => ({ elementoId: line.elemento.id, cantidad: line.cantidad })),
        p_datos_transporte: payload.datosTransporte || emptyTransport(),
      };
      const response = await outgoingRequests.current.submit(requestId, values, payload.fotosSalida || [],
        { save: saveOutgoingImage, remove: removeOutgoingImage, definitelyRejected: isDatabaseRejection },
        photos => rpc<Record<string, unknown>>('dispatch_inventory_with_photos', { ...values, p_fotos: photos }));
      const remission = mapRemision(response);
      rememberRemission(remission);
      await syncAfterWrite(refreshItemIds(cart.map(line => line.elemento.id)), refresh('historial', 'project-spending'));
      clearCart(); openRemision(remission);
      return remission;
    }
    const now = isoNow();
    const remissionNumber = `REM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const remission: Remision = {
      id: remissionNumber, numeroRemision: remissionNumber, proyectoId: project.id,
      proyectoNombre: project.nombre, cliente: project.cliente, ubicacion: project.ubicacion,
      entregadoPor: payload.entregadoPor || user?.name || '', cargoEntregado: payload.cargoEntregado || displayCargo(user),
      recibidoPor: payload.recibidoPor, cargoRecibido: payload.cargoRecibido || '', observaciones: payload.observaciones || '',
      fecha: displayDate(now), items: cart.map(line => ({ elementoId: line.elemento.id, codigo: line.elemento.codigo,
        nombre: line.elemento.nombre, marca: line.elemento.marca || '', cantidad: line.cantidad, unidad: line.elemento.unidad,
        pesoUnitario: line.elemento.pesoUnitario,
        valorUnitarioCOP: line.elemento.valorUnitario || 0, valorTotalCOP: roundCOP(line.cantidad * (line.elemento.valorUnitario || 0)),
        ...(line.elemento.pesoUnitario && { pesoTotalKg: lineWeightKg(line.elemento.pesoUnitario, line.cantidad)! }) })),
      datosTransporte: payload.datosTransporte,
      fotosSalida: payload.fotosSalida || [],
    };
    const requested = new Map(cart.map(line => [line.elemento.id, line.cantidad]));
    const history: HistorialMovimiento[] = cart.map(line => {
      const live = data.elementos.find(item => item.id === line.elemento.id)!;
      return { id: newId('MOV'), tipo: 'SALIDA', elementoId: live.id, itemCode: live.codigo, itemName: live.nombre,
        proyectoId: project.id, proyectoNombre: project.nombre, remisionId: remission.id, remisionNumero: remission.numeroRemision,
        cantidad: line.cantidad, unidad: live.unidad, stockAnterior: live.cantidad, stockNuevo: live.cantidad - line.cantidad,
        motivo: `Remisión ${remission.numeroRemision}`, responsable: user?.name || '', fecha: displayDate(now), hora: displayTime(now), docType: 'pdf' };
    });
    setDemoData(prev => {
      const elementos = prev.elementos.map(item => {
        const amount = requested.get(item.id);
        if (!amount) return item;
        return { ...item, cantidad: item.cantidad - amount, updatedAt: now };
      });
      return { ...prev, elementos, remisiones: [remission, ...prev.remisiones], historial: [...history, ...prev.historial] };
    });
    clearCart(); openRemision(remission);
    return remission;
  };

  const addStockMovement = async (input: { elementoId: string; tipo: TipoMovimiento; cantidad: number; motivo: string; responsable: string; proyectoId?: string; requestId?: string }) => {
    requireOperator();
    const item = data.elementos.find(el => el.id === input.elementoId);
    if (!item) throw new Error('Componente no encontrado.');
    if (!validQuantity(input.cantidad) ||
      (input.cantidad === 0 && !item.stockPendiente) ||
      (input.tipo !== 'AJUSTE' && input.cantidad < 0)) throw new Error('Cantidad inválida.');
    if (item.stockPendiente && (!isDemo && user?.role !== 'admin' || input.tipo !== 'AJUSTE' || input.cantidad < 0))
      throw new Error('El stock pendiente requiere un ajuste de administración.');
    const delta = input.tipo === 'ENTRADA' ? input.cantidad : input.tipo === 'SALIDA' ? -input.cantidad : input.cantidad;
    if (item.cantidad + delta < 0) throw new Error('El stock no puede ser negativo.');
    if (!isDemo) {
      const saved = mapHistory(await rpc<Record<string, unknown>>('record_inventory_movement', { p_request_id: input.requestId || crypto.randomUUID(), p_elemento_id: item.id,
        p_tipo: input.tipo, p_cantidad: input.cantidad, p_motivo: input.motivo }));
      await syncAfterWrite(refreshItemIds([item.id]), refresh('historial')); return saved;
    }
    const now = isoNow();
    const movement: HistorialMovimiento = { id: newId('MOV'), tipo: input.tipo, elementoId: item.id,
      itemCode: item.codigo, itemName: item.nombre, cantidad: input.cantidad, unidad: item.unidad,
      stockAnterior: item.cantidad, stockNuevo: item.cantidad + delta, motivo: input.motivo,
      responsable: input.responsable, fecha: displayDate(now), hora: displayTime(now), docType: 'view' };
    setDemoData(prev => {
      const current = prev.elementos.find(el => el.id === input.elementoId);
      if (!current || current.cantidad + delta < 0) return prev;
      return { ...prev, historial: [movement, ...prev.historial], elementos: prev.elementos.map(el => el.id === current.id
        ? { ...el, cantidad: current.cantidad + delta, stockPendiente: false, updatedAt: now } : el) };
    });
    return movement;
  };

  const addAlmacen = async (input: Omit<Almacen, 'id'>) => {
    requireAdmin();
    if (isDemo) { const value = { ...input, id: newId('ALM') }; setDemoData(prev => ({ ...prev, almacenes: [...prev.almacenes, value] })); return value; }
    const value = await insertRow('almacenes', { id: `ALM-${crypto.randomUUID()}`, codigo: input.codigo, nombre: input.nombre,
      direccion: input.ciudad, descripcion: input.descripcion || '', estado: input.estado }, mapAlmacen);
    await refresh('almacenes'); return value;
  };
  const updateAlmacen = async (id: string, updates: Partial<Almacen>) => {
    requireAdmin();
    if (isDemo) { setDemoData(prev => ({ ...prev, almacenes: prev.almacenes.map(a => a.id === id ? { ...a, ...updates } : a) })); return; }
    await updateRow('almacenes', id, { ...(updates.codigo !== undefined && { codigo: updates.codigo }),
      ...(updates.nombre !== undefined && { nombre: updates.nombre }), ...(updates.ciudad !== undefined && { direccion: updates.ciudad }),
      ...(updates.estado !== undefined && { estado: updates.estado }) }, mapAlmacen);
    await refresh('almacenes');
  };
  const addEstanteria = async (input: Omit<Estanteria, 'id'>) => {
    requireAdmin();
    if (isDemo) { const value = { ...input, id: newId('EST') }; setDemoData(prev => ({ ...prev, estanterias: [...prev.estanterias, value] })); return value; }
    const value = await insertRow('estanterias', { id: `EST-${crypto.randomUUID()}`, almacen_id: input.almacenId,
      codigo: input.codigo, nombre: input.nombre, descripcion: input.descripcion || '' }, mapEstanteria);
    client.setQueryData<Estanteria[]>(['fulgor', user?.email || '', 'estanterias'], previous =>
      [value, ...(previous || []).filter(rack => rack.id !== value.id)]);
    await syncAfterWrite(refresh('estanterias')); return value;
  };
  const updateEstanteria = async (id: string, updates: Partial<Estanteria>) => {
    requireAdmin();
    if (isDemo) { setDemoData(prev => ({ ...prev, estanterias: prev.estanterias.map(e => e.id === id ? { ...e, ...updates } : e) })); return; }
    await updateRow('estanterias', id, { ...(updates.codigo !== undefined && { codigo: updates.codigo }),
      ...(updates.nombre !== undefined && { nombre: updates.nombre }), ...(updates.descripcion !== undefined && { descripcion: updates.descripcion }) }, mapEstanteria);
    await refresh('estanterias');
  };
  const addNivel = async (input: Omit<NivelEstanteria, 'id'>) => {
    requireAdmin();
    if (!data.estanterias.some(rack => rack.id === input.estanteriaId)) throw new Error('Seleccione una estantería existente.');
    if (isDemo) { const value = { ...input, id: newId('NIV') }; setDemoData(prev => ({ ...prev, niveles: [...prev.niveles, value] })); return value; }
    const value = await insertRow('niveles_estanteria', { id: `NIV-${crypto.randomUUID()}`, estanteria_id: input.estanteriaId,
      codigo: input.codigo.trim().toUpperCase(), nombre: input.nombre.trim(), descripcion: input.descripcion || '' }, mapNivel);
    client.setQueryData<NivelEstanteria[]>(['fulgor', user?.email || '', 'niveles_estanteria'], previous =>
      [value, ...(previous || []).filter(level => level.id !== value.id)]);
    await syncAfterWrite(refresh('niveles_estanteria')); return value;
  };
  const updateNivel = async (id: string, updates: Partial<NivelEstanteria>) => {
    requireAdmin();
    if (isDemo) { setDemoData(prev => ({ ...prev, niveles: prev.niveles.map(level => level.id === id ? { ...level, ...updates } : level) })); return; }
    await updateRow('niveles_estanteria', id, { ...(updates.codigo !== undefined && { codigo: updates.codigo.trim().toUpperCase() }),
      ...(updates.nombre !== undefined && { nombre: updates.nombre.trim() }), ...(updates.descripcion !== undefined && { descripcion: updates.descripcion }) }, mapNivel);
    await refresh('niveles_estanteria');
  };
  const addCaja = async (input: Omit<Caja, 'id'>) => {
    requireAdmin();
    if (isDemo) { const value = { ...input, id: newId('CAJ') }; setDemoData(prev => ({ ...prev, cajas: [...prev.cajas, value] })); return value; }
    const value = await insertRow('cajas', { id: `CAJ-${crypto.randomUUID()}`, estanteria_id: input.estanteriaId, nivel_id: input.nivelId || null,
      codigo: input.codigoCaja, nombre: input.codigoCaja, estado: input.estado.toUpperCase(), descripcion: input.descripcion || '' }, mapCaja);
    client.setQueryData<Caja[]>(['fulgor', user?.email || '', 'cajas'], previous =>
      [value, ...(previous || []).filter(box => box.id !== value.id)]);
    await syncAfterWrite(refresh('cajas')); return value;
  };
  const updateCaja = async (id: string, updates: Partial<Caja>) => {
    requireAdmin();
    if (isDemo) { setDemoData(prev => ({ ...prev, cajas: prev.cajas.map(c => c.id === id ? { ...c, ...updates } : c),
      elementos: updates.nivelId === undefined ? prev.elementos : prev.elementos.map(item => item.cajaId === id ? { ...item, nivelId: updates.nivelId, updatedAt: isoNow() } : item) })); return; }
    await updateRow('cajas', id, { ...(updates.codigoCaja !== undefined && { codigo: updates.codigoCaja, nombre: updates.codigoCaja }),
      ...(updates.estado !== undefined && { estado: updates.estado.toUpperCase() }),
      ...(updates.nivelId !== undefined && { nivel_id: updates.nivelId }),
      ...(updates.descripcion !== undefined && { descripcion: updates.descripcion }) }, mapCaja);
    await syncAfterWrite(refresh('cajas', 'elementos', 'historial'));
    void client.invalidateQueries({ queryKey: ['fulgor', user?.email || '', 'archived-items'] });
  };
  return { addElemento, updateElemento, deleteElemento, processDispatch, addStockMovement,
    addAlmacen, updateAlmacen, addEstanteria, updateEstanteria, addNivel, updateNivel, addCaja, updateCaja };
}

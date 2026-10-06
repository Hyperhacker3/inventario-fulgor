import { createPortal } from 'react-dom';
import { Presence, useMotionActive } from '../ui/Motion';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { Select } from '../ui/Select';
import { useRef, useState, type FormEvent } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { errorMessage } from '../../shared/errors';

export type WarehouseFormTarget = { kind: 'almacen' | 'estanteria' | 'nivel' | 'caja'; mode: 'new' | 'edit'; id?: string; parentId?: string };
interface Props { target: WarehouseFormTarget; onClose: () => void; onCreatedWarehouse: (id: string) => void }

export function WarehouseFormModal({ target, onClose, onCreatedWarehouse }: Props) {
  const active = useMotionActive();
  const dialog = useRef<HTMLElement>(null);
  const inventory = useInventory();
  const existing = target.kind === 'almacen' ? inventory.almacenes.find(x => x.id === target.id)
    : target.kind === 'estanteria' ? inventory.estanterias.find(x => x.id === target.id) : target.kind === 'nivel' ? inventory.niveles.find(x => x.id === target.id) : inventory.cajas.find(x => x.id === target.id);
  const [levelId, setLevelId] = useState(target.kind === 'caja' ? (existing && 'nivelId' in existing ? existing.nivelId || '' : target.parentId || '') : '');
  const boxRackId = existing && 'estanteriaId' in existing ? existing.estanteriaId : inventory.niveles.find(level => level.id === target.parentId)?.estanteriaId;
  const boxLevels = inventory.niveles.filter(level => level.estanteriaId === boxRackId);
  const saving = useRef(false);
  const [name, setName] = useState(existing && 'nombre' in existing ? existing.nombre : '');
  const [code, setCode] = useState(existing ? 'codigoCaja' in existing ? existing.codigoCaja : existing.codigo : '');
  const [city, setCity] = useState(existing && 'ciudad' in existing ? existing.ciudad : '');
  const [descripcion, setDescription] = useState(existing?.descripcion || '');
  const [state, setState] = useState(existing && 'estado' in existing ? existing.estado : target.kind === 'caja' ? 'Parcial' : 'Operativo');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useDialogFocus(dialog, () => { if (!saving.current) onClose(); });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current || !active) return;
    saving.current = true; setError(''); setPending(true);
    try {
      const codigo = code.trim().toUpperCase();
      if (!codigo) throw new Error('Ingrese un código.');
      if (target.kind === 'almacen') {
        if (target.mode === 'edit' && target.id) await inventory.updateAlmacen(target.id, { codigo, nombre: name.trim(), ciudad: city.trim(), descripcion, estado: state as 'Operativo' | 'Mantenimiento' | 'Inactivo' });
        else { const created = await inventory.addAlmacen({ codigo, nombre: name.trim(), ciudad: city.trim(), descripcion, capacidadPorcentaje: 0, estado: 'Operativo' }); onCreatedWarehouse(created.id); }
      } else if (target.kind === 'estanteria') {
        if (target.mode === 'edit' && target.id) await inventory.updateEstanteria(target.id, { codigo, nombre: name.trim(), descripcion });
        else await inventory.addEstanteria({ almacenId: target.parentId || null, codigo, nombre: name.trim(), descripcion });
      } else if (target.kind === 'nivel') {
        if (target.mode === 'edit' && target.id) await inventory.updateNivel(target.id, { codigo, nombre: name.trim(), descripcion });
        else await inventory.addNivel({ estanteriaId: target.parentId || '', codigo, nombre: name.trim(), descripcion });
      } else {
        if (!levelId && target.mode === 'new') throw new Error('Seleccione un nivel de estantería para crear la caja.');
        if (target.mode === 'edit' && target.id) await inventory.updateCaja(target.id, { codigoCaja: codigo, nivelId: levelId || null, estado: state as 'Completa' | 'Parcial' | 'Vacia', descripcion });
        else await inventory.addCaja({ estanteriaId: inventory.niveles.find(level => level.id === levelId)?.estanteriaId || boxRackId || null, codigoCaja: codigo, nivelId: levelId || null, estado: state as 'Completa' | 'Parcial' | 'Vacia', descripcion });
      }
      onClose();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { saving.current = false; setPending(false); }
  };
  return createPortal(<Presence open={active}><div className="ui-modal-layer fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="presentation">
    <section ref={dialog} role="dialog" aria-modal="true" aria-label="Editar ubicación" className="ui-dialog-panel ui-panel-enter bg-white rounded-2xl border shadow-xl w-full max-w-md p-6">
      <h3 className="font-bold text-lg mb-4">{target.mode === 'new' ? 'Crear' : 'Editar'} {target.kind === 'nivel' ? 'nivel de estantería' : target.kind === 'estanteria' ? 'estantería' : target.kind === 'almacen' ? 'almacén' : 'caja'}</h3>
      <form autoComplete="off" onSubmit={submit} className="space-y-3">
        <fieldset disabled={pending} className="contents">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {target.kind === 'caja' && <label className="text-sm block">Nivel de estantería<Select value={levelId} required={target.mode === 'new' || !!(existing && 'nivelId' in existing && existing.nivelId)} onChange={event => setLevelId(event.target.value)} className="block border rounded-lg p-2 w-full mt-1">
          <option value="">Sin nivel asignado</option>{boxLevels.map(level => <option key={level.id} value={level.id}>{level.codigo} · {level.nombre}</option>)}
        </Select></label>}
        <label className="text-sm block">Código<input autoComplete="off" autoCorrect="off" spellCheck={false} required maxLength={100} value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="block border rounded-lg p-2 w-full mt-1" /></label>
        {target.kind !== 'caja' && <label className="text-sm block">Nombre<input autoComplete="off" autoCorrect="off" spellCheck={false} required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="block border rounded-lg p-2 w-full mt-1" /></label>}
        {target.kind === 'almacen' && <label className="text-sm block">Ciudad<input autoComplete="off" autoCorrect="off" spellCheck={false} value={city} onChange={e => setCity(e.target.value)} className="block border rounded-lg p-2 w-full mt-1" /></label>}
        <label className="text-sm block">Descripción<input autoComplete="off" autoCorrect="off" spellCheck={false} value={descripcion} onChange={e => setDescription(e.target.value)} className="block border rounded-lg p-2 w-full mt-1" /></label>
        {(target.kind === 'caja' || target.kind === 'almacen' && target.mode === 'edit') &&
          <label className="text-sm block">Estado<Select value={state} onChange={e => setState(e.target.value as typeof state)} className="block border rounded-lg p-2 w-full mt-1">
            {(target.kind === 'caja' ? ['Completa', 'Parcial', 'Vacia'] : ['Operativo', 'Mantenimiento', 'Inactivo']).map(s => <option key={s}>{s}</option>)}
          </Select></label>}
        <div className="responsive-actions pt-3"><button type="button" data-dialog-close disabled={pending} onClick={onClose} className="border rounded-lg px-4 py-2">Cancelar</button>
          <button disabled={pending} type="submit" className="bg-[#3e4e9e] text-white rounded-lg px-4 py-2">{pending ? 'Guardando…' : 'Guardar'}</button></div>
        </fieldset>
      </form>
    </section>
  </div></Presence>, document.body);
}

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { internalRpc } from '../data/internalDispatch';
import { InternalRequests, loadInternalJobs } from '../domain/internalRequests';
import { validateInternalAmounts, type InternalDispatch, type InternalIssueInput, type InternalReturnInput, type StaffInput, type StaffMember } from '../domain/internalDispatch';

export function useInternalOperations(refreshItems: () => Promise<void>, onIssueConfirmed: () => void) {
  const { user } = useAuth(), client = useQueryClient();
  const storageKey = `fulgor_internal_requests_v1_${user?.email || ''}`;
  const [internalJobs, setJobs] = useState(() => loadInternalJobs(storageKey));
  const [internalPending, setPending] = useState(0);
  const requests = useRef<InternalRequests | null>(null);
  if (requests.current === null) requests.current = new InternalRequests(internalJobs, next => {
    setJobs(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* In-memory jobs still protect retries. */ }
  });
  const refresh = async () => {
    const result = await Promise.allSettled([refreshItems(), client.invalidateQueries({ queryKey: ['fulgor', user?.email, 'internal'] })]);
    if (result.some(row => row.status === 'rejected')) console.warn('Se guardó la operación interna; falta actualizar los datos en pantalla.');
  };
  const run = async <T,>(key: string, payload: Record<string, unknown>, name: string, args: Record<string, unknown>) => {
    setPending(value => value + 1);
    try { return await requests.current!.run<T>(key, payload, id => internalRpc<T>(name, { p_request_id: id, ...args })); }
    finally { setPending(value => value - 1); }
  };
  const issueInternal = async (input: InternalIssueInput) => {
    validateInternalAmounts(input.items);
    if (!input.personalId) throw new Error('Seleccione quién recibe los materiales.');
    const loan = await run<InternalDispatch>('issue', { ...input }, 'create_internal_dispatch', { p_personal_id: input.personalId, p_items: input.items });
    onIssueConfirmed(); await refresh(); return loan;
  };
  const returnInternal = async (input: InternalReturnInput) => {
    validateInternalAmounts(input.items);
    const loan = await run<InternalDispatch>(`return:${input.salidaId}`, { ...input }, 'return_internal_dispatch', { p_salida_id: input.salidaId, p_items: input.items });
    await refresh(); return loan;
  };
  const saveStaff = async (input: StaffInput) => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede gestionar personal.');
    const result = await run<StaffMember>(`staff:${input.id || 'new'}`, { ...input }, 'save_internal_staff', {
      p_id: input.id, p_nombre: input.nombre, p_cargo: input.cargo, p_activo: input.activo, p_version: input.version,
    });
    await Promise.allSettled([client.invalidateQueries({ queryKey: ['fulgor', user.email, 'internal', 'staff'] })]); return result;
  };
  return { internalJobs, internalPending: internalPending > 0, issueInternal, returnInternal, saveStaff };
}

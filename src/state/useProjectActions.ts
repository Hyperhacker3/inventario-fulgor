import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { insertRow, updateRow, unwrap } from '../data/repository';
import { mapProyecto } from '../data/mappers';
import { requireSupabase } from '../lib/supabase';
import type { Proyecto } from '../types';

export type ProjectInput = Omit<Proyecto, 'id' | 'createdAt'>;
export function useProjectActions() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['fulgor', user?.email || '', 'proyectos'];
  const requireAdmin = () => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede gestionar proyectos.');
  };
  const remember = (project: Proyecto) => {
    client.setQueryData<Proyecto[]>(key, previous => [project, ...(previous || []).filter(p => p.id !== project.id)]);
  };
  const values = (input: ProjectInput) => {
    if (!input.nombre.trim()) throw new Error('Escriba el nombre del proyecto.');
    return { nombre: input.nombre.trim(), cliente: input.cliente.trim(), ubicacion: input.ubicacion.trim(), estado: input.estado };
  };
  const addProyecto = async (input: ProjectInput) => {
    requireAdmin();
    const project = await insertRow('proyectos', { id: `PROY-${crypto.randomUUID()}`, ...values(input) }, mapProyecto);
    remember(project);
    return project;
  };
  const updateProyecto = async (id: string, input: ProjectInput) => {
    requireAdmin();
    const project = await updateRow('proyectos', id, values(input), mapProyecto);
    remember(project);
    return project;
  };
  const addExampleProjects = async () => {
    requireAdmin();
    // Stable IDs and ignoreDuplicates preserve edits and finalized examples on repeated clicks.
    const rows = [
      { id: 'PROY-EJEMPLO-01', nombre: 'Ejemplo — Instalación solar', cliente: 'EL TURPIAL', ubicacion: 'Ubicación de ejemplo 1', estado: 'ACTIVO' },
      { id: 'PROY-EJEMPLO-02', nombre: 'Ejemplo — Mantenimiento eléctrico', cliente: 'EL TURPIAL', ubicacion: 'Ubicación de ejemplo 2', estado: 'ACTIVO' },
    ];
    const created = unwrap(await requireSupabase().from('proyectos').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }).select('*'));
    created.map(mapProyecto).forEach(remember);
    await client.invalidateQueries({ queryKey: key });
  };
  return { addProyecto, updateProyecto, addExampleProjects };
}

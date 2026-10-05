import { useQuery } from '@tanstack/react-query';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
export function useRemissionTransport() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['fulgor', user?.email, 'transport-ready'], staleTime: 60_000, retry: false,
    queryFn: async () => {
      const result = await requireSupabase().from('remisiones').select('datos_transporte').limit(0);
      if (result.error) throw new Error('Los campos de transporte aún no están disponibles.');
      return true;
    },
  });
}
export function useUnitWeightDispatch() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['fulgor', user?.email, 'unit-weight-dispatch-ready'], staleTime: 60_000, retry: false,
    queryFn: async () => {
      const result = await requireSupabase().rpc('unit_weight_dispatch_ready');
      if (result.error) throw new Error('El cálculo automático de peso requiere activar la actualización de Supabase.');
      return result.data === true;
    },
  });
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { rpc } from '../data/repository';
import { DEFAULT_COMPANY, mapCompany, validateCompany } from '../domain/company';
import type { CompanyProfile, CompanySettings } from '../types';

export function useCompanyProfile() {
  const { user } = useAuth(), client = useQueryClient();
  const key = ['fulgor', user?.email || '', 'company'];
  const query = useQuery({ queryKey: key, queryFn: async () => {
    const result = await rpc<CompanySettings>('inventory_company_profile', {});
    return { ...result, perfil: mapCompany(result.perfil) };
  }, enabled: Boolean(user && supabase), staleTime: 30_000, retry: false });
  const saveCompany = async (profile: CompanyProfile, version: number) => {
    if (user?.role !== 'admin') throw new Error('Solo administración puede editar los datos de empresa.');
    const updated = await rpc<CompanySettings>('save_inventory_company_profile', { p_profile: validateCompany(profile), p_version: version });
    const confirmed = { ...updated, perfil: mapCompany(updated.perfil) };
    client.setQueryData(key, confirmed);
    return confirmed;
  };
  return { company: query.data?.perfil ?? DEFAULT_COMPANY, companySettings: query.data, companyLoading: query.isFetching,
    companyError: query.error, refreshCompany: () => query.refetch(), saveCompany };
}

import type { UserProfile } from '../types';

type Account = { email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> };
const roles: Record<string, string> = { admin: 'Administrador', operador: 'Operador', consulta: 'Consulta' };
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export function displayCargo(user: Pick<UserProfile, 'role' | 'cargo'> | null | undefined): string {
  return text(user?.cargo) || roles[user?.role || ''] || 'Personal de inventario';
}
export function profileForAccount(account: Account): UserProfile {
  const role = text(account.app_metadata?.role);
  const metadata = account.user_metadata || {};
  const name = [metadata.name, metadata.full_name, metadata.display_name].map(text).find(value => value && !value.includes('@'));
  return { name: name || roles[role] || 'Personal de inventario', cargo: text(metadata.cargo) || roles[role] || 'Personal de inventario',
    role, avatar: '', email: account.email || '' };
}

import type { CompanyProfile } from '../types';

export const MAX_COMPANY_LOGO_LENGTH = 160_000;
export const DEFAULT_COMPANY: Readonly<CompanyProfile> = Object.freeze({
  nombre: 'EL TURPIAL', nit: '800.176.581', direccion: '', telefono: '', logo: '/logo-completo.png',
});
export function validCompanyLogo(value: string) {
  return value === DEFAULT_COMPANY.logo || (value.length <= MAX_COMPANY_LOGO_LENGTH && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
}
export function mapCompany(value: unknown): CompanyProfile {
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const text = (key: keyof CompanyProfile) => typeof row[key] === 'string' ? row[key].trim() : DEFAULT_COMPANY[key];
  const logo = text('logo');
  return { nombre: text('nombre') || DEFAULT_COMPANY.nombre, nit: text('nit') || DEFAULT_COMPANY.nit,
    direccion: text('direccion'), telefono: text('telefono'), logo: validCompanyLogo(logo) ? logo : DEFAULT_COMPANY.logo };
}
export function validateCompany(profile: CompanyProfile): CompanyProfile {
  const text = (value: string) => value.trim().replace(/\s+/g, ' ');
  const normalized = { ...profile, nombre: text(profile.nombre), nit: text(profile.nit), direccion: text(profile.direccion), telefono: text(profile.telefono) };
  if (!normalized.nombre || normalized.nombre.length > 120) throw new Error('Escriba un nombre de empresa de hasta 120 caracteres.');
  if (!/^[0-9][0-9 .-]{2,29}$/.test(normalized.nit)) throw new Error('Escriba un NIT de 3 a 30 caracteres, con números, puntos o guion.');
  if (normalized.direccion.length > 240) throw new Error('La dirección admite hasta 240 caracteres.');
  if (normalized.telefono.length > 60) throw new Error('El teléfono admite hasta 60 caracteres.');
  if (!validCompanyLogo(normalized.logo)) throw new Error('Suba un logo PNG, JPG o WebP.');
  return normalized;
}

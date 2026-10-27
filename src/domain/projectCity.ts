export const PROJECT_CITY_MAX = 80;

const normalized = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ');
export function projectCityIssue(value: string): string | null {
  const city = normalized(value);
  if (!city) return 'Indique la ciudad del proyecto.';
  if (city.length > PROJECT_CITY_MAX || !/[A-Za-z]/.test(city.normalize('NFD')) || !/^[\p{L}][\p{L}\p{M} .’'-]*$/u.test(city)
    || /\b(calle|carrera|avenida|diagonal|transversal|carretera|kilómetro|kilometro|vía|via|km)\b/i.test(city)) {
    return 'Escriba solo la ciudad del proyecto, sin dirección, números ni departamento (máximo 80 caracteres).';
  }
  return null;
}
export function normalizeProjectCity(value: string): string {
  const issue = projectCityIssue(value);
  if (issue) throw new Error(issue);
  return normalized(value);
}

/** Normalize names at the write boundary, preserving accents and internal spacing. */
export const uppercaseName = (value: string | undefined) => (value || '').trim().toLocaleUpperCase('es');

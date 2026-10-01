const timeZone = 'America/Bogota';
export const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone });
};
export const displayTime = (value: string) => new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone });

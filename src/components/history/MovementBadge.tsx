import type { TipoMovimiento } from '../../types';
const styles: Record<TipoMovimiento, { label: string; icon: string; classes: string }> = {
  SALIDA: { label: 'Salida', icon: 'output', classes: 'bg-[#fce8e6] text-[#c5221f] border-[#ffdad6]' },
  ENTRADA: { label: 'Entrada', icon: 'input', classes: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' },
  AJUSTE: { label: 'Ajuste', icon: 'tune', classes: 'bg-[#fef7e0] text-[#755b00] border-[#ffdf90]' },
  REUBICACION: { label: 'Reubicación', icon: 'swap_horiz', classes: 'bg-[#eaedff] text-[#253685] border-[#cbd5e1]' },
};
export function MovementBadge({ type }: { type: TipoMovimiento }) {
  const style = styles[type];
  return <span className={`px-2.5 py-1 rounded-md text-xs font-bold border inline-flex items-center gap-1 ${style.classes}`}>
    <span className="material-symbols-outlined text-[14px]">{style.icon}</span>{style.label}
  </span>;
}

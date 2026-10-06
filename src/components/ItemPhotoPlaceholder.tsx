import type { CategoriaElemento } from '../types';

const icons: Record<CategoriaElemento, string> = {
  PANELES: 'solar_power', INVERSORES: 'electric_bolt', ESTRUCTURAS: 'view_module',
  CABLES: 'cable', CONECTORES: 'power', PROTECCIONES: 'shield', BATERIAS: 'battery_full',
  CONTROLADORES: 'settings_input_component', ACCESORIOS: 'extension', HERRAMIENTAS: 'construction',
  SEGURIDAD_EPP: 'engineering', OTROS: 'inventory_2',
};

export function ItemPhotoPlaceholder({ category = 'OTROS', compact = false, className = '' }: {
  category?: CategoriaElemento; compact?: boolean; className?: string;
}) {
  const label = category.replaceAll('_', ' ');
  return <div role="img" aria-label={`Sin fotografía · ${label}`} title={`Sin fotografía · ${label}`}
    className={`${className} flex flex-col items-center justify-center bg-linear-to-br from-[#f2f3ff] via-[#f8fafc] to-[#e8edf8] text-[#3e4e9e]`}>
    <span aria-hidden="true" className={compact ? 'inline-flex items-center justify-center' : 'w-28 h-28 rounded-full bg-white/80 border border-white shadow-xs flex items-center justify-center mb-4'}>
      <span className={`material-symbols-outlined ${compact ? 'text-[24px]' : 'text-[64px]'}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{icons[category] || 'inventory_2'}</span>
    </span>
    {!compact && <><span className="text-xs font-bold tracking-wider px-4 text-center">{label}</span><span className="text-xs text-[#64748b] mt-1">Sin fotografía</span></>}
  </div>;
}

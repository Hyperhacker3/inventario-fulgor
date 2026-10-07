import type { RemissionRoute } from '../../types';
import { remissionDate, routeCodeSegment } from '../../domain/remissionRoute';

export function RemissionRouteFields({ value, onChange }: { value: RemissionRoute; onChange: (value: RemissionRoute) => void }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(['lugarRemision', 'lugarDestino'] as const).map(key => <label key={key} className="text-xs font-bold text-[#454651]">
        {key === 'lugarRemision' ? 'LUGAR DE REMISIÓN' : 'LUGAR DE DESTINO'} <span className="text-red-700">*</span>
        <input autoComplete="off" required maxLength={80} value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })}
          placeholder={key === 'lugarRemision' ? 'Ej. Honda' : 'Ej. Bogotá'} className="block w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
      </label>)}
    </div>
    <p className="text-xs text-slate-500 break-words">Código: REM-{routeCodeSegment(value.lugarRemision) || 'ORIGEN'}-{routeCodeSegment(value.lugarDestino) || 'DESTINO'}-{remissionDate().replaceAll('-', '')}-…<br />El consecutivo anual se asigna al registrar la salida. La fecha corresponde a la emisión de la remisión.</p>
  </div>;
}

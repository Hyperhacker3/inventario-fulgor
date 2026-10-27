import type { RemissionRoute } from '../../types';
import { remissionDate, routeCodeSegment } from '../../domain/remissionRoute';
import { projectCityIssue } from '../../domain/projectCity';

export function RemissionRouteFields({ value, onChange, projectCity }: { value: RemissionRoute; onChange: (value: RemissionRoute) => void; projectCity: string }) {
  const city = projectCityIssue(projectCity) ? '' : projectCity;
  return <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(['lugarRemision', 'lugarDestino'] as const).map(key => <label key={key} className="text-xs font-bold text-[#454651]">
        {key === 'lugarRemision' ? 'LUGAR DE REMISIÓN' : 'LUGAR DE DESTINO'} <span className="text-red-700">*</span>
        <input autoComplete="off" required maxLength={80} value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })}
          placeholder={key === 'lugarRemision' ? 'Ej. Honda' : 'Dirección o indicación de entrega'} className="block w-full mt-1 px-3 py-2 border rounded-lg text-sm uppercase" />
      </label>)}
    </div>
    <p className="text-xs text-slate-500 break-words">Código: REM-{routeCodeSegment(value.lugarRemision) || 'ORIGEN'}-{routeCodeSegment(city) || 'CIUDAD-DEL-PROYECTO'}-{remissionDate().replaceAll('-', '')}-…<br />Se usa la ciudad del proyecto. El lugar de destino conserva la dirección de entrega y no forma parte del código. La fecha y el consecutivo anual se asignan al registrar la salida.</p>
  </div>;
}

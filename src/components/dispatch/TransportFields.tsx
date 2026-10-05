import type { DatosTransporte } from '../../types';
import { transportFields } from '../../domain/remissionTransport';
export function TransportFields({ value, onChange, disabled }: { value: DatosTransporte; onChange: (value: DatosTransporte) => void; disabled: boolean }) {
  return <fieldset disabled={disabled} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-4">
    <legend className="text-sm font-bold text-[#253685]">Datos de transporte (opcionales)</legend>
    {transportFields.map(field => <label key={field.key} className="text-xs text-slate-600">{field.label}
      <input type={field.type} maxLength={field.maxLength} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: field.key === 'placaVehiculo' ? event.target.value.toUpperCase() : event.target.value })} className="block w-full border rounded-lg p-2 mt-1 bg-white disabled:bg-slate-100" />
    </label>)}
  </fieldset>;
}

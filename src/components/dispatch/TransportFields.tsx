import type { DatosTransporte } from '../../types';
import { carrierFields, shipmentDateFields } from '../../domain/remissionTransport';
import { DatePicker } from '../ui/DatePicker';
export function TransportFields({ value, onChange, disabled }: { value: DatosTransporte; onChange: (value: DatosTransporte) => void; disabled: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0 rounded-xl bg-slate-50 p-4">
    <legend className="text-sm font-bold text-[#253685]">Datos del transportador y vehículo</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {carrierFields.map(field => <label key={field.key} className="text-xs text-slate-600">{field.label}
      <input autoComplete="off" autoCorrect="off" spellCheck={false} type={field.type} maxLength={field.maxLength} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: field.key === 'placaVehiculo' ? event.target.value.toUpperCase() : event.target.value })} className="block w-full border rounded-lg p-2 mt-1 bg-white disabled:bg-slate-100" />
    </label>)}
    </div>
  </fieldset>;
}

export function ShipmentDates({ value, onChange, disabled }: { value: DatosTransporte; onChange: (value: DatosTransporte) => void; disabled: boolean }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {shipmentDateFields.map(field => <label key={field.key} className="text-xs text-slate-600">{field.label}
      <DatePicker label={field.label} value={value[field.key]} disabled={disabled}
        onChange={date => onChange({ ...value, [field.key]: date })} className="block w-full border rounded-lg p-2 mt-1 bg-white" />
    </label>)}
  </div>;
}

import type { DatosTransporte } from '../../types';

interface Props {
  sender: string; onSenderChange: (value: string) => void;
  senderRole: string; onSenderRoleChange: (value: string) => void;
  recipient: string; onRecipientChange: (value: string) => void;
  transport: DatosTransporte; onTransportChange: (value: DatosTransporte) => void;
  contactsDisabled: boolean;
}

export function DispatchPartiesFields({ sender, onSenderChange, senderRole, onSenderRoleChange,
  recipient, onRecipientChange, transport, onTransportChange, contactsDisabled }: Props) {
  const inputClass = 'block w-full mt-1 px-3 py-2 rounded-lg text-xs';
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <fieldset className="min-w-0 rounded-xl bg-slate-50 p-4 space-y-3">
      <legend className="text-sm font-bold text-[#253685]">Datos del remitente</legend>
      <label className="block text-xs font-bold text-[#454651]">ENTREGA EN BODEGA
        <input autoComplete="off" autoCorrect="off" spellCheck={false} value={sender} maxLength={180}
          onChange={event => onSenderChange(event.target.value)} className={`${inputClass} uppercase`} placeholder="Nombre de quien entrega" />
      </label>
      <label className="block text-xs font-bold text-[#454651]">CARGO DE QUIEN ENTREGA
        <input autoComplete="off" autoCorrect="off" spellCheck={false} value={senderRole} maxLength={180}
          onChange={event => onSenderRoleChange(event.target.value)} className={`${inputClass} uppercase`} />
      </label>
      <label className="block text-xs font-bold text-[#454651]">TELÉFONO DEL REMITENTE
        <input type="tel" autoComplete="off" value={transport.telefonoRemite} maxLength={40} disabled={contactsDisabled}
          onChange={event => onTransportChange({ ...transport, telefonoRemite: event.target.value })} className={inputClass} />
      </label>
    </fieldset>
    <fieldset className="min-w-0 rounded-xl bg-slate-50 p-4 space-y-3">
      <legend className="text-sm font-bold text-[#253685]">Datos del destinatario</legend>
      <label className="block text-xs font-bold text-[#454651]">DESTINATARIO *
        <input autoComplete="off" autoCorrect="off" spellCheck={false} value={recipient} maxLength={180} required
          onChange={event => onRecipientChange(event.target.value)} className={`${inputClass} uppercase`} placeholder="Nombre de la persona o entidad destinataria" />
      </label>
      <label className="block text-xs font-bold text-[#454651]">TELÉFONO DEL DESTINATARIO
        <input type="tel" autoComplete="off" value={transport.telefonoRecibe} maxLength={40} disabled={contactsDisabled}
          onChange={event => onTransportChange({ ...transport, telefonoRecibe: event.target.value })} className={inputClass} />
      </label>
    </fieldset>
  </div>;
}

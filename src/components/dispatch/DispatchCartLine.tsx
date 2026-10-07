import type { DispatchCartItem } from '../../types';
import { available } from '../../domain/inventory';
import { openProductSurface } from '../../shared/productInteraction';
import { NumberInput } from '../NumberInput';

interface Props {
  item: DispatchCartItem;
  onOpen: () => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function DispatchCartLine({ item, onOpen, onQuantity, onRemove }: Props) {
  return <div className="ui-product ui-product-line min-w-0 p-4 grid grid-cols-[minmax(0,1fr)_44px] items-start gap-4"
    onClick={event => {
      if (event.currentTarget.querySelector('.ui-product-open')?.matches(':disabled')) return;
      openProductSurface(event, onOpen);
    }}>
    <div className="min-w-0 space-y-1">
      <button type="button" onClick={onOpen} className="ui-product-open block w-full text-left font-semibold text-sm break-words">{item.elemento.nombre}</button>
      <span className="block font-mono-code text-xs text-[#3e4e9e]">{item.elemento.codigo}</span>
    </div>
    <button type="button" onClick={onRemove} className="w-11 h-11 rounded-xl text-red-700 grid place-items-center"
      aria-label={`Quitar ${item.elemento.nombre}`} title="Quitar material"><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
    <div className="col-span-2 flex flex-wrap items-center gap-3 min-w-0">
      <button type="button" onClick={() => onQuantity(item.cantidad - 1)} className="w-11 h-11 rounded-xl shrink-0" aria-label={`Restar una unidad de ${item.elemento.nombre}`}>−</button>
      <NumberInput required min="0.001" step="0.001" max={available(item.elemento)} value={item.cantidad} onValueChange={onQuantity}
        aria-label={`Cantidad de ${item.elemento.nombre}`} className="w-20 min-w-0 text-center font-mono-code text-sm" />
      <button type="button" onClick={() => onQuantity(item.cantidad + 1)} className="w-11 h-11 rounded-xl shrink-0" aria-label={`Sumar una unidad de ${item.elemento.nombre}`}>+</button>
      <span className="text-xs text-[#64748b]">{item.elemento.unidad}</span>
    </div>
  </div>;
}

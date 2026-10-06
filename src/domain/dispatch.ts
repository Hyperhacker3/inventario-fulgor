import type { DispatchCartItem, Elemento } from '../types';
import { available, byId } from './inventory';
import { validQuantity } from './quantity';
export function validateDispatch(cart: DispatchCartItem[], inventory: Elemento[]) {
  if (!cart.length) throw new Error('Agregue al menos un componente.');
  const stock = byId(inventory);
  const seen = new Set<string>();
  for (const line of cart) {
    const id = line.elemento.id;
    if (seen.has(id)) throw new Error('Hay un componente repetido.');
    seen.add(id);
    if (!validQuantity(line.cantidad) || line.cantidad <= 0) throw new Error('La cantidad de la salida debe ser positiva, con hasta tres decimales.');
    const item = stock.get(id);
    if (!item || available(item) < line.cantidad) throw new Error(`Stock insuficiente para ${item?.codigo ?? id}.`);
  }
}

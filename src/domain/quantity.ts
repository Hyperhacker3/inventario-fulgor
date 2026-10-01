export const MIN_QUANTITY = 0.001;
export function validQuantity(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) < 100_000_000_000 &&
    Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7;
}
export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

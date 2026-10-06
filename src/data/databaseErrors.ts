export function isDatabaseRejection(cause: unknown): boolean {
  // SQLSTATE proves a returned database failure. Network errors cannot prove
  // whether the transaction committed before the response was lost.
  return cause instanceof Error && 'code' in cause && typeof cause.code === 'string' && /^[0-9A-Z]{5}$/.test(cause.code);
}

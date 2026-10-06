export type InitialLoadStatus = 'loading' | 'ready' | 'error';
interface InitialQuery { data: unknown; isError: boolean; fetchStatus: 'fetching' | 'paused' | 'idle' }
export function initialQueryStatus(queries: readonly InitialQuery[]): InitialLoadStatus {
  const missing = queries.filter(query => query.data === undefined);
  if (!missing.length) return 'ready';
  if (missing.some(query => query.fetchStatus === 'paused' || query.isError && query.fetchStatus !== 'fetching')) return 'error';
  return 'loading';
}
export function combinedInitialStatus(...statuses: InitialLoadStatus[]): InitialLoadStatus {
  if (statuses.includes('error')) return 'error';
  return statuses.every(status => status === 'ready') ? 'ready' : 'loading';
}

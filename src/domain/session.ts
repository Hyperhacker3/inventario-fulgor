export function sessionIdentity(session: { user: { id: string; app_metadata?: Record<string, unknown> } } | null): string | null {
  return session ? `${session.user.id}:${String(session.user.app_metadata?.role || '')}` : null;
}

export function shouldClearSessionCache(previous: string | null | undefined, next: string | null): boolean {
  return previous !== undefined && previous !== next;
}

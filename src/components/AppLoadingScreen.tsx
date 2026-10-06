import { Component, Suspense, type ReactNode } from 'react';
import type { InitialLoadStatus } from '../domain/initialLoad';

export function AppLoadingScreen({ message = 'Cargando inventario…' }: { message?: string }) {
  return <main className="app-loading" role="status" aria-live="polite" aria-busy="true">
    <div className="app-loading-content">
      <div className="app-spinner" aria-hidden="true" /><p>{message}</p>
    </div>
  </main>;
}
export function AppLoadingError({ onRetry, onSignOut }: { onRetry: () => void; onSignOut?: () => void }) {
  return <main className="app-loading">
    <div className="app-loading-content"><h1>Inventario turpial</h1>
      <p role="alert">No se pudo cargar la aplicación. Compruebe su conexión e inténtelo de nuevo.</p>
      <button type="button" onClick={onRetry}>Reintentar</button>
      {onSignOut && <button type="button" className="app-secondary" onClick={onSignOut}>Cerrar sesión</button>}
    </div>
  </main>;
}
export function AppInitialContent({ status, onRetry, onSignOut, children }: {
  status: InitialLoadStatus; onRetry: () => void; onSignOut?: () => void; children: ReactNode;
}) {
  if (status === 'loading') return <AppLoadingScreen />;
  if (status === 'error') return <AppLoadingError onRetry={onRetry} onSignOut={onSignOut} />;
  return <Suspense fallback={<AppLoadingScreen message="Preparando pantalla…" />}>{children}</Suspense>;
}
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('No se pudo mostrar la aplicación:', error); }
  render() { return this.state.failed ? <AppLoadingError onRetry={() => window.location.reload()} /> : this.props.children; }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeSupabase } from './lib/supabase';
import { AppErrorBoundary, AppLoadingError, AppLoadingScreen } from './components/AppLoadingScreen';
import { loadStartupAssets } from './shared/startupAssets';

const root = createRoot(document.getElementById('root')!);
root.render(<AppLoadingScreen message="Cargando aplicación…" />);
Promise.all([initializeSupabase(), loadStartupAssets()]).then(() => {
  root.render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>);
}).catch(error => {
  console.error('No se pudo iniciar la aplicación:', error);
  root.render(<AppLoadingError onRetry={() => window.location.reload()} />);
});

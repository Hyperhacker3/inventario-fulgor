import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeSupabase } from './lib/supabase';

initializeSupabase().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
}).catch(error => {
  const element = document.getElementById('root');
  if (element) element.textContent = `No se pudo iniciar la aplicación: ${error instanceof Error ? error.message : String(error)}`;
});

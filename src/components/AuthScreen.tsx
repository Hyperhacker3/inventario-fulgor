import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setPending(true);
    try { await signIn(email, password); } catch { setError('Credenciales inválidas o servicio no disponible.'); }
    finally { setPending(false); }
  };
  return <main className="min-h-screen flex items-center justify-center bg-[#faf8ff] p-4">
    <section className="bg-white border rounded-2xl shadow-md p-7 w-full max-w-sm space-y-5">
      <h1 className="font-bold text-2xl text-[#253685]">Inventario turpial</h1>
      {!isSupabaseConfigured ? <p role="alert">Configure la URL y la clave publicable de Supabase en .env.local.</p> :
      <form autoComplete="off" onSubmit={submit} className="space-y-4">
        <h2 className="font-semibold">Iniciar sesión</h2>
        <label className="block text-sm">Correo<input autoComplete="off" autoCorrect="off" spellCheck={false} className="block w-full border rounded-lg p-2 mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label className="block text-sm">Contraseña<input autoComplete="off" autoCorrect="off" spellCheck={false} className="block w-full border rounded-lg p-2 mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
        <button disabled={pending} className="bg-[#3e4e9e] text-white rounded-lg p-2 w-full">{pending ? 'Ingresando…' : 'Ingresar'}</button>
      </form>}
    </section>
  </main>;
}

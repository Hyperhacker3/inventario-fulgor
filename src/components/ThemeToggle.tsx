import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({ menu = false }: { menu?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const target = theme === 'light' ? 'modo oscuro' : 'modo claro';
  return <button type="button" aria-label={`Cambiar a ${target}`} title={`Modo ${theme === 'light' ? 'claro' : 'oscuro'} · Cambiar a ${target}`}
    onClick={toggleTheme} className={`theme-toggle ${menu ? 'flex w-full items-center gap-2 min-h-11 rounded-xl px-3 text-sm hover:bg-slate-50' : 'hidden xl:flex w-11 h-11 rounded-full items-center justify-center text-[#454651] hover:text-[#253685] hover:bg-[#f2f3ff]'}`}>
    <span className="theme-toggle-icon" data-theme={theme} aria-hidden="true">
      <svg className="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 13.3A8.5 8.5 0 0 1 10.7 3.5 8.5 8.5 0 1 0 20.5 13.3Z" /></svg>
      <svg className="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
    </span>
    {menu && <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>}
  </button>;
}

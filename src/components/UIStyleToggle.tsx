import { useTheme } from '../context/ThemeContext';

export function UIStyleToggle() {
  const { uiStyle, toggleUIStyle } = useTheme();
  const current = uiStyle === 'neumorphism' ? 'Neumorfismo' : 'Liquid Glass';
  const target = uiStyle === 'neumorphism' ? 'Liquid Glass' : 'Neumorfismo';
  return <section aria-labelledby="appearance-heading" className="ui-inset rounded-xl p-4 space-y-3">
    <h3 id="appearance-heading" className="font-bold text-[#253685]">Estilo de la interfaz</h3>
    <p className="text-sm text-[#454651]">El estilo se guarda en este navegador. Puede combinarlo con modo claro u oscuro.</p>
    <p role="status" className="text-sm">Estilo actual: <strong>{current}</strong></p>
    <button type="button" className="ui-style-toggle bg-[#3e4e9e] text-white rounded-xl px-4 py-3 min-h-11 w-full sm:w-auto text-sm font-semibold"
      onClick={toggleUIStyle}>Cambiar a {target}</button>
  </section>;
}

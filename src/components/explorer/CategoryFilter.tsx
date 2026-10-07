import { Select } from '../ui/Select';

interface Props {
  options: string[];
  selected: string[];
  label: (id: string) => string;
  onChange: (selected: string[]) => void;
}
export function CategoryFilter({ options, selected, label, onChange }: Props) {
  const remaining = options.filter(category => !selected.includes(category));
  return <div className="space-y-2">
    <label htmlFor="inventory-category-filter" className="block text-xs font-bold text-[#454651] uppercase">Categorías</label>
    <Select id="inventory-category-filter" value="" disabled={!remaining.length}
      onChange={event => { if (event.target.value && !selected.includes(event.target.value)) onChange([...selected, event.target.value]); }}
      className="block w-full p-2 border rounded-lg bg-white text-sm">
      <option value="">{remaining.length ? 'Añadir categoría al filtro' : 'Todas seleccionadas'}</option>
      {remaining.map(category => <option key={category} value={category}>{label(category)}</option>)}
    </Select>
    {selected.length ? <>
      <p className="text-xs text-slate-500" role="status">{selected.length} categoría(s) seleccionada(s)</p>
      <ul aria-label="Categorías del filtro" className="ui-category-chips flex flex-wrap gap-3 max-h-40 overflow-y-auto overscroll-contain">
        {selected.map(category => <li key={category} className="max-w-full">
          <button type="button" aria-label={`Quitar categoría ${label(category)}`} onClick={() => onChange(selected.filter(value => value !== category))}
            className="flex items-center gap-2 min-h-11 max-w-full rounded-lg bg-[#eaedff] text-[#253685] px-2.5 py-2 text-xs text-left">
            <span className="min-w-0 break-words">{label(category)}</span><span aria-hidden="true" className="shrink-0 text-lg">×</span>
          </button>
        </li>)}
      </ul>
    </> : <p className="text-xs text-slate-500">Todas las categorías. Puede elegir varias.</p>}
  </div>;
}

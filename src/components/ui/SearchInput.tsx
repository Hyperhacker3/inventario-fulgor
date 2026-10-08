import { useRef, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  value: string; onClear: () => void; wrapperClassName?: string;
};

export function SearchInput({ value, onClear, className = '', wrapperClassName = '', ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return <div className={`ui-search-input-wrap relative min-w-0 w-full ${wrapperClassName}`}>
    <input ref={input} autoComplete="off" autoCorrect="off" spellCheck={false} {...props} type="search" value={value}
      className={`ui-search-input ${className} !pr-11`} />
    {value.length > 0 && <button type="button" disabled={props.disabled} aria-label="Borrar búsqueda" title="Borrar búsqueda"
      onClick={() => { onClear(); input.current?.focus({ preventScroll: true }); }}
      className="ui-search-clear absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg flex items-center justify-center text-[#3e4e9e] disabled:opacity-40">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
    </button>}
  </div>;
}

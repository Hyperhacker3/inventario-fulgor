import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onValueChange: (value: number) => void;
};

// Keep the editable text separate so clearing a field never turns it into zero.
export function NumberInput({ value, onValueChange, onBlur, ...props }: Props) {
  const [draft, setDraft] = useState<{ text: string; committed: number } | null>(null);
  return <input {...props} type="number"
    value={draft && draft.committed === value ? draft.text : value}
    onChange={event => {
      const text = event.target.value;
      const number = event.target.valueAsNumber;
      if (text === '' || !Number.isFinite(number)) {
        setDraft({ text, committed: value });
        return;
      }
      setDraft({ text, committed: number });
      onValueChange(number);
    }}
    onBlur={event => {
      if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber)) setDraft(null);
      onBlur?.(event);
    }} />;
}

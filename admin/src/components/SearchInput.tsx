interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Zoeken...' }: Props) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-md rounded-lg bg-cb-surface border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50 mb-4"
    />
  );
}

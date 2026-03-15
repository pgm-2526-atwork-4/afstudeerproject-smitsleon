interface Props {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
}

export default function FormField({ label, value, onChange, type = 'text', placeholder, step }: Props) {
  return (
    <div>
      <label className="block text-xs text-cb-text-muted mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
      />
    </div>
  );
}

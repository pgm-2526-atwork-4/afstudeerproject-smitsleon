interface Props {
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, count, onPageChange }: Props) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="rounded-lg bg-cb-surface border border-cb-border px-3 py-1.5 text-sm text-cb-text-secondary hover:bg-cb-surface-light disabled:opacity-30 cursor-pointer transition-colors"
      >
        ← Vorige
      </button>
      <span className="text-sm text-cb-text-muted">Pagina {page + 1}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={count < pageSize}
        className="rounded-lg bg-cb-surface border border-cb-border px-3 py-1.5 text-sm text-cb-text-secondary hover:bg-cb-surface-light disabled:opacity-30 cursor-pointer transition-colors"
      >
        Volgende →
      </button>
    </div>
  );
}

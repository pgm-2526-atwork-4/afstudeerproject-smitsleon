import type { DbEvent } from '../lib/types';

interface Props {
  events: DbEvent[];
  loading: boolean;
  onEdit?: (event: DbEvent) => void;
}

export default function EventList({ events, loading, onEdit }: Props) {
  if (loading) {
    return <p className="text-sm text-cb-text-muted py-4">Laden...</p>;
  }

  const upcoming = events
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  const noDate = events.filter((e) => !e.date);

  if (upcoming.length === 0 && noDate.length === 0) {
    return <p className="text-sm text-cb-text-muted py-4">Geen aankomende events gevonden.</p>;
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <Section title="Aankomend" events={upcoming} onEdit={onEdit} />
      )}
      {noDate.length > 0 && (
        <Section title="Zonder datum" events={noDate} onEdit={onEdit} />
      )}
    </div>
  );
}

function Section({ title, events, onEdit }: { title: string; events: DbEvent[]; onEdit?: (event: DbEvent) => void }) {
  return (
    <div>
      <h4 className="text-xs uppercase text-cb-text-muted mb-2">{title}</h4>
      <div className="space-y-1">
        {events.map((ev) => (
          <div
            key={ev.id}
            onClick={() => onEdit?.(ev)}
            className={`flex items-center justify-between rounded-lg bg-cb-surface-light/50 px-3 py-2${onEdit ? ' cursor-pointer hover:bg-cb-surface-light transition-colors' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-cb-text truncate">{ev.name}</p>
              <p className="text-xs text-cb-text-muted">
                {ev.city ?? '—'}
                {ev.time ? ` · ${ev.time}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-xs text-cb-text-secondary ml-3">
              {ev.date ? new Date(ev.date).toLocaleDateString('nl-BE') : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

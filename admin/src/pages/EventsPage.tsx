import { useCallback, useEffect, useState } from 'react';
import EventEditModal from '../components/EventEditModal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import { supabaseAdmin } from '../lib/supabase';
import type { DbEvent } from '../lib/types';

const EMPTY: DbEvent = {
  id: '',
  name: '',
  date: '',
  location_name: '',
  image_url: '',
  venue_id: '',
  city: '',
  time: '',
  url: '',
  latitude: null,
  longitude: null,
  created_at: '',
};

export default function EventsPage() {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ event: DbEvent; isNew: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from('events')
      .select('*')
      .order('date', { ascending: false, nullsFirst: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%,location_name.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setEvents((data ?? []) as DbEvent[]);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function openNew() {
    setEditing({ event: { ...EMPTY, id: crypto.randomUUID() }, isNew: true });
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je dit event wilt verwijderen?')) return;
    await supabaseAdmin.from('events').delete().eq('id', id);
    fetchEvents();
  }

  return (
    <div>
      <PageHeader
        title="Events"
        action={
          <button onClick={openNew} className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer">
            + Toevoegen
          </button>
        }
      />

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        placeholder="Zoek op naam, stad of venue..."
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-cb-text-muted py-8 text-center">Geen events gevonden.</p>
      ) : (
        <div className="bg-cb-surface border border-cb-border rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-cb-surface-light text-cb-text-secondary text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Stad</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cb-border">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-cb-surface-light/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{ev.name}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">
                    {ev.date ? new Date(ev.date).toLocaleDateString('nl-BE') : '—'}
                  </td>
                  <td className="px-4 py-3 text-cb-text-secondary">{ev.location_name ?? '—'}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{ev.city ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => setEditing({ event: ev, isNew: false })} className="text-cb-primary hover:underline cursor-pointer text-xs">Bewerken</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-cb-error hover:underline cursor-pointer text-xs">Verwijderen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} count={events.length} onPageChange={setPage} />

      {editing && (
        <EventEditModal
          event={editing.event}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchEvents(); }}
        />
      )}
    </div>
  );
}

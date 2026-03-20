import { useCallback, useEffect, useState } from 'react';
import FormField from '../components/FormField';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import { supabaseAdmin } from '../lib/supabase';
import type { DbArtist, DbEvent, DbVenue } from '../lib/types';

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
  const [venues, setVenues] = useState<DbVenue[]>([]);
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<string>>(new Set());
  const [artistSearch, setArtistSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DbEvent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const fetchVenues = useCallback(async () => {
    const { data } = await supabaseAdmin.from('venues').select('*').order('name');
    setVenues((data ?? []) as DbVenue[]);
  }, []);

  const fetchArtists = useCallback(async () => {
    const { data } = await supabaseAdmin.from('artists').select('*').order('name');
    setArtists((data ?? []) as DbArtist[]);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchVenues(); }, [fetchVenues]);
  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  function openNew() {
    setEditing({ ...EMPTY, id: crypto.randomUUID() });
    setSelectedArtistIds(new Set());
    setArtistSearch('');
    setIsNew(true);
  }

  async function openEdit(ev: DbEvent) {
    setEditing({ ...ev });
    setArtistSearch('');
    setIsNew(false);
    // Load linked artists
    const { data } = await supabaseAdmin
      .from('event_artists')
      .select('artist_id')
      .eq('event_id', ev.id);
    setSelectedArtistIds(new Set((data ?? []).map((r: { artist_id: string }) => r.artist_id)));
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);

    const venue = venues.find((v) => v.id === editing.venue_id);

    const row = {
      id: editing.id,
      name: editing.name.trim(),
      date: editing.date || null,
      time: editing.time || null,
      venue_id: editing.venue_id || null,
      location_name: venue?.name ?? null,
      city: venue?.city ?? null,
      latitude: venue?.latitude ?? null,
      longitude: venue?.longitude ?? null,
      image_url: editing.image_url || null,
      url: editing.url || null,
    };

    if (isNew) {
      await supabaseAdmin.from('events').insert(row);
    } else {
      await supabaseAdmin.from('events').update(row).eq('id', editing.id);
    }

    // Sync event_artists: delete old, insert new
    await supabaseAdmin.from('event_artists').delete().eq('event_id', editing.id);
    if (selectedArtistIds.size > 0) {
      await supabaseAdmin.from('event_artists').insert(
        [...selectedArtistIds].map((artist_id) => ({ event_id: editing.id, artist_id }))
      );
    }

    setSaving(false);
    setEditing(null);
    fetchEvents();
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je dit event wilt verwijderen?')) return;
    await supabaseAdmin.from('events').delete().eq('id', id);
    fetchEvents();
  }

  function field(label: string, key: keyof DbEvent, opts?: { type?: string; placeholder?: string }) {
    return (
      <FormField
        label={label}
        type={opts?.type}
        value={(editing?.[key] as string | number | null) ?? ''}
        onChange={(v) => setEditing((prev) => prev ? { ...prev, [key]: v || null } : prev)}
        placeholder={opts?.placeholder}
      />
    );
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
                  <td className="px-4 py-3 text-cb-text-secondary">{venues.find((v) => v.id === ev.venue_id)?.name ?? ev.location_name ?? '—'}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{ev.city ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(ev)} className="text-cb-primary hover:underline cursor-pointer text-xs">Bewerken</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-cb-error hover:underline cursor-pointer text-xs">Verwijderen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} count={events.length} onPageChange={setPage} />

      {/* Edit/Create modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} maxWidth="max-w-lg">
            <h2 className="text-lg font-semibold mb-4">{isNew ? 'Event toevoegen' : 'Event bewerken'}</h2>

            <div className="space-y-3">
              {field('Naam *', 'name', { placeholder: 'Evenementnaam' })}

              <div className="grid grid-cols-2 gap-3">
                {field('Datum', 'date', { type: 'date' })}
                {field('Tijd', 'time', { placeholder: '20:00' })}
              </div>

              {/* Venue dropdown */}
              <div>
                <label className="block text-xs text-cb-text-muted mb-1">Venue</label>
                <select
                  value={editing.venue_id ?? ''}
                  onChange={(e) => {
                    setEditing((prev) => prev ? { ...prev, venue_id: e.target.value || null } : prev);
                  }}
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                >
                  <option value="">— Selecteer venue —</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} {v.city ? `(${v.city})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Stad (read-only, afgeleid van venue) */}
              {(() => {
                const selectedVenue = venues.find((v) => v.id === editing.venue_id);
                return selectedVenue?.city ? (
                  <div>
                    <label className="block text-xs text-cb-text-muted mb-1">Stad</label>
                    <p className="rounded-lg bg-cb-surface-light/50 border border-cb-border px-3 py-2 text-sm text-cb-text-secondary">
                      {selectedVenue.city}
                    </p>
                  </div>
                ) : null;
              })()}

              {field('Afbeelding URL', 'image_url', { placeholder: 'https://...' })}
              {field('Ticket URL', 'url', { placeholder: 'https://...' })}

              {/* Artiesten */}
              <div>
                <label className="block text-xs text-cb-text-muted mb-1">Artiesten</label>
                {selectedArtistIds.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[...selectedArtistIds].map((aid) => {
                      const a = artists.find((x) => x.id === aid);
                      return (
                        <span key={aid} className="inline-flex items-center gap-1 rounded-full bg-cb-primary/15 border border-cb-primary/30 px-2.5 py-1 text-xs text-cb-primary">
                          {a?.name ?? aid}
                          <button
                            type="button"
                            onClick={() => setSelectedArtistIds((prev) => { const n = new Set(prev); n.delete(aid); return n; })}
                            className="hover:text-cb-error cursor-pointer"
                          >×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={artistSearch}
                  onChange={(e) => setArtistSearch(e.target.value)}
                  placeholder="Zoek artiest..."
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                />
                {artistSearch.trim() && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-cb-surface-light border border-cb-border">
                    {artists
                      .filter((a) => !selectedArtistIds.has(a.id) && a.name.toLowerCase().includes(artistSearch.toLowerCase()))
                      .slice(0, 8)
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { setSelectedArtistIds((prev) => new Set(prev).add(a.id)); setArtistSearch(''); }}
                          className="w-full text-left px-3 py-1.5 text-sm text-cb-text hover:bg-cb-surface cursor-pointer"
                        >
                          {a.name} {a.genre ? <span className="text-cb-text-muted">({a.genre})</span> : null}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !editing.name.trim()}
                className="flex-1 rounded-lg bg-cb-primary hover:bg-cb-primary-dark disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg bg-cb-surface-light hover:bg-cb-border px-4 py-2 text-sm text-cb-text-secondary transition-colors cursor-pointer"
              >
                Annuleren
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}

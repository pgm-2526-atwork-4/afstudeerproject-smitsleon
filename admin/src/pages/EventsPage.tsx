import { useCallback, useEffect, useState } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import type { DbEvent, DbVenue } from '../lib/types';

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
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
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


  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  function openNew() {
    setEditing({ ...EMPTY, id: crypto.randomUUID() });
    setSelectedArtistIds([]);
    setIsNew(true);
  }

  async function openEdit(ev: DbEvent) {
    setEditing({ ...ev });
    setIsNew(false);
    const { data } = await supabaseAdmin
      .from('event_artists')
      .select('artist_id')
      .eq('event_id', ev.id);
    setSelectedArtistIds((data ?? []).map((r: { artist_id: string }) => r.artist_id));
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);

    const row = {
      id: editing.id,
      name: editing.name.trim(),
      date: editing.date || null,
      time: editing.time || null,
      location_name: editing.location_name || null,
      venue_id: editing.venue_id || null,
      city: editing.city || null,
      image_url: editing.image_url || null,
      url: editing.url || null,
      latitude: editing.latitude,
      longitude: editing.longitude,
    };

    if (isNew) {
      await supabaseAdmin.from('events').insert(row);
    } else {
      await supabaseAdmin.from('events').update(row).eq('id', editing.id);
    }

    // Sync event_artists: delete all existing, re-insert selected
    await supabaseAdmin.from('event_artists').delete().eq('event_id', editing.id);
    if (selectedArtistIds.length > 0) {
      await supabaseAdmin.from('event_artists').insert(
        selectedArtistIds.map((artist_id) => ({ event_id: editing.id, artist_id }))
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
      <div>
        <label className="block text-xs text-cb-text-muted mb-1">{label}</label>
        <input
          type={opts?.type ?? 'text'}
          value={(editing?.[key] as string | number | null) ?? ''}
          onChange={(e) => setEditing((prev) => prev ? { ...prev, [key]: e.target.value || null } : prev)}
          placeholder={opts?.placeholder}
          className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <button onClick={openNew} className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer">
          + Toevoegen
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        placeholder="Zoek op naam, stad of venue..."
        className="w-full max-w-md rounded-lg bg-cb-surface border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50 mb-4"
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cb-primary border-t-transparent" />
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
                    <button onClick={() => openEdit(ev)} className="text-cb-primary hover:underline cursor-pointer text-xs">Bewerken</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-cb-error hover:underline cursor-pointer text-xs">Verwijderen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded-lg bg-cb-surface border border-cb-border px-3 py-1.5 text-sm text-cb-text-secondary hover:bg-cb-surface-light disabled:opacity-30 cursor-pointer transition-colors"
        >
          ← Vorige
        </button>
        <span className="text-sm text-cb-text-muted">Pagina {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={events.length < PAGE_SIZE}
          className="rounded-lg bg-cb-surface border border-cb-border px-3 py-1.5 text-sm text-cb-text-secondary hover:bg-cb-surface-light disabled:opacity-30 cursor-pointer transition-colors"
        >
          Volgende →
        </button>
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditing(null)}>
          <div className="bg-cb-surface border border-cb-border rounded-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    const v = venues.find((v) => v.id === e.target.value);
                    setEditing((prev) => prev ? {
                      ...prev,
                      venue_id: e.target.value || null,
                      location_name: v?.name ?? prev.location_name,
                      city: v?.city ?? prev.city,
                      latitude: v?.latitude ?? prev.latitude,
                      longitude: v?.longitude ?? prev.longitude,
                    } : prev);
                  }}
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                >
                  <option value="">— Selecteer venue —</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} {v.city ? `(${v.city})` : ''}</option>
                  ))}
                </select>
              </div>
              
              {field('Locatienaam', 'location_name', { placeholder: 'Bijv. Sportpaleis' })}
              {field('Stad', 'city', { placeholder: 'Bijv. Antwerpen' })}
              {field('Afbeelding URL', 'image_url', { placeholder: 'https://...' })}
              {field('Ticket URL', 'url', { placeholder: 'https://...' })}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cb-text-muted mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editing.latitude ?? ''}
                    onChange={(e) => setEditing((prev) => prev ? { ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null } : prev)}
                    className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cb-text-muted mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editing.longitude ?? ''}
                    onChange={(e) => setEditing((prev) => prev ? { ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null } : prev)}
                    className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                  />
                </div>
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
          </div>
        </div>
      )}
    </div>
  );
}

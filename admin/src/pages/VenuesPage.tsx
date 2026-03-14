import { useCallback, useEffect, useState } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import type { DbVenue } from '../lib/types';

const EMPTY: DbVenue = { id: '', name: '', city: null, address: null, image_url: null, latitude: null, longitude: null, created_at: '' };

export default function VenuesPage() {
  const [venues, setVenues] = useState<DbVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DbVenue | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from('venues')
      .select('*')
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setVenues((data ?? []) as DbVenue[]);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  function openNew() {
    setEditing({ ...EMPTY, id: crypto.randomUUID() });
    setIsNew(true);
  }

  function openEdit(venue: DbVenue) {
    setEditing({ ...venue });
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);

    const row = {
      id: editing.id,
      name: editing.name.trim(),
      city: editing.city || null,
      address: editing.address || null,
      image_url: editing.image_url || null,
      latitude: editing.latitude,
      longitude: editing.longitude,
    };

    if (isNew) {
      await supabaseAdmin.from('venues').insert(row);
    } else {
      await supabaseAdmin.from('venues').update(row).eq('id', editing.id);
    }

    setSaving(false);
    setEditing(null);
    fetchVenues();
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je deze venue wilt verwijderen?')) return;
    await supabaseAdmin.from('venues').delete().eq('id', id);
    fetchVenues();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Venues</h1>
        <button onClick={openNew} className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer">
          + Toevoegen
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        placeholder="Zoek op naam of stad..."
        className="w-full max-w-md rounded-lg bg-cb-surface border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50 mb-4"
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cb-primary border-t-transparent" />
        </div>
      ) : venues.length === 0 ? (
        <p className="text-sm text-cb-text-muted py-8 text-center">Geen venues gevonden.</p>
      ) : (
        <div className="bg-cb-surface border border-cb-border rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-cb-surface-light text-cb-text-secondary text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Stad</th>
                <th className="px-4 py-3">Adres</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cb-border">
              {venues.map((v) => (
                <tr key={v.id} className="hover:bg-cb-surface-light/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{v.city ?? '—'}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{v.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(v)} className="text-cb-primary hover:underline cursor-pointer text-xs">Bewerken</button>
                    <button onClick={() => handleDelete(v.id)} className="text-cb-error hover:underline cursor-pointer text-xs">Verwijderen</button>
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
          disabled={venues.length < PAGE_SIZE}
          className="rounded-lg bg-cb-surface border border-cb-border px-3 py-1.5 text-sm text-cb-text-secondary hover:bg-cb-surface-light disabled:opacity-30 cursor-pointer transition-colors"
        >
          Volgende →
        </button>
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditing(null)}>
          <div className="bg-cb-surface border border-cb-border rounded-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{isNew ? 'Venue toevoegen' : 'Venue bewerken'}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-cb-text-muted mb-1">Naam *</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="Venuenaam"
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-cb-text-muted mb-1">Stad</label>
                <input
                  type="text"
                  value={editing.city ?? ''}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, city: e.target.value || null } : prev)}
                  placeholder="Bijv. Antwerpen"
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-cb-text-muted mb-1">Adres</label>
                <input
                  type="text"
                  value={editing.address ?? ''}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, address: e.target.value || null } : prev)}
                  placeholder="Straat en nummer"
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-cb-text-muted mb-1">Afbeelding URL</label>
                <input
                  type="text"
                  value={editing.image_url ?? ''}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, image_url: e.target.value || null } : prev)}
                  placeholder="https://..."
                  className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
                />
              </div>
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

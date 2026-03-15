import { useCallback, useEffect, useState } from 'react';
import FormField from '../components/FormField';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
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
      <PageHeader
        title="Venues"
        action={
          <button onClick={openNew} className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer">
            + Toevoegen
          </button>
        }
      />

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        placeholder="Zoek op naam of stad..."
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
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

      <Pagination page={page} pageSize={PAGE_SIZE} count={venues.length} onPageChange={setPage} />

      {/* Edit/Create modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)}>
            <h2 className="text-lg font-semibold mb-4">{isNew ? 'Venue toevoegen' : 'Venue bewerken'}</h2>

            <div className="space-y-3">
              <FormField
                label="Naam *"
                value={editing.name}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, name: v } : prev)}
                placeholder="Venuenaam"
              />
              <FormField
                label="Stad"
                value={editing.city ?? ''}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, city: v || null } : prev)}
                placeholder="Bijv. Antwerpen"
              />
              <FormField
                label="Adres"
                value={editing.address ?? ''}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, address: v || null } : prev)}
                placeholder="Straat en nummer"
              />
              <FormField
                label="Afbeelding URL"
                value={editing.image_url ?? ''}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, image_url: v || null } : prev)}
                placeholder="https://..."
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Latitude"
                  type="number"
                  step="any"
                  value={editing.latitude ?? ''}
                  onChange={(v) => setEditing((prev) => prev ? { ...prev, latitude: v ? parseFloat(v) : null } : prev)}
                />
                <FormField
                  label="Longitude"
                  type="number"
                  step="any"
                  value={editing.longitude ?? ''}
                  onChange={(v) => setEditing((prev) => prev ? { ...prev, longitude: v ? parseFloat(v) : null } : prev)}
                />
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

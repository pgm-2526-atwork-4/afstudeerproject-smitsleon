import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import VenueFormFields from '../components/VenueFormFields';
import { supabaseAdmin } from '../lib/supabase';
import type { DbVenue } from '../lib/types';

const EMPTY: DbVenue = { id: '', name: '', city: null, address: null, image_url: null, latitude: null, longitude: null, created_at: '' };

export default function VenuesPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<DbVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<DbVenue | null>(null);
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
    setCreating({ ...EMPTY, id: crypto.randomUUID() });
  }

  async function handleCreate() {
    if (!creating || !creating.name.trim()) return;
    setSaving(true);

    await supabaseAdmin.from('venues').insert({
      id: creating.id,
      name: creating.name.trim(),
      city: creating.city || null,
      address: creating.address || null,
      image_url: creating.image_url || null,
      latitude: creating.latitude,
      longitude: creating.longitude,
    });

    setSaving(false);
    setCreating(null);
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
                <tr
                  key={v.id}
                  onClick={() => navigate(`/venues/${v.id}`)}
                  className="hover:bg-cb-surface-light/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{v.city ?? '—'}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{v.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                      className="text-cb-error hover:underline cursor-pointer text-xs"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} count={venues.length} onPageChange={setPage} />

      {/* Create modal */}
      {creating && (
        <Modal onClose={() => setCreating(null)}>
            <h2 className="text-lg font-semibold mb-4">Venue toevoegen</h2>

            <div className="space-y-3">
              <VenueFormFields venue={creating} onChange={(v) => setCreating(v)} />
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreate}
                disabled={saving || !creating.name.trim()}
                className="flex-1 rounded-lg bg-cb-primary hover:bg-cb-primary-dark disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                {saving ? 'Toevoegen...' : 'Toevoegen'}
              </button>
              <button
                onClick={() => setCreating(null)}
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

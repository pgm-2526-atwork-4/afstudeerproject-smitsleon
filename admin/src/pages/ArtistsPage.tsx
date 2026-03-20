import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArtistFormFields from '../components/ArtistFormFields';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import { supabaseAdmin } from '../lib/supabase';
import type { DbArtist } from '../lib/types';

const EMPTY: DbArtist = { id: '', name: '', image_url: null, genre: null, created_at: '' };

export default function ArtistsPage() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<DbArtist | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from('artists')
      .select('*')
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,genre.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setArtists((data ?? []) as DbArtist[]);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  function openNew() {
    setCreating({ ...EMPTY, id: crypto.randomUUID() });
  }

  async function handleCreate() {
    if (!creating || !creating.name.trim()) return;
    setSaving(true);

    await supabaseAdmin.from('artists').insert({
      id: creating.id,
      name: creating.name.trim(),
      image_url: creating.image_url || null,
      genre: creating.genre || null,
    });

    setSaving(false);
    setCreating(null);
    fetchArtists();
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je deze artiest wilt verwijderen?')) return;
    await supabaseAdmin.from('artists').delete().eq('id', id);
    fetchArtists();
  }

  return (
    <div>
      <PageHeader
        title="Artiesten"
        action={
          <button onClick={openNew} className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer">
            + Toevoegen
          </button>
        }
      />

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        placeholder="Zoek op naam of genre..."
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : artists.length === 0 ? (
        <p className="text-sm text-cb-text-muted py-8 text-center">Geen artiesten gevonden.</p>
      ) : (
        <div className="bg-cb-surface border border-cb-border rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-cb-surface-light text-cb-text-secondary text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Afbeelding</th>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Genre</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cb-border">
              {artists.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/artists/${a.id}`)}
                  className="hover:bg-cb-surface-light/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-cb-surface-light flex items-center justify-center text-xs text-cb-text-muted">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-cb-text-secondary">{a.genre ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
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

      <Pagination page={page} pageSize={PAGE_SIZE} count={artists.length} onPageChange={setPage} />

      {/* Create modal */}
      {creating && (
        <Modal onClose={() => setCreating(null)}>
            <h2 className="text-lg font-semibold mb-4">Artiest toevoegen</h2>

            <div className="space-y-3">
              <ArtistFormFields artist={creating} onChange={(a) => setCreating(a)} />
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

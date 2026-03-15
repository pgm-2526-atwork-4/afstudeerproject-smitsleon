import { useCallback, useEffect, useState } from 'react';
import FormField from '../components/FormField';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Spinner from '../components/Spinner';
import { supabaseAdmin } from '../lib/supabase';
import type { DbArtist } from '../lib/types';

const EMPTY: DbArtist = { id: '', name: '', image_url: null, genre: null, created_at: '' };

export default function ArtistsPage() {
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DbArtist | null>(null);
  const [isNew, setIsNew] = useState(false);
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
    setEditing({ ...EMPTY, id: crypto.randomUUID() });
    setIsNew(true);
  }

  function openEdit(artist: DbArtist) {
    setEditing({ ...artist });
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);

    const row = {
      id: editing.id,
      name: editing.name.trim(),
      image_url: editing.image_url || null,
      genre: editing.genre || null,
    };

    if (isNew) {
      await supabaseAdmin.from('artists').insert(row);
    } else {
      await supabaseAdmin.from('artists').update(row).eq('id', editing.id);
    }

    setSaving(false);
    setEditing(null);
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
                <tr key={a.id} className="hover:bg-cb-surface-light/50 transition-colors">
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
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(a)} className="text-cb-primary hover:underline cursor-pointer text-xs">Bewerken</button>
                    <button onClick={() => handleDelete(a.id)} className="text-cb-error hover:underline cursor-pointer text-xs">Verwijderen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} count={artists.length} onPageChange={setPage} />

      {/* Edit/Create modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)}>
            <h2 className="text-lg font-semibold mb-4">{isNew ? 'Artiest toevoegen' : 'Artiest bewerken'}</h2>

            <div className="space-y-3">
              <FormField
                label="Naam *"
                value={editing.name}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, name: v } : prev)}
                placeholder="Artiestennaam"
              />
              <FormField
                label="Genre"
                value={editing.genre ?? ''}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, genre: v || null } : prev)}
                placeholder="Bijv. Rock, Pop, Hip-hop"
              />
              <FormField
                label="Afbeelding URL"
                value={editing.image_url ?? ''}
                onChange={(v) => setEditing((prev) => prev ? { ...prev, image_url: v || null } : prev)}
                placeholder="https://..."
              />

              {/* Image preview */}
              {editing.image_url && (
                <img src={editing.image_url} alt="Preview" className="h-20 w-20 rounded-full object-cover mx-auto" />
              )}
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

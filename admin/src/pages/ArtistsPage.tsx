import ArtistFormFields from '../components/ArtistFormFields';
import EntityListPage, { type EntityListConfig } from '../components/EntityListPage';
import type { DbArtist } from '../lib/types';

const config: EntityListConfig<DbArtist> = {
  table: 'artists',
  title: 'Artiesten',
  entityLabel: 'deze artiest',
  searchPlaceholder: 'Zoek op naam of genre...',
  searchFilterOr: (q) => `name.ilike.%${q}%,genre.ilike.%${q}%`,
  emptyEntity: () => ({ id: crypto.randomUUID(), name: '', image_url: null, genre: null, created_at: '' }),
  insertPayload: (a) => ({ id: a.id, name: a.name.trim(), image_url: a.image_url || null, genre: a.genre || null }),
  detailRoute: '/artists',
  columns: [
    {
      header: 'Afbeelding',
      render: (a) =>
        a.image_url ? (
          <img src={a.image_url} alt={a.name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-cb-surface-light flex items-center justify-center text-xs text-cb-text-muted">
            {a.name.charAt(0).toUpperCase()}
          </div>
        ),
    },
    { header: 'Naam', render: (a) => <span className="font-medium">{a.name}</span> },
    { header: 'Genre', render: (a) => <span className="text-cb-text-secondary">{a.genre ?? '—'}</span> },
  ],
  renderForm: (artist, onChange) => <ArtistFormFields artist={artist} onChange={onChange} />,
};

export default function ArtistsPage() {
  return <EntityListPage config={config} />;
}

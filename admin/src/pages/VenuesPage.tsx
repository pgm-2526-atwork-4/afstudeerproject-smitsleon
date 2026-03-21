import EntityListPage, { type EntityListConfig } from '../components/EntityListPage';
import VenueFormFields from '../components/VenueFormFields';
import type { DbVenue } from '../lib/types';

const config: EntityListConfig<DbVenue> = {
  table: 'venues',
  title: 'Venues',
  entityLabel: 'deze venue',
  searchPlaceholder: 'Zoek op naam of stad...',
  searchFilterOr: (q) => `name.ilike.%${q}%,city.ilike.%${q}%`,
  emptyEntity: () => ({ id: crypto.randomUUID(), name: '', city: null, address: null, image_url: null, latitude: null, longitude: null, created_at: '' }),
  insertPayload: (v) => ({ id: v.id, name: v.name.trim(), city: v.city || null, address: v.address || null, image_url: v.image_url || null, latitude: v.latitude, longitude: v.longitude }),
  detailRoute: '/venues',
  columns: [
    { header: 'Naam', render: (v) => <span className="font-medium">{v.name}</span> },
    { header: 'Stad', render: (v) => <span className="text-cb-text-secondary">{v.city ?? '—'}</span> },
    { header: 'Adres', render: (v) => <span className="text-cb-text-secondary">{v.address ?? '—'}</span> },
  ],
  renderForm: (venue, onChange) => <VenueFormFields venue={venue} onChange={onChange} />,
};

export default function VenuesPage() {
  return <EntityListPage config={config} />;
}

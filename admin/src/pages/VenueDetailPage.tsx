import EntityDetailPage, { type EntityDetailConfig } from '../components/EntityDetailPage';
import VenueFormFields from '../components/VenueFormFields';
import { supabaseAdmin } from '../lib/supabase';
import type { DbEvent, DbVenue } from '../lib/types';

const config: EntityDetailConfig<DbVenue> = {
  table: 'venues',
  entityLabel: 'Venue',
  listRoute: '/venues',
  listLabel: 'Venues',
  updatePayload: (v) => ({ name: v.name.trim(), city: v.city || null, address: v.address || null, image_url: v.image_url || null, latitude: v.latitude, longitude: v.longitude }),
  fetchEvents: async (id) => {
    const { data } = await supabaseAdmin.from('events').select('*').eq('venue_id', id);
    return (data ?? []) as DbEvent[];
  },
  newEventDefaults: (id) => ({ venue_id: id }),
  lockedField: 'lockedVenueId',
  renderForm: (venue, onChange) => <VenueFormFields venue={venue} onChange={onChange} />,
};

export default function VenueDetailPage() {
  return <EntityDetailPage config={config} />;
}

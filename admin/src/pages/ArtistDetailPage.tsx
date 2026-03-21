import ArtistFormFields from '../components/ArtistFormFields';
import EntityDetailPage, { type EntityDetailConfig } from '../components/EntityDetailPage';
import { supabaseAdmin } from '../lib/supabase';
import type { DbArtist, DbEvent } from '../lib/types';

const config: EntityDetailConfig<DbArtist> = {
  table: 'artists',
  entityLabel: 'Artiest',
  listRoute: '/artists',
  listLabel: 'Artiesten',
  updatePayload: (a) => ({ name: a.name.trim(), image_url: a.image_url || null, genre: a.genre || null }),
  fetchEvents: async (id) => {
    const { data: links } = await supabaseAdmin
      .from('event_artists')
      .select('event_id')
      .eq('artist_id', id);
    const eventIds = (links ?? []).map((l: { event_id: string }) => l.event_id);
    if (eventIds.length === 0) return [];
    const { data } = await supabaseAdmin.from('events').select('*').in('id', eventIds);
    return (data ?? []) as DbEvent[];
  },
  newEventDefaults: () => ({}),
  lockedField: 'lockedArtistId',
  renderForm: (artist, onChange) => <ArtistFormFields artist={artist} onChange={onChange} />,
};

export default function ArtistDetailPage() {
  return <EntityDetailPage config={config} />;
}

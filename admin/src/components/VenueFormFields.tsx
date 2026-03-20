import type { DbVenue } from '../lib/types';
import FormField from './FormField';

interface Props {
  venue: DbVenue;
  onChange: (venue: DbVenue) => void;
}

export default function VenueFormFields({ venue, onChange }: Props) {
  return (
    <>
      <FormField
        label="Naam *"
        value={venue.name}
        onChange={(v) => onChange({ ...venue, name: v })}
        placeholder="Venuenaam"
      />
      <FormField
        label="Stad"
        value={venue.city ?? ''}
        onChange={(v) => onChange({ ...venue, city: v || null })}
        placeholder="Bijv. Antwerpen"
      />
      <FormField
        label="Adres"
        value={venue.address ?? ''}
        onChange={(v) => onChange({ ...venue, address: v || null })}
        placeholder="Straat en nummer"
      />
      <FormField
        label="Afbeelding URL"
        value={venue.image_url ?? ''}
        onChange={(v) => onChange({ ...venue, image_url: v || null })}
        placeholder="https://..."
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Latitude"
          type="number"
          step="any"
          value={venue.latitude ?? ''}
          onChange={(v) => onChange({ ...venue, latitude: v ? parseFloat(v) : null })}
        />
        <FormField
          label="Longitude"
          type="number"
          step="any"
          value={venue.longitude ?? ''}
          onChange={(v) => onChange({ ...venue, longitude: v ? parseFloat(v) : null })}
        />
      </div>
    </>
  );
}

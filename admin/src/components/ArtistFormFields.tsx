import type { DbArtist } from '../lib/types';
import FormField from './FormField';
import ImageUpload from './ImageUpload';

interface Props {
  artist: DbArtist;
  onChange: (artist: DbArtist) => void;
}

export default function ArtistFormFields({ artist, onChange }: Props) {
  return (
    <>
      <FormField
        label="Naam *"
        value={artist.name}
        onChange={(v) => onChange({ ...artist, name: v })}
        placeholder="Artiestennaam"
      />
      <FormField
        label="Genre"
        value={artist.genre ?? ''}
        onChange={(v) => onChange({ ...artist, genre: v || null })}
        placeholder="Bijv. Rock, Pop, Hip-hop"
      />
      <ImageUpload
        value={artist.image_url}
        folder="artists"
        onChange={(url) => onChange({ ...artist, image_url: url })}
      />
    </>
  );
}

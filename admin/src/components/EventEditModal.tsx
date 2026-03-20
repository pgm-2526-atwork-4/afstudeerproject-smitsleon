import { useCallback, useEffect, useState } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import type { DbArtist, DbEvent, DbVenue } from '../lib/types';
import FormField from './FormField';
import ImageUpload from './ImageUpload';
import Modal from './Modal';

interface Props {
  event: DbEvent;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
  lockedVenueId?: string;
  lockedArtistId?: string;
}

export default function EventEditModal({ event, isNew, onClose, onSaved, lockedVenueId, lockedArtistId }: Props) {
  const [editing, setEditing] = useState<DbEvent>({ ...event });
  const [venues, setVenues] = useState<DbVenue[]>([]);
  const [artists, setArtists] = useState<DbArtist[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<string>>(new Set());
  const [artistSearch, setArtistSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabaseAdmin.from('venues').select('*').order('name').then(({ data }) => {
      setVenues((data ?? []) as DbVenue[]);
    });
    supabaseAdmin.from('artists').select('*').order('name').then(({ data }) => {
      setArtists((data ?? []) as DbArtist[]);
    });
  }, []);

  const loadLinkedArtists = useCallback(async () => {
    if (isNew) {
      if (lockedArtistId) setSelectedArtistIds(new Set([lockedArtistId]));
      return;
    }
    const { data } = await supabaseAdmin
      .from('event_artists')
      .select('artist_id')
      .eq('event_id', event.id);
    setSelectedArtistIds(new Set((data ?? []).map((r: { artist_id: string }) => r.artist_id)));
  }, [event.id, isNew, lockedArtistId]);

  useEffect(() => { loadLinkedArtists(); }, [loadLinkedArtists]);

  async function handleSave() {
    if (!editing.name.trim()) return;
    setSaving(true);

    const venue = venues.find((v) => v.id === editing.venue_id);

    const row = {
      id: editing.id,
      name: editing.name.trim(),
      date: editing.date || null,
      time: editing.time || null,
      venue_id: editing.venue_id || null,
      location_name: venue?.name ?? null,
      city: venue?.city ?? null,
      latitude: venue?.latitude ?? null,
      longitude: venue?.longitude ?? null,
      image_url: editing.image_url || null,
      url: editing.url || null,
    };

    if (isNew) {
      await supabaseAdmin.from('events').insert(row);
    } else {
      await supabaseAdmin.from('events').update(row).eq('id', editing.id);
    }

    await supabaseAdmin.from('event_artists').delete().eq('event_id', editing.id);
    if (selectedArtistIds.size > 0) {
      await supabaseAdmin.from('event_artists').insert(
        [...selectedArtistIds].map((artist_id) => ({ event_id: editing.id, artist_id }))
      );
    }

    setSaving(false);
    onSaved();
  }

  function field(label: string, key: keyof DbEvent, opts?: { type?: string; placeholder?: string }) {
    return (
      <FormField
        label={label}
        type={opts?.type}
        value={(editing[key] as string | number | null) ?? ''}
        onChange={(v) => setEditing((prev) => ({ ...prev, [key]: v || null }))}
        placeholder={opts?.placeholder}
      />
    );
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-lg font-semibold mb-4">{isNew ? 'Event toevoegen' : 'Event bewerken'}</h2>

      <div className="space-y-3">
        {field('Naam *', 'name', { placeholder: 'Evenementnaam' })}

        <div className="grid grid-cols-2 gap-3">
          {field('Datum', 'date', { type: 'date' })}
          {field('Tijd', 'time', { placeholder: '20:00' })}
        </div>

        {/* Venue dropdown */}
        <div>
          <label className="block text-xs text-cb-text-muted mb-1">Venue</label>
          <select
            value={editing.venue_id ?? ''}
            onChange={(e) => setEditing((prev) => ({ ...prev, venue_id: e.target.value || null }))}
            disabled={!!lockedVenueId}
            className={`w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text focus:outline-none focus:ring-2 focus:ring-cb-primary/50${lockedVenueId ? ' opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">— Selecteer venue —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name} {v.city ? `(${v.city})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Stad (read-only) */}
        {(() => {
          const selectedVenue = venues.find((v) => v.id === editing.venue_id);
          return selectedVenue?.city ? (
            <div>
              <label className="block text-xs text-cb-text-muted mb-1">Stad</label>
              <p className="rounded-lg bg-cb-surface-light/50 border border-cb-border px-3 py-2 text-sm text-cb-text-secondary">
                {selectedVenue.city}
              </p>
            </div>
          ) : null;
        })()}

        <ImageUpload
          value={editing.image_url}
          folder="events"
          onChange={(url) => setEditing((prev) => ({ ...prev, image_url: url }))}
        />
        {field('Ticket URL', 'url', { placeholder: 'https://...' })}

        {/* Artiesten */}
        <div>
          <label className="block text-xs text-cb-text-muted mb-1">Artiesten</label>
          {selectedArtistIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[...selectedArtistIds].map((aid) => {
                const a = artists.find((x) => x.id === aid);
                return (
                  <span key={aid} className="inline-flex items-center gap-1 rounded-full bg-cb-primary/15 border border-cb-primary/30 px-2.5 py-1 text-xs text-cb-primary">
                    {a?.name ?? aid}
                    {aid !== lockedArtistId && (
                      <button
                        type="button"
                        onClick={() => setSelectedArtistIds((prev) => { const n = new Set(prev); n.delete(aid); return n; })}
                        className="hover:text-cb-error cursor-pointer"
                      >×</button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          <input
            type="text"
            value={artistSearch}
            onChange={(e) => setArtistSearch(e.target.value)}
            placeholder="Zoek artiest..."
            className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50"
          />
          {artistSearch.trim() && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-cb-surface-light border border-cb-border">
              {artists
                .filter((a) => !selectedArtistIds.has(a.id) && a.name.toLowerCase().includes(artistSearch.toLowerCase()))
                .slice(0, 8)
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setSelectedArtistIds((prev) => new Set(prev).add(a.id)); setArtistSearch(''); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-cb-text hover:bg-cb-surface cursor-pointer"
                  >
                    {a.name} {a.genre ? <span className="text-cb-text-muted">({a.genre})</span> : null}
                  </button>
                ))}
            </div>
          )}
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
          onClick={onClose}
          className="rounded-lg bg-cb-surface-light hover:bg-cb-border px-4 py-2 text-sm text-cb-text-secondary transition-colors cursor-pointer"
        >
          Annuleren
        </button>
      </div>
    </Modal>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArtistFormFields from '../components/ArtistFormFields';
import EventEditModal from '../components/EventEditModal';
import EventList from '../components/EventList';
import Spinner from '../components/Spinner';
import { supabaseAdmin } from '../lib/supabase';
import type { DbArtist, DbEvent } from '../lib/types';

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<DbArtist | null>(null);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ event: DbEvent; isNew: boolean } | null>(null);

  const now = new Date();
  const upcomingEvents = events.filter((e) => !e.date || new Date(e.date) >= now);

  const fetchArtist = useCallback(async () => {
    if (!id) return;
    const { data } = await supabaseAdmin.from('artists').select('*').eq('id', id).single();
    setArtist(data as DbArtist | null);
    setLoading(false);
  }, [id]);

  const fetchEvents = useCallback(async () => {
    if (!id) return;
    setEventsLoading(true);
    const { data: links } = await supabaseAdmin
      .from('event_artists')
      .select('event_id')
      .eq('artist_id', id);
    const eventIds = (links ?? []).map((l: { event_id: string }) => l.event_id);

    if (eventIds.length === 0) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    const { data } = await supabaseAdmin
      .from('events')
      .select('*')
      .in('id', eventIds);
    setEvents((data ?? []) as DbEvent[]);
    setEventsLoading(false);
  }, [id]);

  useEffect(() => { fetchArtist(); }, [fetchArtist]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleSave() {
    if (!artist || !artist.name.trim()) return;
    setSaving(true);

    await supabaseAdmin.from('artists').update({
      name: artist.name.trim(),
      image_url: artist.image_url || null,
      genre: artist.genre || null,
    }).eq('id', artist.id);

    setSaving(false);
  }

  async function handleDelete() {
    if (!artist || !confirm('Weet je zeker dat je deze artiest wilt verwijderen?')) return;
    await supabaseAdmin.from('artists').delete().eq('id', artist.id);
    navigate('/artists');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!artist) {
    return <p className="text-sm text-cb-text-muted py-8 text-center">Artiest niet gevonden.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/artists')}
          className="text-cb-text-secondary hover:text-cb-text transition-colors cursor-pointer text-sm"
        >
          ← Artiesten
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-1">
          <div className="bg-cb-surface border border-cb-border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold">Artiest bewerken</h2>

            <div className="space-y-3">
              <ArtistFormFields artist={artist} onChange={(a) => setArtist(a)} />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !artist.name.trim()}
                className="flex-1 rounded-lg bg-cb-primary hover:bg-cb-primary-dark disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-cb-error/15 text-cb-error hover:bg-cb-error/25 px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>

        {/* Events overview */}
        <div className="lg:col-span-2">
          <div className="bg-cb-surface border border-cb-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Events ({upcomingEvents.length})</h2>
              <button
                onClick={() => setEditingEvent({ event: { id: crypto.randomUUID(), name: '', date: '', location_name: '', image_url: '', venue_id: '', city: '', time: '', url: '', latitude: null, longitude: null, created_at: '' }, isNew: true })}
                className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-3 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                + Event
              </button>
            </div>
            <EventList events={upcomingEvents} loading={eventsLoading} onEdit={(ev) => setEditingEvent({ event: ev, isNew: false })} />
          </div>
        </div>
      </div>

      {editingEvent && (
        <EventEditModal
          event={editingEvent.event}
          isNew={editingEvent.isNew}
          lockedArtistId={id}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); fetchEvents(); }}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventEditModal from '../components/EventEditModal';
import EventList from '../components/EventList';
import Spinner from '../components/Spinner';
import VenueFormFields from '../components/VenueFormFields';
import { supabaseAdmin } from '../lib/supabase';
import type { DbEvent, DbVenue } from '../lib/types';

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<DbVenue | null>(null);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ event: DbEvent; isNew: boolean } | null>(null);

  const now = new Date();
  const upcomingEvents = events.filter((e) => !e.date || new Date(e.date) >= now);

  const fetchVenue = useCallback(async () => {
    if (!id) return;
    const { data } = await supabaseAdmin.from('venues').select('*').eq('id', id).single();
    setVenue(data as DbVenue | null);
    setLoading(false);
  }, [id]);

  const fetchEvents = useCallback(async () => {
    if (!id) return;
    setEventsLoading(true);
    const { data } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('venue_id', id);
    setEvents((data ?? []) as DbEvent[]);
    setEventsLoading(false);
  }, [id]);

  useEffect(() => { fetchVenue(); }, [fetchVenue]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleSave() {
    if (!venue || !venue.name.trim()) return;
    setSaving(true);

    await supabaseAdmin.from('venues').update({
      name: venue.name.trim(),
      city: venue.city || null,
      address: venue.address || null,
      image_url: venue.image_url || null,
      latitude: venue.latitude,
      longitude: venue.longitude,
    }).eq('id', venue.id);

    setSaving(false);
  }

  async function handleDelete() {
    if (!venue || !confirm('Weet je zeker dat je deze venue wilt verwijderen?')) return;
    await supabaseAdmin.from('venues').delete().eq('id', venue.id);
    navigate('/venues');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!venue) {
    return <p className="text-sm text-cb-text-muted py-8 text-center">Venue niet gevonden.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/venues')}
          className="text-cb-text-secondary hover:text-cb-text transition-colors cursor-pointer text-sm"
        >
          ← Venues
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-1">
          <div className="bg-cb-surface border border-cb-border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold">Venue bewerken</h2>

            <div className="space-y-3">
              <VenueFormFields venue={venue} onChange={(v) => setVenue(v)} />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !venue.name.trim()}
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
                onClick={() => setEditingEvent({ event: { id: crypto.randomUUID(), name: '', date: '', location_name: '', image_url: '', venue_id: id!, city: '', time: '', url: '', latitude: null, longitude: null, created_at: '' }, isNew: true })}
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
          lockedVenueId={id}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); fetchEvents(); }}
        />
      )}
    </div>
  );
}

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabaseAdmin } from '../lib/supabase';
import type { DbEvent } from '../lib/types';
import EventEditModal from './EventEditModal';
import EventList from './EventList';
import Spinner from './Spinner';

const EMPTY_EVENT: DbEvent = {
  id: '', name: '', date: '', location_name: '', image_url: '',
  venue_id: '', city: '', time: '', url: '', latitude: null, longitude: null, created_at: '',
};

export interface EntityDetailConfig<T extends { id: string; name: string }> {
  table: string;
  entityLabel: string;
  listRoute: string;
  listLabel: string;
  updatePayload: (entity: T) => Record<string, unknown>;
  fetchEvents: (id: string) => Promise<DbEvent[]>;
  newEventDefaults: (id: string) => Partial<DbEvent>;
  lockedField: 'lockedArtistId' | 'lockedVenueId';
  renderForm: (entity: T, onChange: (e: T) => void) => ReactNode;
}

export default function EntityDetailPage<T extends { id: string; name: string }>({
  config,
}: {
  config: EntityDetailConfig<T>;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<T | null>(null);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ event: DbEvent; isNew: boolean } | null>(null);

  const now = new Date();
  const upcomingEvents = events.filter((e) => !e.date || new Date(e.date) >= now);

  const fetchEntity = useCallback(async () => {
    if (!id) return;
    const { data } = await supabaseAdmin.from(config.table).select('*').eq('id', id).single();
    setEntity(data as T | null);
    setLoading(false);
  }, [id, config]);

  const loadEvents = useCallback(async () => {
    if (!id) return;
    setEventsLoading(true);
    const evts = await config.fetchEvents(id);
    setEvents(evts);
    setEventsLoading(false);
  }, [id, config]);

  useEffect(() => { fetchEntity(); }, [fetchEntity]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleSave() {
    if (!entity || !entity.name.trim()) return;
    setSaving(true);
    await supabaseAdmin.from(config.table).update(config.updatePayload(entity)).eq('id', entity.id);
    setSaving(false);
  }

  async function handleDelete() {
    if (!entity || !confirm(`Weet je zeker dat je ${config.entityLabel.toLowerCase()} wilt verwijderen?`)) return;
    await supabaseAdmin.from(config.table).delete().eq('id', entity.id);
    navigate(config.listRoute);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!entity) {
    return <p className="text-sm text-cb-text-muted py-8 text-center">{config.entityLabel} niet gevonden.</p>;
  }

  const newEvent: DbEvent = { ...EMPTY_EVENT, id: crypto.randomUUID(), ...config.newEventDefaults(id!) };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(config.listRoute)}
          className="text-cb-text-secondary hover:text-cb-text transition-colors cursor-pointer text-sm"
        >
          ← {config.listLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-cb-surface border border-cb-border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold">{config.entityLabel} bewerken</h2>

            <div className="space-y-3">
              {config.renderForm(entity, (e) => setEntity(e))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !entity.name.trim()}
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

        <div className="lg:col-span-2">
          <div className="bg-cb-surface border border-cb-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Events ({upcomingEvents.length})</h2>
              <button
                onClick={() => setEditingEvent({ event: newEvent, isNew: true })}
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
          {...{ [config.lockedField]: id }}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); loadEvents(); }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { REASON_LABELS, STATUS_COLORS } from '../lib/constants';
import { supabaseAdmin } from '../lib/supabase';
import type { DbReport, DbUser, ReportStatus } from '../lib/types';
import Modal from './Modal';

type ReportRow = DbReport & { reporter: DbUser; reported: DbUser };

interface Props {
  report: ReportRow;
  reportedEmail: string | null;
  adminId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ReportDetailModal({ report, reportedEmail, adminId, onClose, onUpdated }: Props) {
  const [adminNotes, setAdminNotes] = useState(report.admin_notes ?? '');
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus: ReportStatus) {
    setSaving(true);
    await supabaseAdmin
      .from('reports')
      .update({
        status: newStatus,
        admin_notes: adminNotes || null,
        resolved_by: newStatus === 'resolved' || newStatus === 'dismissed' ? adminId : report.resolved_by,
        resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date().toISOString() : report.resolved_at,
      })
      .eq('id', report.id);
    setSaving(false);
    onClose();
    onUpdated();
  }

  async function toggleBlock() {
    setSaving(true);
    const isBlocked = !!report.reported?.blocked_at;
    await supabaseAdmin
      .from('users')
      .update({ blocked_at: isBlocked ? null : new Date().toISOString() })
      .eq('id', report.reported_user_id);
    setSaving(false);
    onClose();
    onUpdated();
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Report detail</h2>

        {/* Users */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-cb-surface-light rounded-lg p-3">
            <p className="text-xs text-cb-text-muted mb-1">Reporter</p>
            <p className="text-sm font-medium">{report.reporter?.first_name} {report.reporter?.last_name}</p>
            <p className="text-xs text-cb-text-muted">{report.reporter?.city ?? 'Geen stad'}</p>
          </div>
          <div className="bg-cb-surface-light rounded-lg p-3">
            <p className="text-xs text-cb-text-muted mb-1">Gerapporteerd</p>
            <p className="text-sm font-medium">
              {report.reported?.first_name} {report.reported?.last_name}
              {report.reported?.blocked_at && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400">BLOCKED</span>
              )}
            </p>
            <p className="text-xs text-cb-text-muted">{reportedEmail ?? '...'}</p>
            <p className="text-xs text-cb-text-muted">{report.reported?.city ?? 'Geen stad'}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-cb-text-secondary">Reden</span>
            <span>{REASON_LABELS[report.reason]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cb-text-secondary">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}>
              {report.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cb-text-secondary">Datum</span>
            <span>{new Date(report.created_at).toLocaleString('nl-BE')}</span>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <div>
            <p className="text-xs text-cb-text-muted mb-1">Beschrijving</p>
            <p className="text-sm bg-cb-surface-light rounded-lg p-3">{report.description}</p>
          </div>
        )}

        {/* Admin notes */}
        <div>
          <label className="block text-xs text-cb-text-muted mb-1">Admin notities</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-cb-surface-light border border-cb-border px-3 py-2 text-sm text-cb-text placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-primary/50 resize-none"
            placeholder="Notities over deze report..."
          />
        </div>

        {/* Report actions */}
        <div className="flex gap-2 pt-2">
          {report.status !== 'resolved' && (
            <button
              onClick={() => updateStatus('resolved')}
              disabled={saving}
              className="flex-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Oplossen
            </button>
          )}
          {report.status !== 'dismissed' && (
            <button
              onClick={() => updateStatus('dismissed')}
              disabled={saving}
              className="flex-1 rounded-lg bg-cb-text-muted/15 text-cb-text-muted hover:bg-cb-text-muted/25 px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Afwijzen
            </button>
          )}
        </div>

        {/* Block / unblock user */}
        <div className="border-t border-cb-border pt-3">
          <p className="text-xs text-cb-text-muted mb-2">Account acties</p>
          <button
            onClick={toggleBlock}
            disabled={saving}
            className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              report.reported?.blocked_at
                ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            }`}
          >
            {report.reported?.blocked_at ? 'Gebruiker deblokkeren' : 'Gebruiker blokkeren'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-xs text-cb-text-muted hover:text-cb-text transition-colors cursor-pointer pt-1"
        >
          Sluiten
        </button>
      </div>
    </Modal>
  );
}

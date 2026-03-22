import { useCallback, useEffect, useState } from 'react';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { REASON_LABELS, STATUS_COLORS } from '../lib/constants';
import { supabaseAdmin } from '../lib/supabase';
import type { DbReport, DbUser, ReportStatus } from '../lib/types';

type ReportRow = DbReport & { reporter: DbUser; reported: DbUser };

type BlockedRow = DbUser & { email?: string; reports: (DbReport & { reporter: DbUser })[] };

const STATUS_OPTIONS: { value: ReportStatus | 'all' | 'blocked'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'blocked', label: 'Blocked' },
];

export default function ReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | 'all' | 'blocked'>('all');
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportedEmail, setReportedEmail] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedRow[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  const fetchReports = useCallback(async () => {
    if (filter === 'blocked') return;
    setLoading(true);
    let query = supabaseAdmin
      .from('reports')
      .select('*, reporter:users!reports_reporter_id_fkey(*), reported:users!reports_reported_user_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data } = await query;
    setReports(
      (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as unknown as DbReport),
        reporter: r.reporter as unknown as DbUser,
        reported: r.reported as unknown as DbUser,
      })),
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const fetchBlockedUsers = useCallback(async () => {
    setLoadingBlocked(true);
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .not('blocked_at', 'is', null)
      .order('blocked_at', { ascending: false });

    const users = (data ?? []) as DbUser[];

    const withDetails: BlockedRow[] = await Promise.all(
      users.map(async (u) => {
        const [authRes, reportsRes] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(u.id),
          supabaseAdmin
            .from('reports')
            .select('*, reporter:users!reports_reporter_id_fkey(*)')
            .eq('reported_user_id', u.id)
            .order('created_at', { ascending: false }),
        ]);
        return {
          ...u,
          email: authRes.data?.user?.email ?? undefined,
          reports: (reportsRes.data ?? []).map((r: Record<string, unknown>) => ({
            ...(r as unknown as DbReport),
            reporter: r.reporter as unknown as DbUser,
          })),
        };
      }),
    );

    setBlockedUsers(withDetails);
    setLoadingBlocked(false);
  }, []);

  useEffect(() => { fetchBlockedUsers(); }, [fetchBlockedUsers]);

  async function unblockUser(userId: string) {
    await supabaseAdmin.from('users').update({ blocked_at: null }).eq('id', userId);
    fetchBlockedUsers();
    fetchReports();
  }

  async function openDetail(report: ReportRow) {
    setSelected(report);
    setAdminNotes(report.admin_notes ?? '');
    setReportedEmail(null);
    // Fetch email from auth.users via the admin API
    const { data } = await supabaseAdmin.auth.admin.getUserById(report.reported_user_id);
    setReportedEmail(data?.user?.email ?? null);
  }

  async function toggleBlock() {
    if (!selected) return;
    setSaving(true);
    const isBlocked = !!selected.reported?.blocked_at;
    await supabaseAdmin
      .from('users')
      .update({ blocked_at: isBlocked ? null : new Date().toISOString() })
      .eq('id', selected.reported_user_id);
    setSaving(false);
    setSelected(null);
    fetchReports();
    fetchBlockedUsers();
  }

  async function updateStatus(newStatus: ReportStatus) {
    if (!selected || !profile) return;
    setSaving(true);
    await supabaseAdmin
      .from('reports')
      .update({
        status: newStatus,
        admin_notes: adminNotes || null,
        resolved_by: newStatus === 'resolved' || newStatus === 'dismissed' ? profile.id : selected.resolved_by,
        resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date().toISOString() : selected.resolved_at,
      })
      .eq('id', selected.id);
    setSaving(false);
    setSelected(null);
    fetchReports();
  }

  return (
    <div>
      <PageHeader title="Reports" />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === opt.value
                ? 'bg-cb-primary/15 text-cb-primary'
                : 'bg-cb-surface text-cb-text-secondary hover:bg-cb-surface-light'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filter === 'blocked' ? (
        // Blocked users tab
        loadingBlocked ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : blockedUsers.length === 0 ? (
          <p className="text-sm text-cb-text-muted py-8 text-center">Geen geblokkeerde gebruikers.</p>
        ) : (
          <div className="bg-cb-surface border border-cb-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-cb-surface-light text-cb-text-secondary text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Naam</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Stad</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Geblokkeerd op</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cb-border">
                {blockedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-cb-surface-light/50 transition-colors">
                    <td className="px-4 py-3 text-cb-text font-medium">{u.first_name} {u.last_name}</td>
                    <td className="px-4 py-3 text-cb-text-secondary">{u.email ?? '—'}</td>
                    <td className="px-4 py-3 text-cb-text-secondary">{u.city ?? '—'}</td>
                    <td className="px-4 py-3 text-cb-text-muted">{u.reports.length}</td>
                    <td className="px-4 py-3 text-cb-text-muted">
                      {u.blocked_at ? new Date(u.blocked_at).toLocaleDateString('nl-BE') : '—'}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {u.reports.length > 0 ? (
                        <button
                          onClick={() => openDetail({ ...u.reports[0], reported: u } as ReportRow)}
                          className="text-cb-primary hover:underline cursor-pointer text-xs"
                        >
                          Bekijken
                        </button>
                      ) : (
                        <button
                          onClick={() => unblockUser(u.id)}
                          className="text-green-400 hover:underline cursor-pointer text-xs font-medium"
                        >
                          Deblokkeren
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // Reports tab
        loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-cb-text-muted py-8 text-center">Geen reports gevonden.</p>
        ) : (
          <div className="bg-cb-surface border border-cb-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-cb-surface-light text-cb-text-secondary text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Gerapporteerd</th>
                  <th className="px-4 py-3">Reden</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cb-border">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-cb-surface-light/50 transition-colors">
                    <td className="px-4 py-3 text-cb-text">{r.reporter?.first_name} {r.reporter?.last_name}</td>
                    <td className="px-4 py-3 font-medium">
                      {r.reported?.first_name} {r.reported?.last_name}
                      {r.reported?.blocked_at && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400">BLOCKED</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cb-text-secondary">{REASON_LABELS[r.reason] ?? r.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cb-text-muted">{new Date(r.created_at).toLocaleDateString('nl-BE')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(r)} className="text-cb-primary hover:underline cursor-pointer text-xs">
                        Bekijken
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)} maxWidth="max-w-lg">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Report detail</h2>

            {/* Users */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-cb-surface-light rounded-lg p-3">
                <p className="text-xs text-cb-text-muted mb-1">Reporter</p>
                <p className="text-sm font-medium">{selected.reporter?.first_name} {selected.reporter?.last_name}</p>
                <p className="text-xs text-cb-text-muted">{selected.reporter?.city ?? 'Geen stad'}</p>
              </div>
              <div className="bg-cb-surface-light rounded-lg p-3">
                <p className="text-xs text-cb-text-muted mb-1">Gerapporteerd</p>
                <p className="text-sm font-medium">
                  {selected.reported?.first_name} {selected.reported?.last_name}
                  {selected.reported?.blocked_at && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400">BLOCKED</span>
                  )}
                </p>
                <p className="text-xs text-cb-text-muted">{reportedEmail ?? '...'}</p>
                <p className="text-xs text-cb-text-muted">{selected.reported?.city ?? 'Geen stad'}</p>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-cb-text-secondary">Reden</span>
                <span>{REASON_LABELS[selected.reason]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cb-text-secondary">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cb-text-secondary">Datum</span>
                <span>{new Date(selected.created_at).toLocaleString('nl-BE')}</span>
              </div>
            </div>

            {/* Description */}
            {selected.description && (
              <div>
                <p className="text-xs text-cb-text-muted mb-1">Beschrijving</p>
                <p className="text-sm bg-cb-surface-light rounded-lg p-3">{selected.description}</p>
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
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => updateStatus('resolved')}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Oplossen
                </button>
              )}
              {selected.status !== 'dismissed' && (
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
                  selected.reported?.blocked_at
                    ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                }`}
              >
                {selected.reported?.blocked_at ? 'Gebruiker deblokkeren' : 'Gebruiker blokkeren'}
              </button>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full text-center text-xs text-cb-text-muted hover:text-cb-text transition-colors cursor-pointer pt-1"
            >
              Sluiten
            </button>
          </div>
        </Modal>
      )}


    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ReportDetailModal from '../components/ReportDetailModal';
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
    setReportedEmail(null);
    const { data } = await supabaseAdmin.auth.admin.getUserById(report.reported_user_id);
    setReportedEmail(data?.user?.email ?? null);
  }

  function handleModalUpdated() {
    fetchReports();
    fetchBlockedUsers();
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
        <ReportDetailModal
          report={selected}
          reportedEmail={reportedEmail}
          adminId={profile!.id}
          onClose={() => setSelected(null)}
          onUpdated={handleModalUpdated}
        />
      )}


    </div>
  );
}

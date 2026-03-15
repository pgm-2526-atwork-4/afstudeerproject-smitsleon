import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { REASON_LABELS, STATUS_COLORS } from '../lib/constants';
import { supabaseAdmin } from '../lib/supabase';
import type { DbReport, DbUser } from '../lib/types';

interface Stats {
  users: number;
  events: number;
  groups: number;
  pendingReports: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, events: 0, groups: 0, pendingReports: 0 });
  const [recentReports, setRecentReports] = useState<(DbReport & { reporter: DbUser; reported: DbUser })[]>([]);
  const [recentUsers, setRecentUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [usersRes, eventsRes, groupsRes, reportsRes, recentReportsRes, recentUsersRes] =
        await Promise.all([
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('events').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('groups').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabaseAdmin
            .from('reports')
            .select('*, reporter:users!reports_reporter_id_fkey(*), reported:users!reports_reported_user_id_fkey(*)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

      setStats({
        users: usersRes.count ?? 0,
        events: eventsRes.count ?? 0,
        groups: groupsRes.count ?? 0,
        pendingReports: reportsRes.count ?? 0,
      });
      setRecentReports(
        (recentReportsRes.data ?? []).map((r: Record<string, unknown>) => ({
          ...(r as unknown as DbReport),
          reporter: r.reporter as unknown as DbUser,
          reported: r.reported as unknown as DbUser,
        })),
      );
      setRecentUsers((recentUsersRes.data ?? []) as unknown as DbUser[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const STAT_CARDS = [
    { label: 'Gebruikers', value: stats.users, icon: '👥', to: '/users' },
    { label: 'Events', value: stats.events, icon: '🎵', to: '/events' },
    { label: 'Openstaande reports', value: stats.pendingReports, icon: '🚩', to: '/reports' },
  ];



  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => {
          const inner = (
            <div className="bg-cb-surface border border-cb-border rounded-xl p-5 hover:border-cb-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-2xl font-bold">{card.value}</span>
              </div>
              <p className="text-sm text-cb-text-secondary">{card.label}</p>
            </div>
          );
          return card.to ? (
            <Link key={card.label} to={card.to}>{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <div className="bg-cb-surface border border-cb-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recente reports</h2>
            <Link to="/reports" className="text-sm text-cb-primary hover:underline">Alles bekijken</Link>
          </div>
          {recentReports.length === 0 ? (
            <p className="text-sm text-cb-text-muted">Geen reports gevonden.</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-cb-text truncate">
                      <span className="text-cb-text-secondary">{r.reporter?.first_name}</span>
                      {' → '}
                      <span className="font-medium">{r.reported?.first_name} {r.reported?.last_name}</span>
                    </p>
                    <p className="text-xs text-cb-text-muted">{REASON_LABELS[r.reason] ?? r.reason}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent registrations */}
        <div className="bg-cb-surface border border-cb-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recente registraties</h2>
            <Link to="/users" className="text-sm text-cb-primary hover:underline">Alles bekijken</Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-cb-text-muted">Geen gebruikers gevonden.</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-cb-surface-light flex items-center justify-center text-xs font-bold text-cb-text-secondary">
                    {u.first_name?.[0]?.toUpperCase()}{u.last_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-cb-text truncate">{u.first_name} {u.last_name}</p>
                  </div>
                  <span className="text-xs text-cb-text-muted shrink-0">
                    {new Date(u.created_at).toLocaleDateString('nl-BE')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

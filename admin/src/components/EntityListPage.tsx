import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '../lib/supabase';
import Modal from './Modal';
import PageHeader from './PageHeader';
import Pagination from './Pagination';
import SearchInput from './SearchInput';
import Spinner from './Spinner';

export interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
}

export interface EntityListConfig<T extends { id: string; name: string }> {
  table: string;
  title: string;
  entityLabel: string;
  searchPlaceholder: string;
  searchFilterOr: (q: string) => string;
  emptyEntity: () => T;
  insertPayload: (entity: T) => Record<string, unknown>;
  detailRoute: string;
  columns: Column<T>[];
  renderForm: (entity: T, onChange: (e: T) => void) => ReactNode;
}

const PAGE_SIZE = 20;

export default function EntityListPage<T extends { id: string; name: string }>({
  config,
}: {
  config: EntityListConfig<T>;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabaseAdmin
      .from(config.table)
      .select('*')
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(config.searchFilterOr(search.trim()));
    }

    const { data } = await query;
    setItems((data ?? []) as T[]);
    setLoading(false);
  }, [search, page, config]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openNew() {
    setCreating(config.emptyEntity());
  }

  async function handleCreate() {
    if (!creating || !creating.name.trim()) return;
    setSaving(true);
    await supabaseAdmin.from(config.table).insert(config.insertPayload(creating));
    setSaving(false);
    setCreating(null);
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm(`Weet je zeker dat je ${config.entityLabel} wilt verwijderen?`)) return;
    await supabaseAdmin.from(config.table).delete().eq('id', id);
    fetchItems();
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        action={
          <button onClick={openNew} className="rounded-lg bg-cb-primary hover:bg-cb-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer">
            + Toevoegen
          </button>
        }
      />

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(0); }}
        placeholder={config.searchPlaceholder}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-cb-text-muted py-8 text-center">Geen {config.title.toLowerCase()} gevonden.</p>
      ) : (
        <div className="bg-cb-surface border border-cb-border rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-cb-surface-light text-cb-text-secondary text-xs uppercase">
              <tr>
                {config.columns.map((col) => (
                  <th key={col.header} className="px-4 py-3">{col.header}</th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cb-border">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`${config.detailRoute}/${item.id}`)}
                  className="hover:bg-cb-surface-light/50 transition-colors cursor-pointer"
                >
                  {config.columns.map((col) => (
                    <td key={col.header} className="px-4 py-3">{col.render(item)}</td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-cb-error hover:underline cursor-pointer text-xs"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} count={items.length} onPageChange={setPage} />

      {creating && (
        <Modal onClose={() => setCreating(null)}>
            <h2 className="text-lg font-semibold mb-4">{config.entityLabel.charAt(0).toUpperCase() + config.entityLabel.slice(1)} toevoegen</h2>

            <div className="space-y-3">
              {config.renderForm(creating, (e) => setCreating(e))}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreate}
                disabled={saving || !creating.name.trim()}
                className="flex-1 rounded-lg bg-cb-primary hover:bg-cb-primary-dark disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                {saving ? 'Toevoegen...' : 'Toevoegen'}
              </button>
              <button
                onClick={() => setCreating(null)}
                className="rounded-lg bg-cb-surface-light hover:bg-cb-border px-4 py-2 text-sm text-cb-text-secondary transition-colors cursor-pointer"
              >
                Annuleren
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}

import { useState } from 'react';
import { api } from '../../lib/api';
import { errorMessage, useAsync } from '../../lib/useAsync';
import { useToast } from '../../store/toast';
import { Empty, ErrorBox, RowsSkeleton } from '../../components/States';
import type { CSSProperties, FormEvent } from 'react';

export default function AdminCategories() {
  const { data, loading, error, reload } = useAsync(() => api.categories(), []);
  const toast = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;

    setSaving(true);
    try {
      await api.createCategory(value);
      toast.push(`Category "${value}" added.`, 'ok');
      setName('');
      reload();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const categories = data ?? [];

  return (
    <div className="stack" style={{ '--gap': '20px' } as CSSProperties}>
      <form className="panel" onSubmit={add}>
        <div className="panel-head">
          <strong>Add a category</strong>
        </div>
        <div className="panel-body row row-wrap">
          <input
            className="input grow"
            style={{ maxWidth: 320 }}
            placeholder="e.g. Footwear"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Category name"
          />
          <button className="btn" disabled={saving || !name.trim()}>
            {saving ? <span className="spinner" /> : 'Add category'}
          </button>
        </div>
      </form>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="panel">
        <div className="panel-head">
          <strong>Categories</strong>
          <span className="small muted">{categories.length} total</span>
        </div>

        {loading && <RowsSkeleton rows={3} />}

        {!loading && categories.length === 0 && (
          <Empty title="No categories yet" message="Add one above before creating products." />
        )}

        {!loading && categories.length > 0 && (
          <div className="table-scroll">
            <table className="table" style={{ minWidth: 320 }}>
              <thead>
                <tr>
                  <th className="cell-tight">ID</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-tight mono muted">{c.id}</td>
                    <td className="bold">{c.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="hint">
        The API exposes create and list for categories only — editing or deleting
        a category would orphan products, so it is not offered here.
      </p>
    </div>
  );
}

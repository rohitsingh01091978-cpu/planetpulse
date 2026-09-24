'use client';

import { useEffect, useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import TypeIcon from '@/components/TypeIcon';
import { ACTIVITY_TYPES, TYPE_KEYS } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/week';

const NO_FILTER = { type: 'all', from: '', to: '' };

export default function History({ refreshKey }) {
  const [filters, setFilters] = useState(NO_FILTER);
  const [reloadKey, setReloadKey] = useState(0); // bumped by "Apply filters" to force a refetch
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters apply automatically: any change to type/dates (or new data) refetches the list.
  // `cancelled` drops responses from superseded requests so the table always matches the filters.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const res = await apiFetch(`/api/activities?${params}`);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.data?.error || 'Could not load history.');
        setResult(null);
      } else {
        setError(null);
        setResult({ ...res.data, filtered: filters.type !== 'all' || !!filters.from || !!filters.to });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshKey, reloadKey]);

  const update = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    setReloadKey((k) => k + 1);
  }

  function handleClear() {
    setFilters(NO_FILTER);
  }

  const activities = result?.activities ?? [];

  return (
    <section className="card" aria-labelledby="history-heading">
      <h2 id="history-heading">
        <HistoryIcon size={20} aria-hidden="true" /> History
      </h2>

      <form onSubmit={handleSubmit} noValidate className="filters">
        <div className="field">
          <label htmlFor="filter-type">Filter by type</label>
          <select id="filter-type" name="filter_type" value={filters.type} onChange={update('type')}>
            <option value="all">All types</option>
            {TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_TYPES[key].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-from">From date</label>
          <input id="filter-from" name="filter_from" type="date" value={filters.from} onChange={update('from')} />
        </div>
        <div className="field">
          <label htmlFor="filter-to">To date</label>
          <input id="filter-to" name="filter_to" type="date" value={filters.to} onChange={update('to')} />
        </div>
        <div className="row filter-actions">
          <button type="submit" className="btn">
            Apply filters
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            Clear filters
          </button>
        </div>
      </form>

      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}

      {!error && loading && !result && <p className="muted">Loading...</p>}

      {!error && result && (
        <div className={loading ? 'is-loading' : undefined} aria-busy={loading}>
          <p className="muted" data-testid="history-count">
            {result.count === 0
              ? 'No activities match.'
              : result.count > activities.length
                ? `Showing the latest ${activities.length} of ${result.count} activities.`
                : `${result.count} ${result.count === 1 ? 'activity' : 'activities'}.`}
          </p>

          {activities.length === 0 &&
            (result.filtered ? (
              <EmptyState variant="earth" title="No activities match these filters">
                Try a different type or date range, or clear the filters.
              </EmptyState>
            ) : (
              <EmptyState variant="leaf" title="No activities logged yet">
                Add your first one using the form and it will show up here.
              </EmptyState>
            ))}

          {activities.length > 0 && (
            <div className="table-wrap">
              <table data-testid="history-table">
                <caption className="sr-only">Logged activities</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Activity</th>
                    <th scope="col" className="num">Quantity</th>
                    <th scope="col" className="num">CO2 (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.activity_date)}</td>
                      <td>
                        <span className="type-cell">
                          <TypeIcon type={a.type} />
                          {a.label}
                        </span>
                      </td>
                      <td className="num">
                        {a.quantity} {a.unit}
                      </td>
                      <td className="num">{a.co2_kg.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

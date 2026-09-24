'use client';

import { useEffect, useRef, useState } from 'react';
import { Filter, History as HistoryIcon, TriangleAlert, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import TypeIcon from '@/components/TypeIcon';
import { ACTIVITY_TYPES, TYPE_KEYS } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { activeFilters, isRangeInvalid, summarizeRows } from '@/lib/history';
import { byNewest, matchesFilters } from '@/lib/optimistic';
import { formatDate } from '@/lib/week';

const NO_FILTER = { type: 'all', from: '', to: '' };

export default function History({ refreshKey, newActivity }) {
  const [filters, setFilters] = useState(NO_FILTER);
  const [reloadKey, setReloadKey] = useState(0); // bumped by "Apply filters" to force a refetch
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastQuery = useRef('');
  const [shownActivity, setShownActivity] = useState(null);
  const rangeInvalid = isRangeInvalid(filters);

  // Show a just-saved activity right away (if it matches the active filters), in the same
  // order the API uses. Done while rendering (not in an effect) so the history changes in the
  // same paint as the dashboard total. The background refetch below then replaces the list
  // with server data.
  if (newActivity && newActivity !== shownActivity) {
    setShownActivity(newActivity);
    if (result && matchesFilters(newActivity, filters) && !result.activities.some((a) => a.id === newActivity.id)) {
      setResult({
        ...result,
        activities: [newActivity, ...result.activities].sort(byNewest).slice(0, result.limit),
        count: result.count + 1,
      });
    }
  }

  // Filters apply automatically: any change to type/dates (or new data) refetches the list.
  // `cancelled` drops responses from superseded requests so the table always matches the filters.
  // Filtering only ever reads: it never changes stored data.
  useEffect(() => {
    let cancelled = false;
    const query = JSON.stringify([filters, reloadKey]);
    const background = query === lastQuery.current; // only new data: refresh quietly, no dimming
    lastQuery.current = query;
    if (rangeInvalid) {
      setLoading(false); // "From" is after "To": nothing can match, so do not ask the server
      return undefined;
    }
    async function load() {
      if (!background) setLoading(true);
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const res = await apiFetch(`/api/activities?${params}`);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        if (background) return; // keep the last good list if a quiet refresh fails
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
  }, [filters, refreshKey, reloadKey, rangeInvalid]);

  const update = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    setReloadKey((k) => k + 1);
  }

  const clearFilters = () => setFilters(NO_FILTER);
  const removeFilter = (key) => setFilters((f) => ({ ...f, [key]: key === 'type' ? 'all' : '' }));

  const activities = result?.activities ?? [];
  const chips = activeFilters(filters);
  const { count, total_kg: totalKg } = summarizeRows(activities);
  const capped = result && result.count > activities.length;
  const countText = capped
    ? `Showing the latest ${count} of ${result.count} activities`
    : `${count} ${count === 1 ? 'activity' : 'activities'}`;

  return (
    <section className="card" aria-labelledby="history-heading">
      <h2 id="history-heading">
        <HistoryIcon size={20} aria-hidden="true" /> History
      </h2>

      <form onSubmit={handleSubmit} noValidate className="toolbar">
        <div className="toolbar-head">
          <Filter size={16} aria-hidden="true" />
          <span>Narrow down your history</span>
        </div>
        <div className="filters">
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
            <input
              id="filter-from"
              name="filter_from"
              type="date"
              value={filters.from}
              onChange={update('from')}
              aria-invalid={rangeInvalid ? true : undefined}
              aria-describedby={rangeInvalid ? 'history-range-error' : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="filter-to">To date</label>
            <input
              id="filter-to"
              name="filter_to"
              type="date"
              value={filters.to}
              onChange={update('to')}
              aria-invalid={rangeInvalid ? true : undefined}
              aria-describedby={rangeInvalid ? 'history-range-error' : undefined}
            />
          </div>
          <div className="row filter-actions">
            <button type="submit" className="btn">
              Apply filters
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      </form>

      {chips.length > 0 && (
        <div className="chips" role="group" aria-label="Active filters" data-testid="filter-chips">
          {chips.map((chip) => (
            <span key={chip.key} className="chip" data-testid={`chip-${chip.key}`}>
              {chip.label}
              <button
                type="button"
                className="chip-x"
                onClick={() => removeFilter(chip.key)}
                aria-label={`Remove filter ${chip.label}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {rangeInvalid && (
        <p id="history-range-error" className="alert alert-danger alert-icon" role="alert" data-testid="range-error">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>The From date must be on or before the To date. Change one of them to see results.</span>
        </p>
      )}

      {!rangeInvalid && error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}

      {!rangeInvalid && !error && loading && !result && (
        <div className="skeleton skeleton-table" aria-busy="true">
          <span className="sr-only">Loading...</span>
        </div>
      )}

      {!rangeInvalid && !error && result && (
        <div className={loading ? 'is-loading' : undefined} aria-busy={loading}>
          <p className="history-summary" data-testid="history-summary">
            <strong data-testid="history-count">{countText}</strong>
            <span className="history-total" data-testid="history-total">
              {totalKg.toFixed(2)} kg CO2 total
            </span>
          </p>

          {activities.length === 0 &&
            (result.filtered ? (
              <EmptyState
                variant="earth"
                title="No activities match these filters."
                action={
                  <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              >
                Try a different type or date range.
              </EmptyState>
            ) : (
              <EmptyState variant="leaf" title="Your footprint history is empty.">
                Log your first activity with the form and it will appear here.
              </EmptyState>
            ))}

          {activities.length > 0 && (
            <div className="table-wrap" role="region" aria-label="Logged activities" tabIndex={0}>
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
                    <tr key={a.id} className={shownActivity?.id === a.id ? 'row-new' : undefined}>
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
                      <td className="num co2-cell">{a.co2_kg.toFixed(2)}</td>
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

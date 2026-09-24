'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Lightbulb, Target, TriangleAlert } from 'lucide-react';
import { apiFetch, sendJson } from '@/lib/api';
import { formatDate } from '@/lib/week';

// onSaved(newTarget) lets the page update the summary instantly, before the server refetch lands.
export default function WeeklyTarget({ summary, onSaved }) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const week = summary?.week;
  const savedTarget = week?.target_kg ?? null;

  // Pre-fill the input with the saved target once it loads.
  useEffect(() => {
    if (savedTarget != null) setValue(String(savedTarget));
  }, [savedTarget]);

  // Each API route is its own serverless function on Vercel. Touch this one on page load so
  // the first "Save target" does not pay for a cold start.
  useEffect(() => {
    apiFetch('/api/target');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await sendJson('/api/target', 'PUT', { weekly_target_kg: value });
      if (!res.ok) {
        setStatus({ kind: 'error', text: res.data?.error || 'Could not save the target.' });
        return;
      }
      setStatus({ kind: 'success', text: `Weekly target saved: ${res.data.weekly_target_kg.toFixed(2)} kg CO2.` });
      onSaved(res.data.weekly_target_kg);
    } finally {
      setSaving(false); // always return the button to "Save target"
    }
  }

  const hasTarget = week && week.target_kg != null;
  const exceeded = hasTarget && week.exceeded;
  const barPercent = hasTarget ? Math.min(week.percent, 100) : 0;
  const barState = !hasTarget ? '' : exceeded ? 'over' : week.percent >= 80 ? 'warn' : 'ok';

  return (
    <section className={`card target-card ${exceeded ? 'is-over' : ''}`} aria-labelledby="target-heading">
      <h2 id="target-heading">
        <Target size={20} aria-hidden="true" /> Weekly target
      </h2>

      {!week ? (
        <p className="muted">Loading...</p>
      ) : (
        <div data-testid="week-progress">
          <p className="week-meta">
            <CalendarDays size={16} aria-hidden="true" />
            <span>
              Today is <strong>{week.day_name}</strong> (day {week.day_number} of 7). Week: Mon{' '}
              {formatDate(week.start)} to Sun {formatDate(week.end)} (IST).
            </span>
          </p>

          {hasTarget ? (
            <>
              <p className="progress-text" data-testid="progress-text">
                <strong>{week.total_kg.toFixed(2)}</strong> of <strong>{week.target_kg.toFixed(2)}</strong> kg
                <span className={`pill ${barState}`}>{week.percent}%</span>
              </p>
              <div
                className={`bar ${barState}`}
                role="progressbar"
                aria-label="Weekly CO2 progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(barPercent)}
                aria-valuetext={`${week.total_kg.toFixed(2)} of ${week.target_kg.toFixed(2)} kg`}
              >
                <div className={`bar-fill ${barState}`} style={{ width: `${barPercent}%` }} />
              </div>

              {exceeded ? (
                <div className="exceeded" role="alert" data-testid="target-exceeded">
                  <TriangleAlert size={26} className="exceeded-icon" aria-hidden="true" />
                  <div>
                    <p className="exceeded-title">
                      <strong>Target exceeded!</strong>
                    </p>
                    <p>
                      You are {week.exceeded_by_kg.toFixed(2)} kg over your weekly target of{' '}
                      {week.target_kg.toFixed(2)} kg.
                    </p>
                    {week.nudge && (
                      <p className="tip" data-testid="nudge">
                        <Lightbulb size={18} aria-hidden="true" />
                        <span>
                          <strong>Tip:</strong> {week.nudge.tip}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="muted">{week.remaining_kg.toFixed(2)} kg left this week.</p>
              )}
            </>
          ) : (
            <p className="alert alert-info">
              No weekly target set yet. This week so far: <strong>{week.total_kg.toFixed(2)} kg</strong>. Set a
              target below to track your progress.
            </p>
          )}

          <p className="projection" data-testid="projection">
            Projected total by Sunday at your current pace: <strong>{week.projected_kg.toFixed(2)} kg</strong>
            {week.projected_exceeds && (
              <span className="flag">
                {' '}
                (on pace to exceed your target of {week.target_kg.toFixed(2)} kg)
              </span>
            )}
            .
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="target-form">
        <div className="field">
          <label htmlFor="weekly-target">Weekly CO2 target (kg)</label>
          <input
            id="weekly-target"
            name="weekly_target_kg"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="e.g. 50"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save target'}
        </button>
      </form>

      {status && (
        <p
          className={`alert ${status.kind === 'success' ? 'alert-ok' : 'alert-danger'}`}
          role={status.kind === 'success' ? 'status' : 'alert'}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}

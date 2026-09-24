'use client';

import { useEffect, useState } from 'react';
import { sendJson } from '@/lib/api';
import { formatDate } from '@/lib/week';

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

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await sendJson('/api/target', 'PUT', { weekly_target_kg: value });
    setSaving(false);
    if (!res.ok) {
      setStatus({ kind: 'error', text: res.data?.error || 'Could not save the target.' });
      return;
    }
    setStatus({ kind: 'success', text: `Weekly target saved: ${res.data.weekly_target_kg.toFixed(2)} kg CO2.` });
    onSaved();
  }

  const hasTarget = week && week.target_kg != null;
  const barPercent = hasTarget ? Math.min(week.percent, 100) : 0;
  const barState = !hasTarget ? '' : week.exceeded ? 'over' : week.percent >= 80 ? 'warn' : 'ok';

  return (
    <section className="card" aria-labelledby="target-heading">
      <h2 id="target-heading">Weekly target</h2>

      {!week ? (
        <p className="muted">Loading...</p>
      ) : (
        <div data-testid="week-progress">
          <p className="muted">
            Today is <strong>{week.day_name}</strong> (day {week.day_number} of 7). Week: Mon{' '}
            {formatDate(week.start)} to Sun {formatDate(week.end)} (IST).
          </p>

          {hasTarget ? (
            <>
              <p className="progress-text" data-testid="progress-text">
                <strong>{week.total_kg.toFixed(2)}</strong> of <strong>{week.target_kg.toFixed(2)}</strong> kg
                ({week.percent}%)
              </p>
              <div
                className="bar"
                role="progressbar"
                aria-label="Weekly CO2 progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(barPercent)}
                aria-valuetext={`${week.total_kg.toFixed(2)} of ${week.target_kg.toFixed(2)} kg`}
              >
                <div className={`bar-fill ${barState}`} style={{ width: `${barPercent}%` }} />
              </div>

              {week.exceeded ? (
                <div className="alert alert-danger" role="alert" data-testid="target-exceeded">
                  <p>
                    <strong>Target exceeded!</strong> You are {week.exceeded_by_kg.toFixed(2)} kg over your
                    weekly target of {week.target_kg.toFixed(2)} kg.
                  </p>
                  {week.nudge && (
                    <p data-testid="nudge">
                      <strong>Tip:</strong> {week.nudge.tip}
                    </p>
                  )}
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

          <p data-testid="projection">
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

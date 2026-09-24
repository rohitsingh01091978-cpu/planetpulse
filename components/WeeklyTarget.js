'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, CircleCheck, Gauge, Lightbulb, Target, TriangleAlert } from 'lucide-react';
import { apiFetch, sendJson } from '@/lib/api';
import { targetState } from '@/lib/target';
import { validateTarget } from '@/lib/validate';
import { formatDate } from '@/lib/week';

// onSaved(newTarget) lets the page update the summary instantly, before the server refetch lands.
export default function WeeklyTarget({ summary, onSaved }) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [barShown, setBarShown] = useState(false); // lets the bar grow from 0 when it first appears
  const inputRef = useRef(null);
  const inFlight = useRef(false);

  const week = summary?.week;
  const savedTarget = week?.target_kg ?? null;
  const hasTarget = !!week && week.target_kg != null;

  // Pre-fill the input with the saved target once it loads.
  useEffect(() => {
    if (savedTarget != null) setValue(String(savedTarget));
  }, [savedTarget]);

  // Each API route is its own serverless function on Vercel. Touch this one (once) when the
  // user starts editing the target, so "Save target" does not pay for a cold start. Nothing is
  // requested on page load.
  const warmed = useRef(false);
  function warmTargetRoute() {
    if (warmed.current) return;
    warmed.current = true;
    apiFetch('/api/target');
  }

  useEffect(() => {
    if (!hasTarget) {
      setBarShown(false);
      return undefined;
    }
    const t = setTimeout(() => setBarShown(true), 60);
    return () => clearTimeout(t);
  }, [hasTarget]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    setStatus(null);
    // A number input reports non-numeric text as an empty value; ask the browser.
    const problem = validateTarget(value, { badInput: inputRef.current?.validity.badInput });
    if (problem) {
      setFieldError(problem);
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    inFlight.current = true;
    setSaving(true);
    try {
      const res = await sendJson('/api/target', 'PUT', { weekly_target_kg: value });
      if (!res.ok) {
        setStatus({ kind: 'error', text: res.data?.error || 'Could not save the target.' });
        return;
      }
      setStatus({ kind: 'success', text: `Weekly target saved: ${res.data.weekly_target_kg.toFixed(2)} kg CO2.` });
      onSaved(res.data.weekly_target_kg);
    } finally {
      inFlight.current = false;
      setSaving(false); // always return the button to "Save target"
    }
  }

  const exceeded = hasTarget && week.exceeded;
  const state = week ? targetState(hasTarget ? week.percent : null, exceeded) : 'none';
  const barPercent = hasTarget ? Math.min(week.percent, 100) : 0;
  const barClass = { under: 'ok', near: 'near', exceeded: 'over', none: '' }[state];
  const feedback = fieldError ? { kind: 'error', text: fieldError } : status;

  return (
    <section className={`card target-card ${exceeded ? 'is-over' : ''}`} aria-labelledby="target-heading">
      <h2 id="target-heading">
        <Target size={20} aria-hidden="true" /> Weekly target
      </h2>

      {!week ? (
        <div className="skeleton skeleton-target" aria-busy="true">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <div data-testid="week-progress" data-state={state}>
          <p className="week-meta">
            <CalendarDays size={16} aria-hidden="true" />
            <span>
              <strong>This week:</strong> Mon {formatDate(week.start)} to Sun {formatDate(week.end)} (IST) &middot;
              Today is <strong>{week.day_name}</strong> (day {week.day_number} of 7)
            </span>
          </p>

          {hasTarget ? (
            <>
              <p className="progress-text" data-testid="progress-text">
                <strong>{week.total_kg.toFixed(2)}</strong> of <strong>{week.target_kg.toFixed(2)}</strong> kg
                <span className={`pill ${barClass}`}>{week.percent}%</span>
              </p>
              <div
                className={`bar ${barClass}`}
                role="progressbar"
                aria-label="Weekly CO2 progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(barPercent)}
                aria-valuetext={`${week.total_kg.toFixed(2)} of ${week.target_kg.toFixed(2)} kg`}
              >
                <div className={`bar-fill ${barClass}`} style={{ width: `${barShown ? barPercent : 0}%` }} />
              </div>

              {state === 'under' && (
                <p className="state-msg state-under" data-testid="target-message">
                  <CircleCheck size={18} aria-hidden="true" />
                  <span>
                    <strong>On track.</strong> {week.remaining_kg.toFixed(2)} kg left this week. Nice and steady.
                  </span>
                </p>
              )}

              {state === 'near' && (
                <p className="state-msg state-near" data-testid="target-message">
                  <Gauge size={18} aria-hidden="true" />
                  <span>
                    {week.remaining_kg === 0 ? (
                      <>
                        <strong>Right at your target.</strong> 0.00 kg left this week. A little care for the rest
                        of the week keeps you here.
                      </>
                    ) : (
                      <>
                        <strong>Getting close.</strong> {week.remaining_kg.toFixed(2)} kg left this week. A little
                        care for the rest of the week keeps you on track.
                      </>
                    )}
                  </span>
                </p>
              )}

              {state === 'exceeded' && (
                <div className="exceeded" role="alert" data-testid="target-exceeded">
                  <TriangleAlert size={26} className="exceeded-icon" aria-hidden="true" />
                  <div>
                    <p className="exceeded-title">
                      <strong>Target exceeded!</strong>
                    </p>
                    <p>
                      You are {week.exceeded_by_kg.toFixed(2)} kg over your weekly target of{' '}
                      {week.target_kg.toFixed(2)} kg. It happens to everyone, and small swaps add up.
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
            ref={inputRef}
            id="weekly-target"
            name="weekly_target_kg"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="e.g. 50"
            value={value}
            onFocus={warmTargetRoute}
            onChange={(e) => {
              setValue(e.target.value);
              setFieldError(null);
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'target-feedback' : undefined}
          />
        </div>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save target'}
        </button>
      </form>

      <div id="target-feedback">
        {feedback && (
          <p
            className={`alert alert-icon ${feedback.kind === 'success' ? 'alert-ok' : 'alert-danger'}`}
            role={feedback.kind === 'success' ? 'status' : 'alert'}
          >
            {feedback.kind === 'success' ? (
              <CircleCheck size={18} aria-hidden="true" />
            ) : (
              <TriangleAlert size={18} aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </p>
        )}
      </div>
    </section>
  );
}

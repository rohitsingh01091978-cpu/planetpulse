'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, CircleCheck, ClipboardPen, TriangleAlert } from 'lucide-react';
import TypeIcon from '@/components/TypeIcon';
import { ACTIVITY_TYPES, TYPE_KEYS, perUnit } from '@/lib/constants';
import { calculateCo2, round2 } from '@/lib/co2';
import { sendJson } from '@/lib/api';
import { validateActivity, validateQuantity } from '@/lib/validate';
import { formatDate, todayIST } from '@/lib/week';

// A failed save keeps the entry in the form; say so and say what went wrong.
function saveErrorText(res) {
  const raw = res.data?.error || 'Something went wrong.';
  // avoid saying "try again" twice: our own sentence below already does
  let reason = raw.replace(/\s*Please try again\.?\s*$/i, '').trim();
  if (!/[.!?]$/.test(reason)) reason += '.';
  if (res.status === 0 || res.status >= 500) {
    return `Couldn't save your activity. ${reason} Your entry is still in the form, so you can try again.`;
  }
  return reason;
}

export default function ActivityForm({ onLogged }) {
  const [type, setType] = useState('car');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const [today, setToday] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'success' | 'error', text }
  const [fieldError, setFieldError] = useState(null); // { field, message } from the pre-checks
  const [confirmMessage, setConfirmMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const quantityRef = useRef(null);
  const dateRef = useRef(null);
  const confirmRef = useRef(null);
  const inFlight = useRef(false); // blocks a second submit before React re-renders

  // Set after mount so server and client HTML match. Today is always today in IST.
  useEffect(() => {
    const t = todayIST();
    setToday(t);
    setDate(t);
  }, []);

  // Keyboard users land on the confirm button when the "are you sure?" prompt appears.
  useEffect(() => {
    if (confirmMessage) confirmRef.current?.focus();
  }, [confirmMessage]);

  const { unit, factor, limit } = ACTIVITY_TYPES[type];
  const per = perUnit(unit);

  // Live preview: same rules as the pre-checks and the same calculateCo2 as the backend.
  const quantityOk = validateQuantity(quantity, { type }) === null;
  const qty = quantityOk ? round2(Number(quantity)) : null;
  const preview = quantityOk ? calculateCo2(type, qty) : null;
  const overLimit = quantityOk && qty > limit;

  // Any edit invalidates a pending "are you sure?" prompt and old error text.
  function edit(setter) {
    return (e) => {
      setter(e.target.value);
      setConfirmMessage(null);
      setFieldError(null);
    };
  }

  function choose(key) {
    setType(key);
    setConfirmMessage(null);
    setFieldError(null);
  }

  async function save(confirm) {
    if (inFlight.current) return; // double-click / double-Enter: only one request per action
    inFlight.current = true;
    setSaving(true);
    setStatus(null);
    const sentQuantity = quantity;
    try {
      const res = await sendJson('/api/activities', 'POST', { type, quantity, date, confirm });

      if (res.status === 409 && res.data?.needs_confirmation) {
        setConfirmMessage(res.data.message);
        return;
      }
      setConfirmMessage(null);
      if (!res.ok) {
        setStatus({ kind: 'error', text: saveErrorText(res) });
        return;
      }
      const a = res.data.activity;
      const unitText = a.quantity === 1 ? perUnit(a.unit) : a.unit;
      setStatus({
        kind: 'success',
        text: `Logged ${a.quantity} ${unitText} of ${a.label.toLowerCase()} on ${formatDate(a.activity_date)}: ${a.co2_kg.toFixed(2)} kg CO2.`,
      });
      // Sensible reset: clear the quantity, keep the activity and date for the next entry.
      // If the user already started typing the next quantity while this saved, keep theirs.
      setQuantity((current) => (current === sentQuantity ? '' : current));
      onLogged(a);
      quantityRef.current?.focus();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;
    // A number input reports non-numeric text as an empty value; ask the browser.
    const problem = validateActivity(
      { type, quantity, date, badInput: quantityRef.current?.validity.badInput },
      todayIST()
    );
    setStatus(null);
    if (problem) {
      setConfirmMessage(null);
      setFieldError(problem);
      (problem.field === 'date' ? dateRef : quantityRef).current?.focus();
      return;
    }
    setFieldError(null);
    save(false);
  }

  const feedback = fieldError ? { kind: 'error', text: fieldError.message } : status;
  const invalid = (field) => (fieldError?.field === field ? true : undefined);
  const describedBy = (field) => (fieldError?.field === field ? 'log-feedback' : undefined);

  return (
    <section className="card log-card" aria-labelledby="log-heading">
      <h2 id="log-heading">
        <ClipboardPen size={20} aria-hidden="true" /> Log an activity
      </h2>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="type-fieldset" role="radiogroup">
          <legend>Activity type</legend>
          <div className="activity-grid">
            {TYPE_KEYS.map((key) => {
              const t = ACTIVITY_TYPES[key];
              return (
                <label key={key} className="activity-option">
                  <input
                    type="radio"
                    name="type"
                    value={key}
                    aria-label={`${t.label} (${t.unit})`}
                    checked={type === key}
                    onChange={() => choose(key)}
                  />
                  <span className="activity-face">
                    <span className="activity-top">
                      <TypeIcon type={key} />
                      <Check className="activity-check" size={16} strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="activity-name">{t.label}</span>{' '}
                    <span className="activity-unit">({t.unit})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="activity-quantity">Quantity ({unit})</label>
          <div className="input-wrap has-suffix">
            <input
              ref={quantityRef}
              id="activity-quantity"
              name="quantity"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={`Amount in ${unit}`}
              value={quantity}
              onChange={edit(setQuantity)}
              aria-invalid={invalid('quantity')}
              aria-describedby={describedBy('quantity')}
            />
            <span className="input-suffix" aria-hidden="true">
              {unit}
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="activity-date">Date</label>
          <input
            ref={dateRef}
            id="activity-date"
            name="date"
            type="date"
            max={today || undefined}
            value={date}
            onChange={edit(setDate)}
            aria-invalid={invalid('date')}
            aria-describedby={describedBy('date')}
          />
        </div>

        <div
          className={`co2-hero ${preview == null ? 'is-empty' : ''}`}
          aria-live="polite"
          data-testid="co2-preview"
        >
          <span className="co2-hero-label">Estimated CO2</span>
          {preview == null ? (
            <p className="co2-empty">Enter a quantity to see the estimated CO2.</p>
          ) : (
            <p className="co2-equation" data-testid="co2-equation">
              <span className="eq-calc">
                {qty} {qty === 1 ? per : unit} &times; {factor.toFixed(2)} kg/{per}
              </span>{' '}
              <span className="eq-result">= {preview.toFixed(2)} kg CO2</span>
            </p>
          )}
          {overLimit && (
            <p className="co2-note">
              Higher than usual (over {limit} {unit}). You will be asked to confirm before it is saved.
            </p>
          )}
          <p className="co2-factor" data-testid="emission-factor">
            Emission factor: <strong>{factor.toFixed(2)} kg CO2</strong> per {per}
          </p>
        </div>

        <button type="submit" className="btn btn-block" disabled={saving || !!confirmMessage}>
          {saving ? 'Saving...' : 'Log activity'}
        </button>
      </form>

      <div id="log-feedback">
        {confirmMessage && (
          <div className="alert alert-warn" role="alert" data-testid="confirm-prompt">
            <p>
              <strong>Please confirm.</strong> {confirmMessage}
            </p>
            <div className="row">
              <button
                ref={confirmRef}
                type="button"
                className="btn"
                onClick={() => save(true)}
                disabled={saving}
              >
                Yes, save anyway
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmMessage(null)}
              >
                No, let me edit
              </button>
            </div>
          </div>
        )}

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

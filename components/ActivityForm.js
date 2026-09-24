'use client';

import { useEffect, useRef, useState } from 'react';
import { ClipboardPen } from 'lucide-react';
import TypeIcon from '@/components/TypeIcon';
import { ACTIVITY_TYPES, TYPE_KEYS, perUnit } from '@/lib/constants';
import { calculateCo2, round2 } from '@/lib/co2';
import { sendJson } from '@/lib/api';
import { todayIST } from '@/lib/week';

export default function ActivityForm({ onLogged }) {
  const [type, setType] = useState('car');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const [today, setToday] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'success' | 'error', text }
  const [confirmMessage, setConfirmMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const quantityRef = useRef(null);

  // Set after mount so server and client HTML match.
  useEffect(() => {
    const t = todayIST();
    setToday(t);
    setDate(t);
  }, []);

  const { unit, factor } = ACTIVITY_TYPES[type];
  const per = perUnit(unit);

  // Live preview uses the same calculateCo2 as the backend.
  const qty = round2(quantity.trim() === '' ? NaN : Number(quantity));
  const preview = Number.isFinite(qty) && qty > 0 ? calculateCo2(type, qty) : null;

  // Any edit invalidates a pending "are you sure?" prompt.
  function edit(setter) {
    return (e) => {
      setter(e.target.value);
      setConfirmMessage(null);
    };
  }

  async function save(confirm) {
    setSaving(true);
    setStatus(null);
    try {
      const res = await sendJson('/api/activities', 'POST', { type, quantity, date, confirm });

      if (res.status === 409 && res.data?.needs_confirmation) {
        setConfirmMessage(res.data.message);
        return;
      }
      setConfirmMessage(null);
      if (!res.ok) {
        setStatus({ kind: 'error', text: res.data?.error || 'Could not save the activity.' });
        return;
      }
      const a = res.data.activity;
      setStatus({
        kind: 'success',
        text: `Logged ${a.quantity} ${a.unit} of ${a.label.toLowerCase()} on ${a.activity_date}: ${a.co2_kg.toFixed(2)} kg CO2.`,
      });
      setQuantity('');
      onLogged();
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    // A number input reports non-numeric text as an empty value; catch it here for a clear message.
    if (quantityRef.current?.validity.badInput) {
      setConfirmMessage(null);
      setStatus({ kind: 'error', text: 'Quantity must be a number.' });
      return;
    }
    save(false);
  }

  return (
    <section className="card" aria-labelledby="log-heading">
      <h2 id="log-heading">
        <ClipboardPen size={20} aria-hidden="true" /> Log an activity
      </h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="activity-type">Activity type</label>
          <div className="input-wrap has-icon">
            <span className="input-icon">
              <TypeIcon type={type} />
            </span>
            <select id="activity-type" name="type" value={type} onChange={edit(setType)}>
              {TYPE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_TYPES[key].label} ({ACTIVITY_TYPES[key].unit})
                </option>
              ))}
            </select>
          </div>
          <p className="factor-note" data-testid="emission-factor">
            Emission factor: <strong>{factor.toFixed(2)} kg CO2</strong> per {per}
          </p>
        </div>

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
            />
            <span className="input-suffix" aria-hidden="true">
              {unit}
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="activity-date">Date</label>
          <input
            id="activity-date"
            name="date"
            type="date"
            max={today || undefined}
            value={date}
            onChange={edit(setDate)}
          />
        </div>

        <div className={`preview ${preview == null ? 'is-empty' : ''}`} aria-live="polite" data-testid="co2-preview">
          {preview == null ? (
            <span>Enter a quantity to see the estimated CO2.</span>
          ) : (
            <>
              <span className="preview-label">Estimated CO2</span>
              <span className="preview-value">{preview.toFixed(2)} kg</span>
              <span className="preview-calc">
                {qty} {unit} &times; {factor.toFixed(2)} kg/{per}
              </span>
            </>
          )}
        </div>

        <button type="submit" className="btn btn-block" disabled={saving || !!confirmMessage}>
          {saving ? 'Saving...' : 'Log activity'}
        </button>
      </form>

      {confirmMessage && (
        <div className="alert alert-warn" role="alert" data-testid="confirm-prompt">
          <p>
            <strong>Please confirm.</strong> {confirmMessage}
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={() => save(true)} disabled={saving}>
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

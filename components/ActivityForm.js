'use client';

import { useEffect, useState } from 'react';
import { ACTIVITY_TYPES, TYPE_KEYS } from '@/lib/constants';
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

  // Set after mount so server and client HTML match.
  useEffect(() => {
    const t = todayIST();
    setToday(t);
    setDate(t);
  }, []);

  const unit = ACTIVITY_TYPES[type].unit;

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
    const res = await sendJson('/api/activities', 'POST', { type, quantity, date, confirm });
    setSaving(false);

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
  }

  function handleSubmit(e) {
    e.preventDefault();
    save(false);
  }

  return (
    <section className="card" aria-labelledby="log-heading">
      <h2 id="log-heading">Log an activity</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="activity-type">Activity type</label>
          <select id="activity-type" name="type" value={type} onChange={edit(setType)}>
            {TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_TYPES[key].label} ({ACTIVITY_TYPES[key].unit})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="activity-quantity">Quantity ({unit})</label>
          <input
            id="activity-quantity"
            name="quantity"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder={`Amount in ${unit}`}
            value={quantity}
            onChange={edit(setQuantity)}
          />
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

        <button type="submit" className="btn" disabled={saving || !!confirmMessage}>
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

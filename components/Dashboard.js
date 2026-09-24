'use client';

import { LayoutDashboard } from 'lucide-react';
import { Illustration } from '@/components/EmptyState';

// The total-footprint hero. The category groups and the per-type table live in Breakdown.
export default function Dashboard({ summary }) {
  return (
    <section className="card" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading">
        <LayoutDashboard size={20} aria-hidden="true" /> Dashboard
      </h2>
      {!summary ? (
        <div className="skeleton skeleton-hero" aria-busy="true">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <div className={`hero ${summary.entry_count === 0 ? 'is-empty' : ''}`} data-testid="total-footprint">
          <div>
            <div className="hero-figure">
              <span className="big-value">{summary.total_kg.toFixed(2)}</span>
              <span className="big-unit">kg CO2 total footprint</span>
            </div>
            <p className="hero-sub">
              {summary.entry_count === 0
                ? 'Nothing logged yet. Log your first activity to get started.'
                : `Across ${summary.entry_count} logged ${summary.entry_count === 1 ? 'activity' : 'activities'}.`}
            </p>
          </div>
          {summary.entry_count === 0 && <Illustration variant="leaf" size={72} />}
        </div>
      )}
    </section>
  );
}

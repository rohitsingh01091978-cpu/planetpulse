'use client';

import { LayoutDashboard } from 'lucide-react';
import TypeIcon from '@/components/TypeIcon';

export default function Dashboard({ summary }) {
  return (
    <section className="card" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading">
        <LayoutDashboard size={20} aria-hidden="true" /> Dashboard
      </h2>
      {!summary ? (
        <p className="muted">Loading...</p>
      ) : (
        <>
          <div className="hero" data-testid="total-footprint">
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

          <div className="table-wrap">
            <table>
              <caption className="sr-only">Footprint by category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="num">Entries</th>
                  <th scope="col" className="num">Quantity</th>
                  <th scope="col" className="num">CO2 (kg)</th>
                  <th scope="col" className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {summary.categories.map((c) => (
                  <tr key={c.type}>
                    <th scope="row">
                      <span className="type-cell">
                        <TypeIcon type={c.type} />
                        {c.label}
                      </span>
                    </th>
                    <td className="num">{c.count}</td>
                    <td className="num">
                      {c.quantity} {c.unit}
                    </td>
                    <td className="num">{c.co2_kg.toFixed(2)}</td>
                    <td className="num">
                      <span className="share-cell">
                        <span>{c.share_percent}%</span>
                        <span className="share-bar" aria-hidden="true" data-type={c.type}>
                          <span style={{ width: `${c.share_percent}%` }} />
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td className="num">{summary.entry_count}</td>
                  <td />
                  <td className="num">{summary.total_kg.toFixed(2)}</td>
                  <td className="num">{summary.total_kg > 0 ? '100%' : '0%'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

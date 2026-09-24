'use client';

import { ChartPie, Route, PlugZap, Utensils } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import TypeIcon from '@/components/TypeIcon';
import { groupTotals } from '@/lib/groups';

const GROUP_ICONS = { transport: Route, energy: PlugZap, food: Utensils };

// Where the footprint comes from: three groups first (Transport, Energy, Food), then the
// per-type table. Both are computed from the same summary data.
export default function Breakdown({ summary }) {
  const rollup = summary ? groupTotals(summary.categories) : null;

  return (
    <section className="card" aria-labelledby="breakdown-heading">
      <h2 id="breakdown-heading">
        <ChartPie size={20} aria-hidden="true" /> Category breakdown
      </h2>

      {!summary ? (
        <div className="skeleton skeleton-table" aria-busy="true">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <>
          {summary.entry_count === 0 ? (
            <EmptyState variant="leaf" title="Nothing to break down yet">
              Log an activity and your footprint will be split into Transport, Energy and Food.
            </EmptyState>
          ) : (
            <div data-testid="category-groups">
              <div className="groups">
                {rollup.groups.map((g) => {
                  const Icon = GROUP_ICONS[g.key];
                  return (
                    <div key={g.key} className="group-tile" data-group={g.key} data-testid={`group-${g.key}`}>
                      <div className="group-head">
                        <span className="group-chip" aria-hidden="true">
                          <Icon size={18} strokeWidth={2} />
                        </span>
                        <span className="group-name">{g.label}</span>
                      </div>
                      <p className="group-kg">
                        <strong>{g.co2_kg.toFixed(2)}</strong> kg CO2
                      </p>
                      <p className="group-share">{g.share_percent}% of your footprint</p>
                      <span className="group-bar" aria-hidden="true">
                        <span style={{ width: `${g.share_percent}%` }} />
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="group-sum" data-testid="group-sum">
                {rollup.groups.map((g) => `${g.label} ${g.co2_kg.toFixed(2)}`).join(' + ')} ={' '}
                <strong>{rollup.total_kg.toFixed(2)} kg CO2</strong>
              </p>
            </div>
          )}

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

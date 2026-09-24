'use client';

export default function Dashboard({ summary }) {
  return (
    <section className="card" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading">Dashboard</h2>
      {!summary ? (
        <p className="muted">Loading...</p>
      ) : (
        <>
          <div className="big-number" data-testid="total-footprint">
            <span className="big-value">{summary.total_kg.toFixed(2)}</span>
            <span className="big-unit">kg CO2 total footprint</span>
          </div>
          <p className="muted">
            Across {summary.entry_count} logged {summary.entry_count === 1 ? 'activity' : 'activities'}.
          </p>

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
                    <th scope="row">{c.label}</th>
                    <td className="num">{c.count}</td>
                    <td className="num">
                      {c.quantity} {c.unit}
                    </td>
                    <td className="num">{c.co2_kg.toFixed(2)}</td>
                    <td className="num">{c.share_percent}%</td>
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

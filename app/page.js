'use client';

import { useCallback, useEffect, useState } from 'react';
import ActivityForm from '@/components/ActivityForm';
import Dashboard from '@/components/Dashboard';
import WeeklyTarget from '@/components/WeeklyTarget';
import History from '@/components/History';
import { apiFetch } from '@/lib/api';

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // bumps whenever data changes

  const loadSummary = useCallback(async () => {
    const res = await apiFetch('/api/summary');
    if (!res.ok) {
      setError(res.data?.error || 'Could not load your data.');
      return;
    }
    setError(null);
    setSummary(res.data);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <main className="container">
      <header className="site-header">
        <h1>PlanetPulse</h1>
        <p className="tagline">Track your carbon footprint, one activity at a time. No sign-up needed.</p>
      </header>

      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}

      <ActivityForm onLogged={refresh} />
      <Dashboard summary={summary} />
      <WeeklyTarget summary={summary} onSaved={refresh} />
      <History refreshKey={refreshKey} />

      <footer className="site-footer">PlanetPulse &middot; week runs Monday to Sunday (IST)</footer>
    </main>
  );
}

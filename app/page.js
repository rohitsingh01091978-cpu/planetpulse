'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ActivityForm from '@/components/ActivityForm';
import Dashboard from '@/components/Dashboard';
import FactorsCard from '@/components/FactorsCard';
import History from '@/components/History';
import PlanetMark from '@/components/PlanetMark';
import WeeklyTarget from '@/components/WeeklyTarget';
import { apiFetch } from '@/lib/api';
import { applyActivity } from '@/lib/optimistic';
import { targetStatus } from '@/lib/target';

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // bumps whenever activities change
  const [newActivity, setNewActivity] = useState(null); // the activity that was just saved
  const latestRequest = useRef(0);

  const loadSummary = useCallback(async () => {
    const id = ++latestRequest.current;
    const res = await apiFetch('/api/summary');
    if (id !== latestRequest.current) return; // a newer request superseded this one
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

  // After "Log activity": show the new activity in the dashboard and history right away,
  // then refetch from the server to reconcile (this also fills in the weekly nudge tip).
  const handleLogged = useCallback((activity) => {
    setSummary((prev) => applyActivity(prev, activity));
    setNewActivity(activity);
    setRefreshKey((k) => k + 1);
  }, []);

  // After "Save target": apply the new target to the summary right away (same math the
  // server uses), then reconcile with the server. Avoids showing the old target state.
  const handleTargetSaved = useCallback(
    (target) => {
      setSummary((prev) => {
        if (!prev) return prev;
        const w = prev.week;
        const status = targetStatus(w.total_kg, target, w.day_number);
        return { ...prev, week: { ...w, ...status, nudge: status.exceeded ? w.nudge : null } };
      });
      loadSummary();
    },
    [loadSummary]
  );

  return (
    <main className="container">
      <header className="site-header">
        <PlanetMark size={64} />
        <div>
          <h1>
            Planet<span>Pulse</span>
          </h1>
          <p className="tagline">Track your carbon footprint, one activity at a time. No sign-up needed.</p>
        </div>
      </header>

      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid-top">
        <ActivityForm onLogged={handleLogged} />
        <Dashboard summary={summary} />
      </div>
      <FactorsCard />
      <WeeklyTarget summary={summary} onSaved={handleTargetSaved} />
      <History refreshKey={refreshKey} newActivity={newActivity} />

      <footer className="site-footer">PlanetPulse &middot; week runs Monday to Sunday (IST)</footer>
    </main>
  );
}

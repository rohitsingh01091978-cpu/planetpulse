'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActivityForm from '@/components/ActivityForm';
import Breakdown from '@/components/Breakdown';
import Dashboard from '@/components/Dashboard';
import FactorsCard from '@/components/FactorsCard';
import History from '@/components/History';
import PlanetMark from '@/components/PlanetMark';
import WeeklyTarget from '@/components/WeeklyTarget';
import { apiFetch } from '@/lib/api';
import { buildNudge } from '@/lib/nudge';
import { addToWeek, applyActivity, weekTotals } from '@/lib/optimistic';
import { targetStatus } from '@/lib/target';

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [weekByType, setWeekByType] = useState(null); // this week's per-type totals, for the nudge
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // bumps whenever activities change
  const [newActivity, setNewActivity] = useState(null); // the activity that was just saved
  const latestRequest = useRef(0);
  const latestWeekRequest = useRef(0);

  // This week's activities (existing history endpoint) -> per-type totals. With them the browser
  // can build the exact same nudge the server does, the moment an activity or target changes.
  const loadWeek = useCallback(async (week) => {
    const id = ++latestWeekRequest.current;
    const res = await apiFetch(`/api/activities?from=${week.start}&to=${week.end}`);
    if (id !== latestWeekRequest.current || !res.ok) return;
    const { activities, count } = res.data;
    setWeekByType({
      start: week.start,
      end: week.end,
      complete: count <= activities.length, // the list is capped; if capped, use the server's nudge
      byType: weekTotals(activities),
    });
  }, []);

  // refreshWeek: false skips reloading this week's activities (a target change cannot alter them).
  const loadSummary = useCallback(async ({ refreshWeek = true } = {}) => {
    const id = ++latestRequest.current;
    const res = await apiFetch('/api/summary');
    if (id !== latestRequest.current) return; // a newer request superseded this one
    if (!res.ok) {
      setError(res.data?.error || 'Could not load your data.');
      return;
    }
    setError(null);
    setSummary(res.data);
    if (refreshWeek) loadWeek(res.data.week);
  }, [loadWeek]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);

  // After "Log activity": show the new activity in the dashboard, weekly progress, nudge and
  // history right away, then refetch from the server to reconcile.
  const handleLogged = useCallback((activity) => {
    latestWeekRequest.current += 1; // drop any older in-flight week load; it would miss this activity
    setSummary((prev) => applyActivity(prev, activity));
    setWeekByType((prev) =>
      prev && activity.activity_date >= prev.start && activity.activity_date <= prev.end
        ? { ...prev, byType: addToWeek(prev.byType, activity) }
        : prev
    );
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
        return { ...prev, week: { ...w, ...targetStatus(w.total_kg, target, w.day_number) } };
      });
      loadSummary({ refreshWeek: false });
    },
    [loadSummary]
  );

  // The nudge only exists while this week is over the target. It is built in the browser from the
  // week's per-type totals (identical to the server's), so it appears and disappears with the
  // progress bar. Until those totals arrive, the server's nudge is used.
  const view = useMemo(() => {
    if (!summary) return null;
    const w = summary.week;
    if (!w.exceeded) return w.nudge ? { ...summary, week: { ...w, nudge: null } } : summary;
    const fresh = weekByType && weekByType.start === w.start && weekByType.complete;
    return { ...summary, week: { ...w, nudge: fresh ? buildNudge(weekByType.byType) : w.nudge } };
  }, [summary, weekByType]);

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
        <div className="alert alert-danger alert-row" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => loadSummary()}>
            Try again
          </button>
        </div>
      )}

      <div className="grid-top">
        <ActivityForm onLogged={handleLogged} />
        <div className="stack">
          <Dashboard summary={view} />
          <WeeklyTarget summary={view} onSaved={handleTargetSaved} />
        </div>
      </div>
      <Breakdown summary={view} />
      <FactorsCard />
      <History refreshKey={refreshKey} newActivity={newActivity} />

      <footer className="site-footer">PlanetPulse &middot; week runs Monday to Sunday (IST)</footer>
    </main>
  );
}

import { useState, useCallback, useEffect, useMemo } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch, ApiError } from '../lib/api';
import { ErrorDetailModal, ErrorRow } from '../components/ErrorDetailModal';

interface TopProject {
  project_name: string;
  total: number;
}

const card: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 10,
  padding: 20,
};

const cardTitle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '6px 8px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
};

function fmt(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}



function ErrorTable({ rows, emptyMsg }: { rows: ErrorRow[]; emptyMsg: string }) {
  const [filterProject, setFilterProject] = useState('');
  const [selectedRow, setSelectedRow] = useState<ErrorRow | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const HIDDEN_PROJECTS = new Set(['document similarity matcher', 'lat', 'ai services']);
  const visibleRows = rows.filter(e => !HIDDEN_PROJECTS.has(e.project.toLowerCase()));
  const projects = Array.from(new Set(visibleRows.map(e => e.project))).sort();
  const filtered = filterProject ? visibleRows.filter(e => e.project === filterProject) : visibleRows;

  if (visibleRows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
        {emptyMsg}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} error{filtered.length !== 1 ? 's' : ''}</span>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ ...selectStyle, minWidth: 200 }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--input-bg)' }}>
              {['Project', 'File', 'Error', 'Timestamp'].map(h => (
                <th key={h} style={{
                  padding: '9px 14px', textAlign: 'left', fontWeight: 600,
                  color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)',
                  whiteSpace: 'nowrap', fontSize: 12,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={i}
                onClick={() => setSelectedRow(row)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                title="Click to view full error detail"
                style={{
                  borderBottom: '1px solid var(--card-border)',
                  background: hoveredIdx === i
                    ? 'rgba(99,102,241,0.07)'
                    : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#6366f120', color: '#818cf8' }}>
                    {row.project}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text)', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                  {row.file_name ?? '—'}
                </td>
                <td style={{ padding: '9px 14px', color: hoveredIdx === i ? '#fca5a5' : '#f87171', maxWidth: 320, wordBreak: 'break-word', transition: 'color 0.15s' }}>
                  {row.error}
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                  {fmt(row.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedRow && <ErrorDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </>
  );
}

type ComparisonPeriod = 'daily' | 'weekly' | 'custom';
type ComparisonSeries = 'mostUsed' | 'errorProducing';

function periodToRange(period: ComparisonPeriod, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  if (period === 'daily') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (period === 'weekly') {
    const start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  // custom
  const from = customFrom ? `${customFrom}T00:00:00+00:00` : '';
  const to = customTo ? `${customTo}T23:59:59+00:00` : '';
  return { from, to };
}

export function Dashboard() {
  // ── Project Comparison period toggle ──
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // Only used to trigger a refetch once "Apply" is clicked for the custom range
  const [customApplyTick, setCustomApplyTick] = useState(0);

  // ── Which series are shown on the Project Comparison chart (click legend to isolate one) ──
  const [visibleSeries, setVisibleSeries] = useState<Record<ComparisonSeries, boolean>>({
    mostUsed: true,
    errorProducing: true,
  });

  function toggleSeries(series: ComparisonSeries) {
    setVisibleSeries((prev) => {
      const otherSeries: ComparisonSeries = series === 'mostUsed' ? 'errorProducing' : 'mostUsed';
      // If both are currently visible (or only the other one is), clicking isolates this series.
      // If this series is already isolated (only one visible and it's this one), clicking restores both.
      const isolated = prev[series] && !prev[otherSeries];
      if (isolated) {
        return { mostUsed: true, errorProducing: true };
      }
      return { ...prev, [series]: true, [otherSeries]: false };
    });
  }

  // ── Top 10 projects ──
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  // ── Top 10 error projects ──
  const [topErrorProjects, setTopErrorProjects] = useState<TopProject[]>([]);
  const [topErrorLoading, setTopErrorLoading] = useState(true);

  const fetchTopProjects = useCallback((from: string, to: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    setTopLoading(true);
    apiFetch(`/api/dashboard/top-projects${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then((d: any) => setTopProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setTopLoading(false));
  }, []);

  const fetchTopErrorProjects = useCallback((from: string, to: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    setTopErrorLoading(true);
    apiFetch(`/api/dashboard/top-error-projects${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then((d: any) => setTopErrorProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setTopErrorLoading(false));
  }, []);

  useEffect(() => {
    // For custom, wait until "Apply" is clicked (customApplyTick changes) and a from/to is set.
    if (comparisonPeriod === 'custom' && !(customFrom && customTo)) return;

    const { from, to } = periodToRange(comparisonPeriod, customFrom, customTo);
    fetchTopProjects(from, to);
    fetchTopErrorProjects(from, to);

    if (comparisonPeriod === 'custom') return; // no polling for a fixed custom range
    const interval = setInterval(() => {
      const r = periodToRange(comparisonPeriod, customFrom, customTo);
      fetchTopProjects(r.from, r.to);
      fetchTopErrorProjects(r.from, r.to);
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonPeriod, customApplyTick, fetchTopProjects, fetchTopErrorProjects]);

  // ── Today's errors ──
  const [todayErrors, setTodayErrors] = useState<ErrorRow[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard/today-errors')
      .then(r => r.json())
      .then((d: any) => { setTodayErrors(d.errors ?? []); setTodayDate(d.date ?? ''); })
      .catch(() => {})
      .finally(() => setTodayLoading(false));
  }, []);

  // ── Project Comparison data (merge topProjects + topErrorProjects) ──
  const comparisonData = useMemo(() => {
    const map = new Map<string, { name: string; mostUsed: number; errorProducing: number }>();

    topProjects.forEach((p) => {
      const key = p.project_name;
      if (!map.has(key)) map.set(key, { name: key, mostUsed: 0, errorProducing: 0 });
      map.get(key)!.mostUsed = Number(p.total);
    });

    topErrorProjects.forEach((p) => {
      const key = p.project_name;
      if (!map.has(key)) map.set(key, { name: key, mostUsed: 0, errorProducing: 0 });
      map.get(key)!.errorProducing = Number(p.total);
    });

    return Array.from(map.values())
      .sort((a, b) => (b.mostUsed + b.errorProducing) - (a.mostUsed + a.errorProducing))
      .slice(0, 15)
      .map((d) => ({
        ...d,
        shortName: d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name,
      }));
  }, [topProjects, topErrorProjects]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Live error monitoring across all projects</p>
      </div>

      {/* ── Project Comparison Chart ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>Project Comparison</h3>
          {/* Legend — click a series to isolate it, click again to show both */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={() => toggleSeries('mostUsed')}
              title="Click to isolate Most used, click again to show both"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                color: visibleSeries.mostUsed ? 'var(--text-muted)' : 'rgba(255,255,255,0.25)',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                opacity: visibleSeries.mostUsed ? 1 : 0.5, transition: 'opacity 0.15s, color 0.15s',
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#7c6ff7', flexShrink: 0, opacity: visibleSeries.mostUsed ? 1 : 0.35 }} />
              Most used
            </button>
            <button
              onClick={() => toggleSeries('errorProducing')}
              title="Click to isolate Error producing, click again to show both"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                color: visibleSeries.errorProducing ? 'var(--text-muted)' : 'rgba(255,255,255,0.25)',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                opacity: visibleSeries.errorProducing ? 1 : 0.5, transition: 'opacity 0.15s, color 0.15s',
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#f97316', flexShrink: 0, opacity: visibleSeries.errorProducing ? 1 : 0.35 }} />
              Error producing
            </button>
          </div>
        </div>

        {/* Period toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'flex-end' }}>
          <div style={{
            display: 'flex', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
            borderRadius: 8, padding: 3, gap: 2,
          }}>
            {(['daily', 'weekly', 'custom'] as ComparisonPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setComparisonPeriod(p)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  background: comparisonPeriod === p ? '#6366f1' : 'transparent',
                  color: comparisonPeriod === p ? '#fff' : 'var(--text-muted)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {comparisonPeriod === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={{ ...selectStyle, colorScheme: 'dark' } as React.CSSProperties}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={{ ...selectStyle, colorScheme: 'dark' } as React.CSSProperties}
              />
              <button
                onClick={() => setCustomApplyTick(t => t + 1)}
                disabled={!customFrom || !customTo}
                style={{
                  padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  cursor: (!customFrom || !customTo) ? 'not-allowed' : 'pointer',
                  background: '#6366f1', color: '#fff', border: 'none',
                  opacity: (!customFrom || !customTo) ? 0.5 : 1,
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {topLoading || topErrorLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : comparisonData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>No project data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={comparisonData}
              margin={{ top: 16, right: 16, left: 0, bottom: 60 }}
              barCategoryGap="30%"
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const full = comparisonData.find((d) => d.shortName === label)?.name ?? label;
                  return (
                    <div style={{
                      background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '10px 14px', fontSize: 13,
                    }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 8 }}>{full}</div>
                      {payload.map((p: any) => (
                        <div key={p.dataKey} style={{ color: '#94a3b8', marginBottom: 3 }}>
                          <span style={{ color: p.fill, fontWeight: 700 }}>■ </span>
                          {p.dataKey === 'mostUsed' ? 'Most used' : 'Error producing'}:{' '}
                          <span style={{ color: '#fff', fontWeight: 700 }}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {visibleSeries.mostUsed && (
                <Bar dataKey="mostUsed" fill="#7c6ff7" radius={[4, 4, 0, 0]} maxBarSize={32} />
              )}
              {visibleSeries.errorProducing && (
                <Bar dataKey="errorProducing" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Today's Errors ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>
            📅 Today's Errors
          </h3>
          {todayDate && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
              background: 'rgba(239,68,68,0.12)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.25)',
            }}>
              {todayDate} — {todayErrors.length} error{todayErrors.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {todayLoading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading today's errors…</div>
        ) : (
          <ErrorTable rows={todayErrors} emptyMsg="No errors today — all systems running clean." />
        )}
      </div>

    </div>
  );
}
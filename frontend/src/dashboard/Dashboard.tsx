import { useState, useCallback, useEffect, useMemo } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch, ApiError } from '../lib/api';

interface ErrorRow {
  project: string;
  file_name: string | null;
  error: string;
  error_hash?: string | null;
  error_detail?: string | null;
  timestamp: string | null;
}

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

function toISO(y: string, m: string, d: string, end = false) {
  if (!y || !m || !d) return '';
  const mm = m.padStart(2, '0');
  const dd = d.padStart(2, '0');
  return end ? `${y}-${mm}-${dd}T23:59:59+00:00` : `${y}-${mm}-${dd}T00:00:00+00:00`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function DatePicker({ label, year, month, day, onChange }: {
  label: string; year: string; month: string; day: string;
  onChange: (y: string, m: string, d: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear }, (_, i) => String(currentYear - i));
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={year} onChange={e => onChange(e.target.value, month, day)} style={selectStyle}>
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => onChange(year, e.target.value, day)} style={selectStyle}>
          <option value="">Month</option>
          {MONTHS.map((mn, i) => <option key={i+1} value={String(i+1)}>{mn}</option>)}
        </select>
        <select value={day} onChange={e => onChange(year, month, e.target.value)} style={selectStyle}>
          <option value="">Day</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  );
}

function ErrorDetailModal({ row, onClose }: { row: ErrorRow; onClose: () => void }) {
  const navigate = useNavigate();
  const [solutionText, setSolutionText] = useState('');
  const [savedSolution, setSavedSolution] = useState('');
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // Fetch existing solution on open
  React.useEffect(() => {
    if (!row.error_hash) return;
    apiFetch(`/api/error-solution/${encodeURIComponent(row.error_hash)}`)
      .then(r => r.json())
      .then(d => {
        if ((d as any).solution) { setSavedSolution((d as any).solution); setSolutionText((d as any).solution); }
      })
      .catch(() => {});
  }, [row.error_hash]);

  async function handleSave() {
    if (!row.error_hash) return;
    setSaving(true);
    try {
      await apiFetch('/api/error-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: row.error_hash, solution: solutionText }),
      });
      setSavedSolution(solutionText);
      setMode('view');
      setResolveError('');
    } catch (err) {
      setResolveError(err instanceof ApiError ? err.label : 'Failed to save solution.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!row.error_hash) return;
    try {
      await apiFetch(`/api/error-solution/${encodeURIComponent(row.error_hash)}`, { method: 'DELETE' });
    } catch {
      // best-effort delete
    }
    setSavedSolution('');
    setSolutionText('');
    setMode('view');
  }

  function handleCancel() {
    setSolutionText(savedSolution);
    setMode('view');
  }

  async function handleResolve() {
    if (!row.error_hash || !row.project) return;
    if (!savedSolution.trim()) {
      setResolveError('A solution must be added before marking this error as resolved.');
      return;
    }
    setResolveError('');
    if (!window.confirm(`Mark "${row.error}" in ${row.project} as resolved? It will disappear from the dashboard.`)) return;
    setResolving(true);
    try {
      await apiFetch('/api/error-solution/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: row.error_hash, project_name: row.project }),
      });
      setResolved(true);
    } catch (err) {
      setResolveError(err instanceof ApiError ? err.label : 'Failed to resolve error.');
    } finally {
      setResolving(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--card-border)',
        borderRadius: 14, width: '100%', maxWidth: 820,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 26px', borderBottom: '1px solid var(--card-border)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Error Detail</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: '#6366f120', color: '#818cf8', fontWeight: 700 }}>
                {row.project}
              </span>
              {row.file_name && (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontFamily: 'ui-monospace,monospace' }}>
                  {row.file_name}
                </span>
              )}
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#f87171', fontWeight: 700 }}>
                {row.error}
              </span>
              {row.error_hash && (
                <button onClick={() => { onClose(); navigate(`/breaks/${row.error_hash}`); }}
                  style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontWeight: 600, border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer' }}>
                  View Full Details →
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)',
            color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer',
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: '22px 26px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Resolved banner */}
          {resolved && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ✅ Error marked as resolved. It will disappear from the dashboard on next refresh.
            </div>
          )}

          {/* Error Detail section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Stack Trace
            </div>
            {row.error_detail ? (
              <pre style={{
                margin: 0, fontFamily: 'ui-monospace, monospace', fontSize: 12,
                lineHeight: 1.8, color: '#fca5a5',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 8, padding: '18px 20px',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                minHeight: 140,
              }}>
                {row.error_detail}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13,
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                No detailed error information available for this entry.
              </div>
            )}

            {/* Known solution banner — shown inline when a solution already exists */}
            {savedSolution && (
              <div style={{
                marginTop: 14,
                borderRadius: 8,
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'rgba(99,102,241,0.07)',
                overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px',
                  background: 'rgba(99,102,241,0.12)',
                  borderBottom: '1px solid rgba(99,102,241,0.2)',
                }}>
                  <span style={{ fontSize: 14 }}>💡</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Known Solution for this Error
                  </span>
                </div>
                <div style={{
                  padding: '14px 16px', fontSize: 13, lineHeight: 1.7,
                  color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {savedSolution}
                </div>
              </div>
            )}
          </div>

          {/* Solution section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                💡 Solution
              </div>
              {mode === 'view' && !savedSolution && (
                <button
                  onClick={() => { setSolutionText(''); setMode('create'); }}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', background: 'rgba(99,102,241,0.15)',
                    color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                  }}
                >
                  + Create Solution
                </button>
              )}
            </div>

            {/* View mode */}
            {mode === 'view' && (
              savedSolution ? (
                <div>
                  <div style={{
                    padding: '16px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                    color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    marginBottom: 10,
                  }}>
                    {savedSolution}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setSolutionText(savedSolution); setMode('edit'); }} style={{
                      padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                    }}>✏️ Edit</button>
                    <button onClick={handleDelete} style={{
                      padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: 'rgba(239,68,68,0.1)',
                      color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
                    }}>🗑 Delete</button>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '20px', borderRadius: 8, textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  color: 'var(--text-muted)', fontSize: 13,
                }}>
                  No solution added yet. Click "Create Solution" to add one.
                </div>
              )
            )}

            {/* Create / Edit mode */}
            {(mode === 'create' || mode === 'edit') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={solutionText}
                  onChange={e => setSolutionText(e.target.value)}
                  placeholder="Describe the solution or fix for this error…"
                  autoFocus
                  style={{
                    width: '100%', minHeight: 120, padding: '14px 16px',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, color: 'var(--text)', fontSize: 13,
                    lineHeight: 1.7, resize: 'vertical', outline: 'none',
                    fontFamily: 'var(--font)',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={handleCancel} style={{
                    padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', background: 'transparent',
                    color: 'var(--text-muted)', border: '1px solid var(--card-border)',
                  }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '7px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    background: '#6366f1', color: '#fff', border: 'none',
                    opacity: saving ? 0.7 : 1,
                  }}>{saving ? 'Saving…' : 'Save Solution'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — Mark as Resolved */}
        <div style={{ padding: '14px 26px', borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          {resolveError && (
            <span style={{
              fontSize: 12, color: '#fbbf24', fontWeight: 500,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 6, padding: '5px 12px', flex: 1,
            }}>
              ⚠ {resolveError}
            </span>
          )}
          {resolved ? (
            <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>✅ Resolved</span>
          ) : (
            <button
              onClick={handleResolve}
              disabled={resolving}
              title={!savedSolution.trim() ? 'Add a solution before resolving' : ''}
              style={{
                padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: resolving ? 'not-allowed' : 'pointer',
                background: !savedSolution.trim()
                  ? 'rgba(255,255,255,0.04)'
                  : resolving ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)',
                color: !savedSolution.trim() ? 'var(--text-muted)' : '#34d399',
                border: !savedSolution.trim()
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(16,185,129,0.3)',
                opacity: resolving ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              {resolving ? 'Resolving…' : '✓ Mark as Resolved'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
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

export function Dashboard() {
  // ── Top 10 projects ──
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  // ── Top 10 error projects ──
  const [topErrorProjects, setTopErrorProjects] = useState<TopProject[]>([]);
  const [topErrorLoading, setTopErrorLoading] = useState(true);

  const fetchTopProjects = useCallback(() => {
    apiFetch('/api/dashboard/top-projects')
      .then(r => r.json())
      .then((d: any) => setTopProjects((d.projects ?? []).filter((p: any) => !['lat', 'ai services', 'document similarity matcher'].includes(p.project_name?.toLowerCase()))))
      .catch(() => {})
      .finally(() => setTopLoading(false));
  }, []);

  const fetchTopErrorProjects = useCallback(() => {
    apiFetch('/api/dashboard/top-error-projects')
      .then(r => r.json())
      .then((d: any) => setTopErrorProjects((d.projects ?? []).filter((p: any) => !['lat', 'ai services', 'document similarity matcher'].includes(p.project_name?.toLowerCase()))))
      .catch(() => {})
      .finally(() => setTopErrorLoading(false));
  }, []);

  useEffect(() => {
    fetchTopProjects();
    fetchTopErrorProjects();
    const interval = setInterval(() => { fetchTopProjects(); fetchTopErrorProjects(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchTopProjects, fetchTopErrorProjects]);

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

  // ── Date range errors ──
  const [fromY, setFromY] = useState(''); const [fromM, setFromM] = useState(''); const [fromD, setFromD] = useState('');
  const [toY, setToY]     = useState(''); const [toM, setToM]     = useState(''); const [toD, setToD]     = useState('');
  const [rangeErrors, setRangeErrors] = useState<ErrorRow[]>([]);
  const [rangeLoading, setRangeLoading] = useState(true);
  const [searched, setSearched] = useState(true);

  const fetchRange = useCallback(async (fy = fromY, fm = fromM, fd = fromD, ty = toY, tm = toM, td = toD) => {
    const from = toISO(fy, fm, fd, false);
    const to   = toISO(ty, tm, td, true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    setRangeLoading(true);
    setSearched(true);
    try {
      const r = await apiFetch(`/api/dashboard/errors?${params}`);
      const d = await r.json() as any;
      setRangeErrors(d.errors ?? []);
    } catch {
      setRangeErrors([]);
    } finally {
      setRangeLoading(false);
    }
  }, [fromY, fromM, fromD, toY, toM, toD]);

  // Auto-fetch all errors on mount (no date filter = all data)
  useEffect(() => { fetchRange('', '', '', '', '', ''); }, []);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>Project Comparison</h3>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#7c6ff7', flexShrink: 0 }} />
              Most used
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#f97316', flexShrink: 0 }} />
              Error producing
            </span>
          </div>
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
              <Bar dataKey="mostUsed" fill="#7c6ff7" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="errorProducing" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Two column charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>

        {/* Left — Top 10 Most Used */}
        <div style={card}>
          <h3 style={cardTitle}>🏆 Top 10 Most Used Projects</h3>
          {topLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : (() => {
            const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
            const chartData = topProjects.map((p, i) => ({
              name: p.project_name.length > 14 ? p.project_name.slice(0, 13) + '…' : p.project_name,
              fullName: p.project_name, total: Number(p.total), color: colors[i % colors.length],
            }));
            const UsedTooltip = ({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  <div style={{ color: d.color, fontWeight: 700, marginBottom: 4 }}>{d.fullName}</div>
                  <div style={{ color: '#94a3b8' }}>Files Processed: <span style={{ color: '#fff', fontWeight: 700 }}>{d.total}</span></div>
                </div>
              );
            };
            return (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 80 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip content={<UsedTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total" radius={[6,6,0,0]} maxBarSize={48} label={{ position: 'top', fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Right — Top 10 Error Projects */}
        <div style={card}>
          <h3 style={cardTitle}>🔴 Top 10 Error Producing Projects</h3>
          {topErrorLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : topErrorProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#10b981', fontSize: 13 }}>✅ No errors found across all projects.</div>
          ) : (() => {
            const errColors = ['#ef4444','#f97316','#f59e0b','#ec4899','#8b5cf6','#6366f1','#3b82f6','#10b981','#14b8a6','#84cc16'];
            const chartData = topErrorProjects.map((p, i) => ({
              name: p.project_name.length > 14 ? p.project_name.slice(0, 13) + '…' : p.project_name,
              fullName: p.project_name, total: Number(p.total), color: errColors[i % errColors.length],
            }));
            const ErrTooltip = ({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: '#1e293b', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  <div style={{ color: d.color, fontWeight: 700, marginBottom: 4 }}>{d.fullName}</div>
                  <div style={{ color: '#94a3b8' }}>Total Errors: <span style={{ color: '#f87171', fontWeight: 700 }}>{d.total}</span></div>
                </div>
              );
            };
            return (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 80 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip content={<ErrTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total" radius={[6,6,0,0]} maxBarSize={48} label={{ position: 'top', fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
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

      {/* ── Date Range Filter ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={cardTitle}>🔍 Filter by Date Range</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
          <DatePicker label="From" year={fromY} month={fromM} day={fromD}
            onChange={(y,m,d) => { setFromY(y); setFromM(m); setFromD(d); }} />
          <DatePicker label="To" year={toY} month={toM} day={toD}
            onChange={(y,m,d) => { setToY(y); setToM(m); setToD(d); }} />
          <button onClick={() => fetchRange(fromY, fromM, fromD, toY, toM, toD)} style={{
            padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
            alignSelf: 'flex-end',
          }}>
            {rangeLoading ? 'Fetching…' : 'Fetch Errors'}
          </button>
        </div>
      </div>

      {/* Range results */}
      {searched && !rangeLoading && (
        <div style={card}>
          <h3 style={cardTitle}>Results</h3>
          <ErrorTable rows={rangeErrors} emptyMsg="No errors found in the selected date range." />
        </div>
      )}
      {rangeLoading && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Fetching errors across all projects…
        </div>
      )}
    </div>
  );
}

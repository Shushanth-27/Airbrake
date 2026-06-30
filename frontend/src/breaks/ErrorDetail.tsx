/**
 * Error Detail page — shows full error info, stack trace, occurrences,
 * and a solution section where users can save/update solutions for recurring errors.
 *
 * The solution is mapped to the error_hash, so if the same error occurs again,
 * the previously saved solution is automatically displayed.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

interface Occurrence {
  file_name: string | null;
  timestamp: string | null;
  failure_count: number;
}

interface SolutionData {
  solution: string | null;
  updated_at: string | null;
}

interface ErrorDetailData {
  project_name: string;
  error_message: string;
  error_detail: string | null;
  error_hash: string;
  occurrence_count: number;
  first_seen: string | null;
  last_seen: string | null;
  status: 'new' | 'existing' | 'regression';
  occurrences: Occurrence[];
  solution: SolutionData | null;
}

function fmt(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    new:        { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', label: '● New' },
    existing:   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', label: '◎ Existing' },
    regression: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', label: '⚠ Regression' },
  };
  const s = styles[status] ?? styles.new;
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

export function ErrorDetail() {
  const { errorHash } = useParams<{ errorHash: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ErrorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Solution state
  const [solutionText, setSolutionText] = useState('');
  const [solutionSaved, setSolutionSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!errorHash) return;
    setLoading(true);
    apiFetch(`/api/breaks/detail/${errorHash}`)
      .then(r => r.json())
      .then((d: ErrorDetailData) => {
        setData(d);
        if (d.solution?.solution) {
          setSolutionText(d.solution.solution);
          setSolutionSaved(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
        setLoading(false);
      });
  }, [errorHash]);

  const handleSaveSolution = async () => {
    if (!errorHash || !solutionText.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/api/error-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: errorHash, solution: solutionText.trim() }),
      });
      setSolutionSaved(true);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save solution:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSolution = async () => {
    if (!errorHash) return;
    setSaving(true);
    try {
      await apiFetch(`/api/error-solution/${errorHash}`, { method: 'DELETE' });
      setSolutionText('');
      setSolutionSaved(false);
      setEditing(false);
    } catch (e) {
      console.error('Failed to delete solution:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading error details…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Error not found.</p>
        <button onClick={() => navigate('/breaks')} style={linkBtnStyle}>← Back to Breaks</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back button */}
      <button onClick={() => navigate('/breaks')} style={linkBtnStyle}>← Back to Breaks</button>

      {/* Header */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {data.project_name}
            </span>
            <h2 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: '#f87171', fontFamily: 'ui-monospace, monospace' }}>
              {data.error_message}
            </h2>
          </div>
          <StatusBadge status={data.status} />
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Occurrences: <strong style={{ color: 'var(--text)' }}>{data.occurrence_count}</strong></span>
          <span>First seen: <strong style={{ color: 'var(--text)' }}>{fmt(data.first_seen)}</strong></span>
          <span>Last seen: <strong style={{ color: 'var(--text)' }}>{fmt(data.last_seen)}</strong></span>
        </div>
      </div>

      {/* Stack Trace */}
      {data.error_detail && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={sectionTitle}>Stack Trace</h3>
          <pre style={{
            background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8,
            fontSize: 12, lineHeight: 1.6, overflow: 'auto', maxHeight: 400,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {data.error_detail}
          </pre>
        </div>
      )}

      {/* Solution Section */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={sectionTitle}>
          Solution
          {solutionSaved && data.solution?.updated_at && (
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 12 }}>
              Last updated: {fmt(data.solution.updated_at)}
            </span>
          )}
        </h3>

        {solutionSaved && !editing ? (
          <div>
            <div style={{
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', color: 'var(--text)',
            }}>
              {solutionText}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setEditing(true)} style={btnSecondary}>Edit Solution</button>
              <button onClick={handleDeleteSolution} disabled={saving}
                style={{ ...btnSecondary, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
                Delete
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              This solution is linked to error hash <code>{data.error_hash?.slice(0, 12)}…</code> — it will be shown automatically if this error recurs.
            </p>
          </div>
        ) : (
          <div>
            {!solutionSaved && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                No solution saved yet. Add a solution so it&apos;s automatically shown if this error recurs.
              </p>
            )}
            <textarea
              value={solutionText}
              onChange={e => setSolutionText(e.target.value)}
              placeholder="Describe the root cause and fix for this error…"
              rows={5}
              style={{
                width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 8, color: 'var(--text)', padding: 12, fontSize: 13,
                lineHeight: 1.6, resize: 'vertical', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={handleSaveSolution} disabled={saving || !solutionText.trim()}
                style={{
                  ...btnPrimary,
                  opacity: (saving || !solutionText.trim()) ? 0.5 : 1,
                  cursor: (saving || !solutionText.trim()) ? 'not-allowed' : 'pointer',
                }}>
                {saving ? 'Saving…' : (solutionSaved ? 'Update Solution' : 'Save Solution')}
              </button>
              {editing && (
                <button onClick={() => { setEditing(false); setSolutionText(data.solution?.solution || ''); }}
                  style={btnSecondary}>Cancel</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Occurrences */}
      {data.occurrences.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={sectionTitle}>Occurrences ({data.occurrences.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th style={thStyle}>File</th>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Failures</th>
              </tr>
            </thead>
            <tbody>
              {data.occurrences.slice(0, 20).map((o, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={tdStyle}>{o.file_name || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{fmt(o.timestamp)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{o.failure_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.occurrences.length > 20 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Showing 20 of {data.occurrences.length} occurrences
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 10,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#818cf8',
  cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
  background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 6, fontSize: 13,
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--card-border)', cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600,
  color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: 'var(--text)',
};

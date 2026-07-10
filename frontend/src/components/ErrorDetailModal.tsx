import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '../lib/api';

export interface ErrorRow {
  project: string;
  file_name: string | null;
  error: string;
  error_hash?: string | null;
  error_detail?: string | null;
  timestamp: string | null;
}

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
  file_name?: string | null;
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

export function ErrorDetailModal({ row, errorHash, projectName: projectNameProp, onClose }: { row?: ErrorRow; errorHash?: string; projectName?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const effectiveErrorHash = row?.error_hash || errorHash;
  const isModal = !!row;

  const [data, setData] = useState<ErrorDetailData | null>(null);
  const [loading, setLoading] = useState(!!effectiveErrorHash);
  const [notFound, setNotFound] = useState(false);

  const [solutionText, setSolutionText] = useState('');
  const [solutionSaved, setSolutionSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [resolveError, setResolveError] = useState('');

  useEffect(() => {
    if (!effectiveErrorHash) return;
    setLoading(true);
    const query = projectNameProp ? `?project_name=${encodeURIComponent(projectNameProp)}` : '';
    apiFetch(`/api/breaks/detail/${encodeURIComponent(effectiveErrorHash)}${query}`)
      .then((res) => {
        if (!res.ok) throw res;
        return res.json();
      })
      .then((detail: ErrorDetailData) => {
        setData(detail);
        setNotFound(false);
      })
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [effectiveErrorHash, projectNameProp]);

  useEffect(() => {
    const solution = data?.solution?.solution ?? '';
    setSolutionText(solution);
    setSolutionSaved(!!solution);
    setEditing(false);
  }, [data?.solution?.solution]);

  const projectName = data?.project_name ?? row?.project ?? projectNameProp ?? '';
  const errorMessage = data?.error_message ?? row?.error ?? '';
  const errorDetail = data?.error_detail ?? row?.error_detail ?? null;
  const errorHashValue = data?.error_hash ?? row?.error_hash ?? '';
  const displayFile = data?.file_name ?? row?.file_name ?? '';
  const status = data?.status;
  const occurrences = data?.occurrences ?? [];

  async function handleSave() {
    if (!effectiveErrorHash || !solutionText.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/api/knowledge_base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: effectiveErrorHash, solution: solutionText.trim() }),
      });
      setSolutionSaved(true);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save solution:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!effectiveErrorHash) return;
    setSaving(true);
    try {
      await apiFetch(`/api/knowledge_base/${encodeURIComponent(effectiveErrorHash)}`, { method: 'DELETE' });
      setSolutionText('');
      setSolutionSaved(false);
      setEditing(false);
    } catch (err) {
      console.error('Failed to delete solution:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve() {
    if (!effectiveErrorHash || !projectName) return;
    if (!solutionText.trim()) {
      setResolveError('A solution must be added before marking this error as resolved.');
      return;
    }
    setResolveError('');
    if (!window.confirm(`Mark "${errorMessage}" in ${projectName} as resolved? It will disappear from the dashboard.`)) return;
    setResolving(true);
    try {
      await apiFetch('/api/knowledge_base/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: effectiveErrorHash, project_name: projectName }),
      });
      setResolved(true);
    } catch (err) {
      setResolveError(err instanceof ApiError ? err.label : 'Failed to resolve error.');
    } finally {
      setResolving(false);
    }
  }

  if (!effectiveErrorHash) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: isModal ? 0 : '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading error details…
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: isModal ? 0 : '60px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Error not found.</p>
        <button onClick={onClose} style={linkBtnStyle}>← Back to Breaks</button>
      </div>
    );
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 14, width: '100%', maxWidth: 900, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 26px', borderBottom: '1px solid var(--card-border)' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Error Detail</div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, max-content))' }}>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: '#6366f120', color: '#818cf8', fontWeight: 700 }}>
              Project: {projectName || 'Unknown'}
            </span>
            {displayFile && (
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontFamily: 'ui-monospace,monospace' }}>
                File: {displayFile}
              </span>
            )}
            {errorMessage && (
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#f87171', fontWeight: 700 }}>
                Error: {errorMessage}
              </span>
            )}
            {errorHashValue && (
              <button onClick={() => { onClose(); navigate(`/breaks/${encodeURIComponent(errorHashValue)}`); }}
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

      <div style={{ overflow: 'auto', padding: '22px 26px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {data?.status && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={data.status} />
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Stack Trace
          </div>
          {errorDetail ? (
            <pre style={{
              margin: 0, fontFamily: 'ui-monospace, monospace', fontSize: 12,
              lineHeight: 1.8, color: '#fca5a5',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 8, padding: '18px 20px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: 140,
            }}>
              {errorDetail}
            </pre>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13,
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              No detailed error information available for this entry.
            </div>
          )}

          {data?.solution?.solution && (
            <div style={{ marginTop: 14, padding: 16, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>💡</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Suggested solution from knowledge base
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)', fontSize: 13, lineHeight: 1.7 }}>
                {data.solution.solution}
              </div>
              {data.solution.updated_at && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  Last updated: {new Date(data.solution.updated_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              💡 Solution
            </div>
            {solutionSaved && !editing && (
              <button
                onClick={() => { setSolutionText(solutionText); setEditing(true); }}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', background: 'rgba(99,102,241,0.15)',
                  color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                }}
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {solutionSaved && !editing ? (
            <div>
              <div style={{
                padding: '16px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                marginBottom: 10,
              }}>
                {solutionText}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(true)} style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', background: 'rgba(99,102,241,0.15)',
                  color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                }}>✏️ Edit</button>
                <button onClick={handleDelete} disabled={saving}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
                  }}>
                  🗑 Delete
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                This solution is linked to error hash <code>{errorHashValue?.slice(0, 12)}…</code> — it will be shown automatically if this error recurs.
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
                <button onClick={handleSave} disabled={saving || !solutionText.trim()}
                  style={{
                    ...btnPrimary,
                    opacity: (saving || !solutionText.trim()) ? 0.5 : 1,
                    cursor: (saving || !solutionText.trim()) ? 'not-allowed' : 'pointer',
                  }}>
                  {saving ? 'Saving…' : (solutionSaved ? 'Update Solution' : 'Save Solution')}
                </button>
                {editing && (
                  <button onClick={() => { setEditing(false); setSolutionText(data?.solution?.solution ?? ''); }}
                    style={btnSecondary}>Cancel</button>
                )}
              </div>
            </div>
          )}
        </div>

        {occurrences.length > 0 && (
          <div style={{ ...cardStyle, marginTop: 16 }}>
            <h3 style={sectionTitle}>Occurrences ({occurrences.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th style={thStyle}>File</th>
                  <th style={thStyle}>Timestamp</th>
                  <th style={thStyle}>Failures</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((o, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={tdStyle}>{o.file_name || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{fmt(o.timestamp)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{o.failure_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            disabled={resolving || !solutionText.trim()}
            title={!solutionText.trim() ? 'Add a solution before resolving' : ''}
            style={{
              padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: resolving ? 'not-allowed' : 'pointer',
              background: !solutionText.trim()
                ? 'rgba(255,255,255,0.04)'
                : resolving ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)',
              color: !solutionText.trim() ? 'var(--text-muted)' : '#34d399',
              border: !solutionText.trim()
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
  );

  if (isModal) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 16px', minHeight: '100vh' }}>
      {content}
    </div>
  );
}

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

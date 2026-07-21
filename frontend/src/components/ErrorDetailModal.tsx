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
  id?: string | null;
  version?: number | null;
  confidence_score?: number | null;
  usage_count?: number | null;
  created_by?: string | null;
  created_at?: string | null;
}

interface SimilarSolution {
  solution: string;
  created_by: string | null;
  created_at: string | null;
}

interface AiRecommendation {
  recommendation: string | null;
  solutions: SimilarSolution[];
}

interface DuplicatePromptState {
  mode: 'save' | 'improve';
  decision?: string | null;
  similarity?: number | null;
  solution_id?: string | null;
  solution?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  version?: number | null;
  confidence_score?: number | null;
  usage_count?: number | null;
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
  error_status?: string | null;
  occurrences: Occurrence[];
  solution: SolutionData | null;
  ai_recommendation?: AiRecommendation | null;
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
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [moreSolutions, setMoreSolutions] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [solutionActionError, setSolutionActionError] = useState('');
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePromptState | null>(null);

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
    setResolved(data?.error_status === 'resolved');
  }, [data?.solution?.solution, data?.error_status]);

  const projectName = data?.project_name ?? row?.project ?? projectNameProp ?? '';
  const errorMessage = data?.error_message ?? row?.error ?? '';
  const errorDetail = data?.error_detail ?? row?.error_detail ?? null;
  const errorHashValue = data?.error_hash ?? row?.error_hash ?? '';
  const displayFile = data?.file_name ?? row?.file_name ?? '';
  const status = data?.status;
  const errorStatus = data?.error_status;
  const occurrences = data?.occurrences ?? [];
  const isTerminalState = errorStatus === 'resolved' || errorStatus === 'reopened';

  async function handleSave(forceCreate = false) {
    if (!effectiveErrorHash || !solutionText.trim()) return;
    setSaving(true);
    setSolutionActionError('');
    setDuplicatePrompt(null);
    try {
      const payload: Record<string, unknown> = {
        error_hash: effectiveErrorHash,
        solution: solutionText.trim(),
        project_name: projectName,
        check_only: !forceCreate,
      };
      if (data?.solution?.id && solutionSaved) {
        payload.base_solution_id = data.solution.id;
      }
      if (forceCreate) {
        payload.create_anyway = true;
      }

      const previewRes = await apiFetch('/api/knowledge_base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const preview = await previewRes.json();
      if (preview?.duplicate_prompt && !forceCreate) {
        setDuplicatePrompt({
          mode: editing ? 'improve' : 'save',
          decision: preview.decision,
          similarity: preview.similarity,
          solution_id: preview.solution_id,
          solution: preview.solution,
          created_by: preview.created_by,
          version: preview.version,
          confidence_score: preview.confidence_score,
          usage_count: preview.usage_count,
          created_at: preview.created_at,
        });
        return;
      }

      const finalPayload = { ...payload, check_only: false };
      const res = await apiFetch('/api/knowledge_base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      const saved = await res.json();
      setSolutionSaved(true);
      setEditing(false);
      setData((prev) => prev ? { ...prev, solution: { solution: saved.solution, updated_at: saved.created_at, id: saved.id, version: saved.version, confidence_score: saved.confidence_score, usage_count: saved.usage_count, created_by: saved.created_by, created_at: saved.created_at } } : prev);
    } catch (err) {
      console.error('Failed to save solution:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUseDuplicateSolution() {
    if (!effectiveErrorHash || !projectName || !duplicatePrompt?.solution_id) return;
    setSaving(true);
    try {
      await apiFetch('/api/knowledge_base/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_id: duplicatePrompt.solution_id, error_hash: effectiveErrorHash, project_name: projectName }),
      });
      setDuplicatePrompt(null);
      navigate('/dashboard');
    } catch (err) {
      setSolutionActionError(err instanceof ApiError ? err.label : 'Failed to use existing solution.');
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
      setData((prev) => prev ? { ...prev, solution: null } : prev);
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
      navigate('/dashboard');
    } catch (err) {
      setResolveError(err instanceof ApiError ? err.label : 'Failed to resolve error.');
    } finally {
      setResolving(false);
    }
  }

  async function handleImproveSolution() {
    setSolutionActionError('');
    setEditing(true);
    setSolutionText(data?.solution?.solution ?? solutionText);
  }

  async function handleReopen() {
    if (!effectiveErrorHash || !projectName) return;
    setResolving(true);
    try {
      await apiFetch('/api/knowledge_base/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: effectiveErrorHash, project_name: projectName }),
      });
      setData((prev) => prev ? { ...prev, error_status: 'reopened' } : prev);
      setResolved(false);
      navigate('/dashboard');
    } catch (err) {
      setSolutionActionError(err instanceof ApiError ? err.label : 'Failed to reopen issue.');
    } finally {
      setResolving(false);
    }
  }

  async function handleUseSolution() {
    if (!effectiveErrorHash || !projectName || !data?.solution?.id) return;
    setSaving(true);
    try {
      await apiFetch('/api/knowledge_base/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_id: data.solution.id, error_hash: effectiveErrorHash, project_name: projectName }),
      });
      navigate('/dashboard');
    } catch (err) {
      setSolutionActionError(err instanceof ApiError ? err.label : 'Failed to use solution.');
    } finally {
      setSaving(false);
    }
  }

  async function handleShowVersions() {
    if (!data?.solution?.id) return;
    if (showVersions && versions.length) {
      setShowVersions(false);
      return;
    }
    setLoadingVersions(true);
    try {
      const res = await apiFetch(`/api/knowledge_base/${encodeURIComponent(data.solution.id)}/versions`);
      const json = await res.json();
      setVersions(json.versions ?? []);
      setShowVersions(true);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleUseVersion(versionId: string) {
    if (!effectiveErrorHash || !projectName) return;
    setSaving(true);
    try {
      await apiFetch('/api/knowledge_base/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_id: versionId, error_hash: effectiveErrorHash, project_name: projectName }),
      });
      navigate('/dashboard');
    } catch (err) {
      setSolutionActionError(err instanceof ApiError ? err.label : 'Failed to use version.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVersion(versionId: string) {
    try {
      await apiFetch(`/api/knowledge_base/${encodeURIComponent(data?.solution?.id ?? '')}/versions/${encodeURIComponent(versionId)}`, { method: 'DELETE' });
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
    } catch (err) {
      setSolutionActionError(err instanceof ApiError ? err.label : 'Failed to delete version.');
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Error Details
          </div>
          {errorMessage && (
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', lineHeight: 1.4, marginBottom: 14, wordBreak: 'break-word' }}>
              {errorMessage}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Project</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>{projectName || 'Unknown'}</div>
            </div>
            {displayFile && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>File</div>
                <div style={{ fontSize: 13, fontFamily: 'ui-monospace,monospace', color: 'var(--text)' }}>{displayFile}</div>
              </div>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)',
          color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer',
          width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginLeft: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ overflow: 'auto', padding: '22px 26px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {data?.status && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={data.status} />
          </div>
        )}

        {/* Stack Trace — only rendered when errorDetail actually exists */}
        {errorDetail && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Stack Trace
            </div>
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
          </div>
        )}

        {data?.ai_recommendation?.recommendation && (
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Recommendation
              </span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#0f172a' }}>
              {data.ai_recommendation.recommendation}
            </div>
          </div>
        )}

        {data?.solution?.solution && (
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suggested solution from knowledge base
              </span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)', fontSize: 13, lineHeight: 1.7 }}>
              {data.solution.solution}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              {data.solution.created_by && <span>Developer: {data.solution.created_by}</span>}
              {data.solution.created_at && <span>Created: {fmt(data.solution.created_at)}</span>}
              {typeof data.solution.confidence_score === 'number' && <span>Confidence: {data.solution.confidence_score.toFixed(2)}</span>}
              {typeof data.solution.usage_count === 'number' && <span>Usage: {data.solution.usage_count}</span>}
              {typeof data.solution.version === 'number' && <span>Version: {data.solution.version}</span>}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleUseSolution} disabled={saving} style={{ ...btnPrimary, padding: '6px 12px' }}>Use Solution</button>
              <button onClick={handleImproveSolution} style={{ ...btnSecondary, padding: '6px 12px' }}>Improve Solution</button>
              <button onClick={handleShowVersions} disabled={loadingVersions} style={{ ...btnSecondary, padding: '6px 12px' }}>{loadingVersions ? 'Loading…' : (showVersions ? 'Hide Versions' : 'Show Versions')}</button>
              <button onClick={handleDelete} disabled={saving} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>Delete</button>
            </div>
            {solutionActionError && <div style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>{solutionActionError}</div>}
            {showVersions && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                {versions.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No other versions yet.</div> : versions.map((version) => (
                  <div key={version.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>Version {version.version ?? 1}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{version.solution}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                      <button onClick={() => handleUseVersion(version.id)} style={{ ...btnPrimary, padding: '5px 10px' }}>Use Version</button>
                      <button onClick={() => handleDeleteVersion(version.id)} style={{ ...btnSecondary, padding: '5px 10px' }}>Delete Version</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                {editing && (
                  <button onClick={() => { setEditing(false); setSolutionText(data?.solution?.solution ?? ''); }}
                    style={btnSecondary}>Cancel</button>
                )}
              </div>
            </div>
          )}
        </div>


      </div>

      <div style={{ padding: '14px 26px', borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        {duplicatePrompt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 20, boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Duplicate solution detected
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
                {duplicatePrompt.mode === 'improve' ? 'Your updated solution is nearly identical to an existing solution.' : 'A very similar solution already exists.'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                {duplicatePrompt.solution && <div style={{ marginBottom: 6 }}>Existing solution: {duplicatePrompt.solution}</div>}
                {typeof duplicatePrompt.confidence_score === 'number' && <div>Confidence: {duplicatePrompt.confidence_score.toFixed(2)}</div>}
                {typeof duplicatePrompt.usage_count === 'number' && <div>Usage: {duplicatePrompt.usage_count}</div>}
                {typeof duplicatePrompt.version === 'number' && <div>Version: {duplicatePrompt.version}</div>}
                {duplicatePrompt.created_by && <div>Created by: {duplicatePrompt.created_by}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={handleUseDuplicateSolution} disabled={saving} style={{ ...btnPrimary, padding: '7px 14px' }}>Use Existing</button>
                <button onClick={() => handleSave(true)} disabled={saving} style={{ ...btnSecondary, padding: '7px 14px' }}>Create Anyway</button>
              </div>
            </div>
          </div>
        )}
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
        ) : isTerminalState ? (
          <button
            onClick={handleReopen}
            disabled={resolving}
            style={{
              padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: resolving ? 'not-allowed' : 'pointer',
              background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)',
              opacity: resolving ? 0.7 : 1,
              flexShrink: 0,
            }}
          >
            {resolving ? 'Reopening…' : '↺ Reopen Issue'}
          </button>
        ) : (
          <>
            {(!solutionSaved || editing) && (
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !solutionText.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  cursor: (saving || !solutionText.trim()) ? 'not-allowed' : 'pointer',
                  background: '#6366f1', color: '#fff', border: 'none',
                  opacity: (saving || !solutionText.trim()) ? 0.45 : 1,
                  flexShrink: 0,
                }}
              >
                {saving ? 'Saving…' : (solutionSaved ? 'Update Solution' : 'Save Solution')}
              </button>
            )}
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
          </>
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


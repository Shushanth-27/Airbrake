import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  id: string | null;
  solution: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  version?: number | null;
  confidence_score?: number | null;
  usage_count?: number | null;
}

interface KbSolution {
  id: string | null;
  solution: string | null;
  created_by: string | null;
  created_at: string | null;
  confidence_score: number | null;
  usage_count: number | null;
  version: number | null;
  log_ref_id?: string | null;
}

interface AiRecommendation {
  recommendation: string | null;
  solutions: KbSolution[];
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
  resolved_at?: string | null;
  reopened_at?: string | null;
  occurrences: Occurrence[];
  solution: SolutionData | null;
  ai_recommendation?: AiRecommendation | null;
}

interface DuplicatePromptState {
  solution_id: string;
  solution: string;
  decision: string | null;
  similarity: number | null;
  version: number | null;
  confidence_score: number | null;
  usage_count: number | null;
  created_by: string | null;
  created_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ts: string | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function getTraceDisplayText(
  _errorDetail: string | null | undefined,
  solutionText: string | null | undefined,
) {
  // Stack trace section shows only the saved solution text as context.
  return solutionText?.trim() || null;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const btnPrimary: CSSProperties = {
  padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
};
const btnSecondary: CSSProperties = {
  padding: '7px 14px', borderRadius: 6, fontSize: 12,
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--card-border)', cursor: 'pointer',
};
const btnDanger: CSSProperties = {
  padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: 'rgba(239,68,68,0.1)', color: '#f87171',
  border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
};
const metaRow: CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 12,
  fontSize: 11, color: 'var(--text-muted)', marginTop: 8,
};
const sectionLabel: CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10,
};

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: 60, height: 5, borderRadius: 3,
        background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
      }}>
        <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </span>
      <span style={{ color, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
    </span>
  );
}

// ── Solution meta line ────────────────────────────────────────────────────────

function SolutionMeta({ sol }: { sol: SolutionData | KbSolution }) {
  return (
    <div style={metaRow}>
      {sol.version != null && <span>v{sol.version}</span>}
      {sol.confidence_score != null && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Confidence: <ConfidenceBar score={sol.confidence_score} />
        </span>
      )}
      {sol.usage_count != null && <span>Used {sol.usage_count}×</span>}
      {sol.created_by && <span>By {sol.created_by}</span>}
      {sol.created_at && <span>{fmt(sol.created_at)}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ErrorDetailModal({
  row, errorHash, projectName: projectNameProp, onClose,
}: {
  row?: ErrorRow;
  errorHash?: string;
  projectName?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const effectiveErrorHash = row?.error_hash || errorHash;
  const isModal = !!row;

  // ── Remote data ──────────────────────────────────────────────────────────
  const [data, setData]       = useState<ErrorDetailData | null>(null);
  const [loading, setLoading] = useState(!!effectiveErrorHash);
  const [notFound, setNotFound] = useState(false);

  // ── Paginated KB solutions ───────────────────────────────────────────────
  const [kbSolutions, setKbSolutions]     = useState<KbSolution[]>([]);
  const [kbTotal, setKbTotal]             = useState(0);
  const [kbOffset, setKbOffset]           = useState(0);
  const [kbLoading, setKbLoading]         = useState(false);
  const KB_PAGE = 5;

  // ── Versions panel ───────────────────────────────────────────────────────
  const [versionsFor, setVersionsFor]       = useState<string | null>(null); // solution id
  const [versions, setVersions]             = useState<KbSolution[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // ── Editor ───────────────────────────────────────────────────────────────
  const [editorText, setEditorText]         = useState('');
  const [editorSaving, setEditorSaving]     = useState(false);
  const [editorError, setEditorError]       = useState('');
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePromptState | null>(null);

  // ── Action state ─────────────────────────────────────────────────────────
  const [actionBusy, setActionBusy]         = useState(false);
  const [actionError, setActionError]       = useState('');

  // ── Derived ──────────────────────────────────────────────────────────────
  const projectName  = data?.project_name ?? row?.project ?? projectNameProp ?? '';
  const errorMessage = data?.error_message ?? row?.error ?? '';
  const errorStatus  = data?.error_status ?? null;

  const isResolved  = errorStatus === 'resolved';
  const isReopened  = errorStatus === 'reopened';
  const isOpen      = !isResolved && !isReopened;

  // Active solution from backend (used in resolved view)
  const activeSolution = data?.solution ?? null;

  // AI recommendation text + solutions (dedup against active solution)
  const aiRec     = data?.ai_recommendation ?? null;
  const aiText    = aiRec?.recommendation ?? null;
  const aiSolutions = (aiRec?.solutions ?? [])
    .filter(s => s?.solution)
    .filter(s => !activeSolution?.id || s.id !== activeSolution.id)
    .sort((a, b) => {
      const cd = (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
      if (cd !== 0) return cd;
      return (b.usage_count ?? 0) - (a.usage_count ?? 0);
    });

  // ── Data fetching ─────────────────────────────────────────────────────────

  function loadDetail() {
    if (!effectiveErrorHash) return;
    setLoading(true);
    const qs = projectNameProp ? `?project_name=${encodeURIComponent(projectNameProp)}` : '';
    apiFetch(`/api/breaks/detail/${encodeURIComponent(effectiveErrorHash)}${qs}`)
      .then(r => { if (!r.ok) throw r; return r.json(); })
      .then((d: ErrorDetailData) => {
        setData(d);
        setNotFound(false);
        // Reset KB pagination whenever we re-load the error
        setKbSolutions([]);
        setKbOffset(0);
        setKbTotal(0);
      })
      .catch(err => { if (err?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDetail(); }, [effectiveErrorHash, projectNameProp]);

  // Load first page of KB solutions whenever data loads and error is open/reopened
  useEffect(() => {
    if (!data || isResolved) return;
    loadKbPage(0);
  }, [data?.error_hash, isResolved]);

  function loadKbPage(offset: number) {
    if (!data?.error_hash) return;
    setKbLoading(true);
    const qs = new URLSearchParams({
      error_hash: data.error_hash,
      limit: String(KB_PAGE),
      offset: String(offset),
      ...(projectName ? { project_name: projectName } : {}),
    });
    apiFetch(`/api/knowledge_base/top?${qs}`)
      .then(r => r.json())
      .then(j => {
        const sols: KbSolution[] = j.solutions ?? [];
        setKbSolutions(prev => offset === 0 ? sols : [...prev, ...sols]);
        setKbTotal(j.total ?? 0);
        setKbOffset(offset + sols.length);
      })
      .catch(console.error)
      .finally(() => setKbLoading(false));
  }

  async function loadVersions(solutionId: string) {
    if (versionsFor === solutionId) { setVersionsFor(null); return; }
    setLoadingVersions(true);
    try {
      const r = await apiFetch(`/api/knowledge_base/${encodeURIComponent(solutionId)}/versions`);
      const j = await r.json();
      setVersions(j.versions ?? []);
      setVersionsFor(solutionId);
    } finally { setLoadingVersions(false); }
  }

  // ── "Use solution" — resolves in-place, no navigation ────────────────────

  async function useSolution(solutionId: string) {
    if (!effectiveErrorHash || !projectName) return;
    setActionBusy(true);
    setActionError('');
    try {
      const r = await apiFetch('/api/knowledge_base/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_id: solutionId, error_hash: effectiveErrorHash, project_name: projectName }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      const j = await r.json();
      // Update UI in-place: mark resolved and refresh solution with latest metrics
      setData(prev => prev ? {
        ...prev,
        error_status: 'resolved',
        solution: {
          id:               j.solution_id,
          solution:         j.solution,
          created_at:       j.created_at,
          created_by:       j.created_by,
          version:          j.version,
          confidence_score: j.confidence_score,
          usage_count:      j.usage_count,
          updated_at:       null,
        },
      } : prev);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.label : String(e));
    } finally { setActionBusy(false); }
  }

  // ── Reopen ───────────────────────────────────────────────────────────────

  async function handleReopen() {
    if (!effectiveErrorHash || !projectName) return;
    setActionBusy(true);
    setActionError('');
    try {
      const r = await apiFetch('/api/knowledge_base/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_hash: effectiveErrorHash, project_name: projectName }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      // Reload full detail so KB solutions are fresh
      loadDetail();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.label : String(e));
    } finally { setActionBusy(false); }
  }

  // ── Delete solution ───────────────────────────────────────────────────────

  async function handleDeleteSolution(solutionId: string) {
    if (!effectiveErrorHash) return;
    if (!window.confirm('Delete this solution? This cannot be undone.')) return;
    setActionBusy(true);
    try {
      await apiFetch(
        `/api/knowledge_base/${encodeURIComponent(effectiveErrorHash)}?project_name=${encodeURIComponent(projectName)}`,
        { method: 'DELETE' },
      );
      setData(prev => prev ? { ...prev, solution: null } : prev);
      setKbSolutions(prev => prev.filter(s => s.id !== solutionId));
    } catch (e) {
      setActionError(e instanceof ApiError ? e.label : String(e));
    } finally { setActionBusy(false); }
  }

  async function handleDeleteVersion(solutionId: string, versionId: string) {
    try {
      await apiFetch(
        `/api/knowledge_base/${encodeURIComponent(solutionId)}/versions/${encodeURIComponent(versionId)}`,
        { method: 'DELETE' },
      );
      setVersions(prev => prev.filter(v => v.id !== versionId));
    } catch (e) {
      setActionError(e instanceof ApiError ? e.label : String(e));
    }
  }

  // ── Editor: save new solution ─────────────────────────────────────────────

  async function handleSave(forceCreate = false) {
    if (!effectiveErrorHash || !editorText.trim()) return;
    setEditorSaving(true);
    setEditorError('');
    setDuplicatePrompt(null);
    try {
      // 1. Check-only first
      const previewPayload: Record<string, unknown> = {
        error_hash: effectiveErrorHash, solution: editorText.trim(),
        project_name: projectName, check_only: !forceCreate,
        ...(forceCreate ? { create_anyway: true } : {}),
      };
      const previewRes = await apiFetch('/api/knowledge_base', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewPayload),
      });
      const preview = await previewRes.json();
      if (preview?.duplicate_prompt && !forceCreate) {
        setDuplicatePrompt({
          solution_id:      preview.solution_id,
          solution:         preview.solution,
          decision:         preview.decision,
          similarity:       preview.similarity,
          version:          preview.version,
          confidence_score: preview.confidence_score,
          usage_count:      preview.usage_count,
          created_by:       preview.created_by,
          created_at:       preview.created_at,
        });
        return;
      }

      // 2. Actual save (check_only: false)
      const saveRes = await apiFetch('/api/knowledge_base', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...previewPayload, check_only: false }),
      });
      const saved = await saveRes.json();

      // 3. Auto-use (resolve) with the new or duplicate solution
      const idToUse = saved.duplicate ? saved.solution_id : saved.id;
      if (idToUse) await useSolution(idToUse);
      else loadDetail();

      setEditorText('');
    } catch (e) {
      setEditorError(e instanceof ApiError ? e.label : 'Failed to save solution.');
    } finally { setEditorSaving(false); }
  }

  async function handleUseDuplicate() {
    if (!duplicatePrompt) return;
    setDuplicatePrompt(null);
    await useSolution(duplicatePrompt.solution_id);
  }

  // ── Improve: pre-fill editor with existing solution ───────────────────────

  function handleImprove(solutionText: string) {
    setEditorText(solutionText);
    // scroll textarea into view
    setTimeout(() => {
      document.getElementById('airbrake-solution-editor')?.focus();
    }, 50);
  }

  // ── Early returns ─────────────────────────────────────────────────────────

  if (!effectiveErrorHash) return null;

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
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Back</button>
      </div>
    );
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderSolutionCard(sol: KbSolution, opts: {
    highlight?: boolean;
    showImprove?: boolean;
    showDelete?: boolean;
  } = {}) {
    const isActiveInVersions = versionsFor === sol.id;
    return (
      <div key={sol.id ?? sol.solution} style={{
        padding: 14, borderRadius: 8,
        background: opts.highlight ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${opts.highlight ? 'rgba(99,102,241,0.25)' : 'var(--card-border)'}`,
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {sol.solution}
        </div>
        <SolutionMeta sol={sol} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <button
            onClick={() => useSolution(sol.id!)}
            disabled={actionBusy || !sol.id}
            style={{ ...btnPrimary, opacity: actionBusy ? 0.6 : 1 }}
          >
            {actionBusy ? 'Working…' : 'Use'}
          </button>
          {opts.showImprove && (
            <button onClick={() => handleImprove(sol.solution!)} style={btnSecondary}>
              Improve
            </button>
          )}
          {sol.id && (
            <button onClick={() => loadVersions(sol.id!)} disabled={loadingVersions} style={btnSecondary}>
              {loadingVersions && isActiveInVersions ? 'Loading…' : isActiveInVersions ? 'Hide Versions' : 'Versions'}
            </button>
          )}
          {opts.showDelete && sol.id && (
            <button onClick={() => handleDeleteSolution(sol.id!)} disabled={actionBusy} style={btnDanger}>
              Delete
            </button>
          )}
        </div>
        {/* Version panel */}
        {isActiveInVersions && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--card-border)' }}>
            {versions.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No other versions.</div>
            ) : versions.map(v => (
              <div key={v.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v.solution}</div>
                <SolutionMeta sol={v} />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => useSolution(v.id!)} disabled={actionBusy || !v.id} style={{ ...btnPrimary, padding: '5px 12px' }}>Use</button>
                  <button onClick={() => handleDeleteVersion(sol.id!, v.id!)} style={{ ...btnDanger, padding: '5px 12px' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── RESOLVED STATE ────────────────────────────────────────────────────────

  function renderResolved() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Resolved banner */}
        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            ✓ Resolved
          </div>
          {data?.resolved_at && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Resolved {fmt(data.resolved_at)}
            </div>
          )}
        </div>

        {/* Solution that was used */}
        {activeSolution?.solution ? (
          <div style={{
            padding: 16, borderRadius: 10,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{ ...sectionLabel, color: '#818cf8' }}>💡 Solution Used</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {activeSolution.solution}
            </div>
            <SolutionMeta sol={activeSolution} />
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
            No solution record found for this resolution.
          </div>
        )}

        {actionError && (
          <div style={{ fontSize: 12, color: '#f87171', padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {actionError}
          </div>
        )}
      </div>
    );
  }

  // ── OPEN / REOPENED STATE ─────────────────────────────────────────────────

  function renderOpen() {
    const hasMoreKb = kbOffset < kbTotal;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* ── 1. AI Recommendation ─────────────────────────────────────── */}
        {(aiText || aiSolutions.length > 0) && (
          <div style={{
            padding: 16, borderRadius: 10,
            background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span>🤖</span>
              <span style={{ ...sectionLabel, color: '#38bdf8', marginBottom: 0 }}>AI Recommended Solution</span>
            </div>
            {aiText && (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', marginBottom: aiSolutions.length > 0 ? 14 : 0 }}>
                {aiText}
              </div>
            )}
            {aiSolutions.map((sol, i) => (
              <div key={sol.id ?? i} style={{
                padding: 12, borderRadius: 8, marginTop: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {sol.solution}
                </div>
                <SolutionMeta sol={sol} />
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => useSolution(sol.id!)}
                    disabled={actionBusy || !sol.id}
                    style={{ ...btnPrimary, opacity: actionBusy ? 0.6 : 1 }}
                  >
                    {actionBusy ? 'Working…' : 'Use Recommended Solution'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 2. Knowledge Base — top solutions ────────────────────────── */}
        {(kbSolutions.length > 0 || kbLoading) && (
          <div>
            <div style={sectionLabel}>💡 Solution History</div>
            {kbSolutions
              .filter(s => !activeSolution?.id || s.id !== activeSolution.id)
              .map(sol => renderSolutionCard(sol, {
                highlight: false,
                showImprove: true,
                showDelete: true,
              })
            )}
            {kbLoading && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading…</div>
            )}
            {hasMoreKb && !kbLoading && (
              <button onClick={() => loadKbPage(kbOffset)} style={{ ...btnSecondary, marginTop: 4 }}>
                More Solutions ({kbTotal - kbOffset} remaining)
              </button>
            )}
          </div>
        )}

        {/* ── 3. New solution textarea ──────────────────────────────────── */}
        <div>
          <div style={sectionLabel}>✏️ Create New Solution</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Type a fix below. Saving will auto-resolve this error and update usage/confidence.
            Duplicate detection runs before saving — you will be prompted if a similar solution exists.
          </div>
          <textarea
            id="airbrake-solution-editor"
            value={editorText}
            onChange={e => setEditorText(e.target.value)}
            placeholder="Describe the root cause and fix for this error…"
            rows={5}
            style={{
              width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 8, color: 'var(--text)', padding: 12, fontSize: 13,
              lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          {editorError && (
            <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{editorError}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={() => handleSave(false)}
              disabled={editorSaving || !editorText.trim()}
              style={{
                ...btnPrimary,
                opacity: editorSaving || !editorText.trim() ? 0.45 : 1,
                cursor: editorSaving || !editorText.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {editorSaving ? 'Saving…' : 'Save Solution'}
            </button>
          </div>
        </div>

        {actionError && (
          <div style={{ fontSize: 12, color: '#f87171', padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {actionError}
          </div>
        )}

        {/* Duplicate detection prompt overlay */}
        {duplicatePrompt && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24,
          }}>
            <div style={{
              width: '100%', maxWidth: 480, background: 'var(--surface)',
              border: '1px solid var(--card-border)', borderRadius: 12, padding: 20,
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Similar Solution Found
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
                A very similar solution already exists in the knowledge base.
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                <div style={{ marginBottom: 8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{duplicatePrompt.solution}</div>
                {duplicatePrompt.confidence_score != null && <div>Confidence: {duplicatePrompt.confidence_score.toFixed(1)}%</div>}
                {duplicatePrompt.usage_count != null && <div>Used {duplicatePrompt.usage_count}×</div>}
                {duplicatePrompt.version != null && <div>Version v{duplicatePrompt.version}</div>}
                {duplicatePrompt.created_by && <div>By {duplicatePrompt.created_by}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={handleUseDuplicate} style={btnPrimary}>Use Existing</button>
                <button onClick={() => handleSave(true)} style={btnSecondary}>Create Anyway</button>
                <button onClick={() => setDuplicatePrompt(null)} style={btnDanger}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  const statusColor = isResolved ? '#34d399' : isReopened ? '#f87171' : '#818cf8';
  const statusLabel = isResolved ? '✓ Resolved' : isReopened ? '↺ Reopened' : '● Open';

  const content = (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100%',
      background: 'var(--surface)', border: '1px solid var(--card-border)',
      borderRadius: 14, width: '100%', maxWidth: 900,
      boxShadow: '0 24px 60px rgba(0,0,0,0.35)', overflow: 'hidden',
    }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '20px 26px', borderBottom: '1px solid var(--card-border)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Error Details
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
              background: isResolved ? 'rgba(52,211,153,0.12)' : isReopened ? 'rgba(248,113,113,0.12)' : 'rgba(99,102,241,0.12)',
              color: statusColor, border: `1px solid ${statusColor}40`,
            }}>
              {statusLabel}
            </span>
            {data?.status && data.status !== 'new' && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99,
                background: data.status === 'regression' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                color: data.status === 'regression' ? '#f87171' : '#fbbf24',
                border: `1px solid ${data.status === 'regression' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              }}>
                {data.status === 'regression' ? '⚠ Regression' : '◎ Recurring'}
              </span>
            )}
          </div>
          {errorMessage && (
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f87171', lineHeight: 1.4, marginBottom: 12, wordBreak: 'break-word' }}>
              {errorMessage}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Project</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>{projectName || '—'}</div>
            </div>
            {data?.file_name && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>File</div>
                <div style={{ fontSize: 12, fontFamily: 'ui-monospace,monospace', color: 'var(--text)' }}>{data.file_name}</div>
              </div>
            )}
            {data?.occurrence_count != null && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Occurrences</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{data.occurrence_count}</div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)',
            color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer',
            width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginLeft: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ overflow: 'auto', padding: '22px 26px', flex: 1 }}>
        {isResolved ? renderResolved() : renderOpen()}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 26px', borderTop: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
      }}>
        {isResolved && (
          <button
            onClick={handleReopen}
            disabled={actionBusy}
            style={{
              ...btnDanger,
              padding: '8px 20px', fontSize: 13,
              opacity: actionBusy ? 0.7 : 1,
              cursor: actionBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {actionBusy ? 'Working…' : '↺ Reopen Error'}
          </button>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: 24,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        >
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

/**
 * Alert Management — 3-tab UI: Alert Rules, Triggered Alerts, Notification Channels
 * Mock data only — no backend connection.
 */

import React, { useState } from 'react';
import type { Role } from '@portal/shared';

interface Props { readonly role: Role; }

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'High Failure' | 'New Error' | 'Regression';
type ChannelType = 'Email' | 'Slack' | 'Teams' | 'Webhook';
type RuleStatus = 'active' | 'inactive';
type TriggeredStatus = 'sent' | 'pending' | 'failed';
type TabId = 'rules' | 'triggered';
type WindowOption = '1 minute' | '5 minutes' | '15 minutes';

interface AlertRule {
  id: string;
  name: string;
  project: string;
  alertType: AlertType;
  threshold: number | null;
  window: WindowOption | null;
  channels: ChannelType[];
  status: RuleStatus;
}

interface TriggeredAlert {
  id: string;
  triggeredAt: string;
  project: string;
  error: string;
  errorHash: string;
  ruleTriggered: string;
  alertType: AlertType;
  status: TriggeredStatus;
}

interface RuleDraft {
  name: string;
  project: string;
  alertType: AlertType;
  threshold: string;
  window: WindowOption;
  channels: ChannelType[];
  status: RuleStatus;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROJECTS: string[] = []; // replaced by DB fetch — see useProjects()

const MOCK_RULES: AlertRule[] = [
  { id: '1', name: 'High Failure Rate — Prod', project: 'AI Document Processor', alertType: 'High Failure', threshold: 5, window: '1 minute', channels: ['Email', 'Slack'], status: 'active' },
  { id: '2', name: 'New Error Detection', project: 'Vision Analytics', alertType: 'New Error', threshold: null, window: null, channels: ['Slack'], status: 'active' },
  { id: '3', name: 'Regression Monitor', project: 'RAG Pipeline', alertType: 'Regression', threshold: null, window: null, channels: ['Teams', 'Webhook'], status: 'inactive' },
  { id: '4', name: 'Burst Failure Alert', project: 'Fraud Detection', alertType: 'High Failure', threshold: 10, window: '5 minutes', channels: ['Email'], status: 'active' },
  { id: '5', name: 'Critical Regression', project: 'NLP Classifier', alertType: 'Regression', threshold: null, window: null, channels: ['Slack', 'Teams'], status: 'inactive' },
];

const MOCK_TRIGGERED: TriggeredAlert[] = [
  { id: '1', triggeredAt: new Date(Date.now() - 5 * 60000).toISOString(), project: 'AI Document Processor', error: 'TypeError: Cannot read properties of undefined', errorHash: 'a1b2c3d4', ruleTriggered: 'High Failure Rate — Prod', alertType: 'High Failure', status: 'sent' },
  { id: '2', triggeredAt: new Date(Date.now() - 18 * 60000).toISOString(), project: 'Vision Analytics', error: 'CUDA out of memory', errorHash: 'e5f6a7b8', ruleTriggered: 'New Error Detection', alertType: 'New Error', status: 'pending' },
  { id: '3', triggeredAt: new Date(Date.now() - 42 * 60000).toISOString(), project: 'RAG Pipeline', error: 'ConnectionRefusedError: [Errno 111]', errorHash: 'c9d0e1f2', ruleTriggered: 'Regression Monitor', alertType: 'Regression', status: 'failed' },
  { id: '4', triggeredAt: new Date(Date.now() - 90 * 60000).toISOString(), project: 'Fraud Detection', error: 'ValueError: Input contains NaN', errorHash: 'g3h4i5j6', ruleTriggered: 'Burst Failure Alert', alertType: 'High Failure', status: 'sent' },
  { id: '5', triggeredAt: new Date(Date.now() - 3 * 3600000).toISOString(), project: 'NLP Classifier', error: 'RuntimeError: CUDA error: device-side assert', errorHash: 'k7l8m9n0', ruleTriggered: 'Critical Regression', alertType: 'Regression', status: 'failed' },
  { id: '6', triggeredAt: new Date(Date.now() - 6 * 3600000).toISOString(), project: 'AI Document Processor', error: 'MemoryError: Unable to allocate array', errorHash: 'o1p2q3r4', ruleTriggered: 'High Failure Rate — Prod', alertType: 'High Failure', status: 'sent' },
];

const EMPTY_DRAFT: RuleDraft = {
  name: '', project: '', alertType: 'High Failure',
  threshold: '5', window: '1 minute', channels: [], status: 'active',
};

// ─── Style helpers ────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 6, color: 'var(--text)', padding: '7px 28px 7px 11px',
  fontSize: 13, outline: 'none', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 6, color: 'var(--text)', padding: '7px 11px',
  fontSize: 13, outline: 'none', width: '100%',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--card-border)',
  borderRadius: 10, overflow: 'hidden',
};

function btnStyle(variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties {
  const v = {
    primary: { background: '#6366f1', color: '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)' },
    danger:  { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  }[variant];
  return { padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', ...v };
}

function Label({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
      {text}
    </div>
  );
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

const TRIGGERED_STATUS_STYLE: Record<TriggeredStatus, { bg: string; color: string; border: string }> = {
  sent:    { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  pending: { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  failed:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

const ALERT_TYPE_STYLE: Record<AlertType, { bg: string; color: string }> = {
  'High Failure': { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  'New Error':    { bg: 'rgba(99,102,241,0.12)',   color: '#818cf8' },
  'Regression':   { bg: 'rgba(245,158,11,0.12)',   color: '#fbbf24' },
};

const CHANNEL_ICONS: Record<ChannelType, string> = {
  Email: '📧', Slack: '💬', Teams: '🟦', Webhook: '🔗',
};

// ─── useProjects hook ─────────────────────────────────────────────────────────

function useProjects(): string[] {
  const [projects, setProjects] = React.useState<string[]>([]);
  React.useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((rows: { name: string }[]) => setProjects(rows.map(r => r.name).sort()))
      .catch(console.error);
  }, []);
  return projects;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusToggle({ status, onChange }: { status: RuleStatus; onChange: (s: RuleStatus) => void }) {
  const active = status === 'active';
  return (
    <button
      onClick={() => onChange(active ? 'inactive' : 'active')}
      title={active ? 'Disable rule' : 'Enable rule'}
      style={{
        width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: active ? '#6366f1' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: active ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );
}

function AlertTypeBadge({ type }: { type: AlertType }) {
  const s = ALERT_TYPE_STYLE[type];
  return (
    <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {type}
    </span>
  );
}

function TriggeredStatusBadge({ status }: { status: TriggeredStatus }) {
  const s = TRIGGERED_STATUS_STYLE[status];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      ● {status}
    </span>
  );
}

function ChannelMultiSelect({ selected, onChange }: { selected: ChannelType[]; onChange: (c: ChannelType[]) => void }) {
  const all: ChannelType[] = ['Email', 'Slack', 'Teams', 'Webhook'];
  function toggle(ch: ChannelType) {
    onChange(selected.includes(ch) ? selected.filter(c => c !== ch) : [...selected, ch]);
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {all.map(ch => {
        const on = selected.includes(ch);
        return (
          <button key={ch} type="button" onClick={() => toggle(ch)} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            background: on ? 'rgba(99,102,241,0.2)' : 'var(--input-bg)',
            color: on ? '#818cf8' : 'var(--text-muted)',
            border: on ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--input-border)',
            transition: 'all 0.15s',
          }}>
            {CHANNEL_ICONS[ch]} {ch}
          </button>
        );
      })}
    </div>
  );
}

// ─── Create / Edit Rule Modal ─────────────────────────────────────────────────

function RuleModal({ initial, onSave, onClose, projects }: {
  initial: RuleDraft | null;
  onSave: (d: RuleDraft) => void;
  onClose: () => void;
  projects: string[];
}) {
  const [draft, setDraft] = useState<RuleDraft>(initial ?? { ...EMPTY_DRAFT });
  const set = (patch: Partial<RuleDraft>) => setDraft(d => ({ ...d, ...patch }));
  const isHighFailure = draft.alertType === 'High Failure';

  function setAlertType(type: AlertType) {
    setDraft(d => ({
      ...d,
      alertType: type,
      // reset to defaults when switching to High Failure so fields are never empty
      threshold: type === 'High Failure' ? (d.threshold || '5') : d.threshold,
      window: type === 'High Failure' ? (d.window || '1 minute') : d.window,
    }));
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--card-border)',
        borderRadius: 14, width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{initial ? 'Edit Alert Rule' : 'Create Alert Rule'}</div>
          <button onClick={onClose} style={{ ...btnStyle('ghost'), padding: '4px 10px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Rule Name */}
          <div>
            <Label text="Rule Name" />
            <input value={draft.name} onChange={e => set({ name: e.target.value })}
              placeholder="e.g. High failure rate in prod" style={inputStyle} />
          </div>

          {/* Project */}
          <div>
            <Label text="Project Name" />
            <select value={draft.project} onChange={e => set({ project: e.target.value })} style={{ ...selectStyle, width: '100%' }}>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Alert Type */}
          <div>
            <Label text="Alert Type" />
            <select value={draft.alertType} onChange={e => setAlertType(e.target.value as AlertType)} style={{ ...selectStyle, width: '100%' }}>
              <option value="High Failure">High Failure</option>
              <option value="New Error">New Error</option>
              <option value="Regression">Regression</option>
            </select>
          </div>

          {/* Conditional: Threshold + Window (High Failure only) */}
          {isHighFailure && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Label text="Threshold" />
                <input type="number" min={1} value={draft.threshold}
                  onChange={e => set({ threshold: e.target.value })}
                  placeholder="e.g. 5" style={inputStyle} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Number of failures to trigger</div>
              </div>
              <div>
                <Label text="Window" />
                <select value={draft.window} onChange={e => set({ window: e.target.value as WindowOption })} style={{ ...selectStyle, width: '100%' }}>
                  <option value="1 minute">1 minute</option>
                  <option value="5 minutes">5 minutes</option>
                  <option value="15 minutes">15 minutes</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Time period for threshold</div>
              </div>
            </div>
          )}

          {/* Channels */}
          <div>
            <Label text="Notification Channels" />
            <ChannelMultiSelect selected={draft.channels} onChange={c => set({ channels: c })} />
          </div>

          {/* Status */}
          <div>
            <Label text="Status" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusToggle status={draft.status} onChange={s => set({ status: s })} />
              <span style={{ fontSize: 13, color: draft.status === 'active' ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
                {draft.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--card-border)' }}>
          <button onClick={onClose} style={btnStyle('ghost')}>Cancel</button>
          <button
            onClick={() => { if (draft.name.trim()) onSave(draft); }}
            disabled={!draft.name.trim()}
            style={{ ...btnStyle('primary'), opacity: draft.name.trim() ? 1 : 0.5 }}
          >
            {initial ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Alert Rules ─────────────────────────────────────────────────────────

function AlertRulesTab({ rules, onEdit, onDelete, onToggle, onCreateRule, projects }: {
  rules: AlertRule[];
  onEdit: (r: AlertRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onCreateRule: () => void;
  projects: string[];
}) {
  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = rules.filter(r =>
    (!projectFilter || r.project === projectFilter) &&
    (!typeFilter || r.alertType === typeFilter) &&
    (!statusFilter || r.status === statusFilter)
  );

  const TH = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <th style={{
      padding: '10px 14px', textAlign: 'left', fontWeight: 600,
      color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)',
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
      ...style,
    }}>{children}</th>
  );

  return (
    <div>
      {/* Filters + Create button row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={selectStyle} aria-label="Filter by project">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle} aria-label="Filter by alert type">
          <option value="">All Types</option>
          <option value="High Failure">High Failure</option>
          <option value="New Error">New Error</option>
          <option value="Regression">Regression</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(projectFilter || typeFilter || statusFilter) && (
          <button onClick={() => { setProjectFilter(''); setTypeFilter(''); setStatusFilter(''); }}
            style={{ ...btnStyle('ghost'), fontSize: 12 }}>Clear</button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={onCreateRule} style={btnStyle('primary')}>+ Create Rule</button>
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--input-bg)' }}>
              <TH>Rule Name</TH>
              <TH>Alert Type</TH>
              <TH>Threshold</TH>
              <TH>Window</TH>
              <TH>Channels</TH>
              <TH>Status</TH>
              <TH style={{ textAlign: 'right' }}>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                No alert rules found
              </td></tr>
            )}
            {filtered.map((rule, i) => (
              <tr key={rule.id} style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                opacity: rule.status === 'inactive' ? 0.55 : 1,
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{rule.name}</td>
                <td style={{ padding: '12px 14px' }}><AlertTypeBadge type={rule.alertType} /></td>
                <td style={{ padding: '12px 14px', color: rule.threshold ? '#fbbf24' : 'var(--text-muted)', fontWeight: rule.threshold ? 700 : 400 }}>
                  {rule.threshold ?? '—'}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{rule.window ?? '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {rule.channels.map(ch => (
                      <span key={ch} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                        {CHANNEL_ICONS[ch]} {ch}
                      </span>
                    ))}
                    {rule.channels.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>None</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusToggle status={rule.status} onChange={() => onToggle(rule.id)} />
                    <span style={{ fontSize: 11, color: rule.status === 'active' ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
                      {rule.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => onEdit(rule)} style={{ ...btnStyle('ghost'), padding: '5px 10px', fontSize: 11 }} title="Edit">✏️</button>
                    <button onClick={() => onDelete(rule.id)} style={{ ...btnStyle('danger'), padding: '5px 10px', fontSize: 11 }} title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Triggered Alerts ────────────────────────────────────────────────────

function TriggeredAlertsTab({ alerts, projects }: { alerts: TriggeredAlert[]; projects: string[] }) {
  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = alerts.filter(a => {
    if (projectFilter && a.project !== projectFilter) return false;
    if (typeFilter && a.alertType !== typeFilter) return false;
    if (fromDate && new Date(a.triggeredAt) < new Date(fromDate + 'T00:00:00')) return false;
    if (toDate && new Date(a.triggeredAt) > new Date(toDate + 'T23:59:59')) return false;
    return true;
  });

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{
      padding: '10px 14px', textAlign: 'left', fontWeight: 600,
      color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)',
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
    }}>{children}</th>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
        padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--card-border)',
        borderRadius: 8,
      }}>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={selectStyle} aria-label="Filter by project">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle} aria-label="Filter by alert type">
          <option value="">All Types</option>
          <option value="High Failure">High Failure</option>
          <option value="New Error">New Error</option>
          <option value="Regression">Regression</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>From:</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>To:</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        {(projectFilter || typeFilter || fromDate || toDate) && (
          <button onClick={() => { setProjectFilter(''); setTypeFilter(''); setFromDate(''); setToDate(''); }}
            style={{ ...btnStyle('ghost'), fontSize: 12 }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--input-bg)' }}>
              <TH>Triggered Time</TH>
              <TH>Project</TH>
              <TH>Error</TH>
              <TH>Rule Triggered</TH>

              <TH>Alert Type</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                No triggered alerts found
              </td></tr>
            )}
            {filtered.map((a, i) => (
              <tr key={a.id} style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}>
                <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontFamily: 'ui-monospace,monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {fmt(a.triggeredAt)}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#6366f120', color: '#818cf8' }}>
                    {a.project}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: '#f87171', fontFamily: 'ui-monospace,monospace', fontSize: 11, maxWidth: 260, wordBreak: 'break-word' }}>
                  {a.error}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-subtle)' }}>{a.ruleTriggered}</td>
                <td style={{ padding: '11px 14px' }}><AlertTypeBadge type={a.alertType} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertManagement({ role }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('rules');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertRule | null>(null);
  const projects = useProjects();

  const canEdit = role === 'admin' || role === 'developer';

  // ── Map DB row → AlertRule ──────────────────────────────────────────────────
  function mapRule(row: any): AlertRule {
    const windowMap: Record<number, WindowOption> = { 1: '1 minute', 5: '5 minutes', 15: '15 minutes' };
    return {
      id: row.id,
      name: row.rule_name,
      project: row.project_name,
      alertType: row.alert_type as AlertType,
      threshold: row.threshold ?? null,
      window: row.window_minutes ? (windowMap[row.window_minutes] ?? `${row.window_minutes} minutes`) as WindowOption : null,
      channels: [],
      status: row.is_active ? 'active' : 'inactive',
    };
  }

  // ── Map DB row → TriggeredAlert ─────────────────────────────────────────────
  function mapTriggered(row: any): TriggeredAlert {
    return {
      id: row.id,
      triggeredAt: row.triggered_at,
      project: row.project_name,
      error: row.error ?? '',
      errorHash: '',
      ruleTriggered: row.rule_name ?? '—',
      alertType: row.alert_type as AlertType,
      status: 'sent',
    };
  }

  function loadRules() {
    fetch('/api/alert-rules')
      .then(r => r.json())
      .then((rows: any[]) => setRules(rows.map(mapRule)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function loadTriggered() {
    fetch('/api/alert-history')
      .then(r => r.json())
      .then((rows: any[]) => setTriggered(rows.map(mapTriggered)))
      .catch(console.error);
  }

  React.useEffect(() => {
    loadRules();
    loadTriggered();
  }, []);

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(rule: AlertRule) { setEditTarget(rule); setModalOpen(true); }

  async function handleSave(draft: RuleDraft) {
    const windowMinMap: Record<WindowOption, number> = { '1 minute': 1, '5 minutes': 5, '15 minutes': 15 };
    const body = {
      rule_name: draft.name,
      project_name: draft.project,
      alert_type: draft.alertType,
      threshold: draft.alertType === 'High Failure' ? Number(draft.threshold) : null,
      window_minutes: draft.alertType === 'High Failure' ? windowMinMap[draft.window] : null,
      is_active: draft.status === 'active',
    };

    if (editTarget) {
      await fetch(`/api/alert-rules/${editTarget.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/alert-rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    }
    setModalOpen(false);
    loadRules();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this alert rule?')) return;
    await fetch(`/api/alert-rules/${id}`, { method: 'DELETE' });
    loadRules();
  }

  async function handleToggle(id: string) {
    await fetch(`/api/alert-rules/${id}/toggle`, { method: 'PATCH' });
    loadRules();
  }

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'rules',     label: 'Alert Rules',       icon: '📋' },
    { id: 'triggered', label: 'Triggered Alerts',  icon: '⚡' },
  ];

  const activeCount = rules.filter(r => r.status === 'active').length;

  return (
    <div data-testid="alert-management">

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Alert Management</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Configure alert rules, view triggered alerts, and manage notification channels
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Rules',     value: rules.length,     color: '#6366f1', icon: '📋' },
          { label: 'Active Rules',    value: activeCount,      color: '#10b981', icon: '✅' },
          { label: 'Triggered Today', value: triggered.length, color: '#f59e0b', icon: '⚡' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--card-border)',
            borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 18px', borderRadius: '7px 7px 0 0', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'rules' && (
        loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
        ) : (
          <AlertRulesTab
            rules={rules}
            onEdit={canEdit ? openEdit : () => {}}
            onDelete={canEdit ? handleDelete : () => {}}
            onToggle={canEdit ? handleToggle : () => {}}
            onCreateRule={canEdit ? openCreate : () => {}}
            projects={projects}
          />
        )
      )}
      {activeTab === 'triggered' && <TriggeredAlertsTab alerts={triggered} projects={projects} />}

      {/* Modal */}
      {modalOpen && (
        <RuleModal
          initial={editTarget ? {
            name: editTarget.name,
            project: editTarget.project,
            alertType: editTarget.alertType,
            threshold: editTarget.threshold != null ? String(editTarget.threshold) : '5',
            window: editTarget.window ?? '1 minute',
            channels: editTarget.channels,
            status: editTarget.status,
          } : null}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          projects={projects}
        />
      )}
    </div>
  );
}

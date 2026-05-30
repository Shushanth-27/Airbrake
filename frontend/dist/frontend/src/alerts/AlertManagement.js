"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManagement = AlertManagement;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Alert Management — 3-tab UI: Alert Rules, Triggered Alerts, Notification Channels
 * Mock data only — no backend connection.
 */
const react_1 = __importStar(require("react"));
// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PROJECTS = []; // replaced by DB fetch — see useProjects()
const MOCK_RULES = [
    { id: '1', name: 'High Failure Rate — Prod', project: 'AI Document Processor', alertType: 'High Failure', threshold: 5, window: '1 minute', channels: ['Email', 'Slack'], status: 'active' },
    { id: '2', name: 'New Error Detection', project: 'Vision Analytics', alertType: 'New Error', threshold: null, window: null, channels: ['Slack'], status: 'active' },
    { id: '3', name: 'Regression Monitor', project: 'RAG Pipeline', alertType: 'Regression', threshold: null, window: null, channels: ['Teams', 'Webhook'], status: 'inactive' },
    { id: '4', name: 'Burst Failure Alert', project: 'Fraud Detection', alertType: 'High Failure', threshold: 10, window: '5 minutes', channels: ['Email'], status: 'active' },
    { id: '5', name: 'Critical Regression', project: 'NLP Classifier', alertType: 'Regression', threshold: null, window: null, channels: ['Slack', 'Teams'], status: 'inactive' },
];
const MOCK_TRIGGERED = [
    { id: '1', triggeredAt: new Date(Date.now() - 5 * 60000).toISOString(), project: 'AI Document Processor', error: 'TypeError: Cannot read properties of undefined', errorHash: 'a1b2c3d4', ruleTriggered: 'High Failure Rate — Prod', alertType: 'High Failure', status: 'sent' },
    { id: '2', triggeredAt: new Date(Date.now() - 18 * 60000).toISOString(), project: 'Vision Analytics', error: 'CUDA out of memory', errorHash: 'e5f6a7b8', ruleTriggered: 'New Error Detection', alertType: 'New Error', status: 'pending' },
    { id: '3', triggeredAt: new Date(Date.now() - 42 * 60000).toISOString(), project: 'RAG Pipeline', error: 'ConnectionRefusedError: [Errno 111]', errorHash: 'c9d0e1f2', ruleTriggered: 'Regression Monitor', alertType: 'Regression', status: 'failed' },
    { id: '4', triggeredAt: new Date(Date.now() - 90 * 60000).toISOString(), project: 'Fraud Detection', error: 'ValueError: Input contains NaN', errorHash: 'g3h4i5j6', ruleTriggered: 'Burst Failure Alert', alertType: 'High Failure', status: 'sent' },
    { id: '5', triggeredAt: new Date(Date.now() - 3 * 3600000).toISOString(), project: 'NLP Classifier', error: 'RuntimeError: CUDA error: device-side assert', errorHash: 'k7l8m9n0', ruleTriggered: 'Critical Regression', alertType: 'Regression', status: 'failed' },
    { id: '6', triggeredAt: new Date(Date.now() - 6 * 3600000).toISOString(), project: 'AI Document Processor', error: 'MemoryError: Unable to allocate array', errorHash: 'o1p2q3r4', ruleTriggered: 'High Failure Rate — Prod', alertType: 'High Failure', status: 'sent' },
];
const EMPTY_DRAFT = {
    name: '', project: '', alertType: 'High Failure',
    threshold: '5', window: '1 minute', channels: [], status: 'active',
};
// ─── Style helpers ────────────────────────────────────────────────────────────
const selectStyle = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 6, color: 'var(--text)', padding: '7px 28px 7px 11px',
    fontSize: 13, outline: 'none', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};
const inputStyle = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 6, color: 'var(--text)', padding: '7px 11px',
    fontSize: 13, outline: 'none', width: '100%',
};
const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--card-border)',
    borderRadius: 10, overflow: 'hidden',
};
function btnStyle(variant) {
    const v = {
        primary: { background: '#6366f1', color: '#fff', border: 'none' },
        ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)' },
        danger: { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    }[variant];
    return { padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', ...v };
}
function Label({ text }) {
    return ((0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }, children: text }));
}
function fmt(ts) {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
const TRIGGERED_STATUS_STYLE = {
    sent: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
    pending: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    failed: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
};
const ALERT_TYPE_STYLE = {
    'High Failure': { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
    'New Error': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
    'Regression': { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
};
const CHANNEL_ICONS = {
    Email: '📧', Slack: '💬', Teams: '🟦', Webhook: '🔗',
};
// ─── useProjects hook ─────────────────────────────────────────────────────────
function useProjects() {
    const [projects, setProjects] = react_1.default.useState([]);
    react_1.default.useEffect(() => {
        fetch('/api/projects')
            .then(r => r.json())
            .then((rows) => setProjects(rows.map(r => r.name).sort()))
            .catch(console.error);
    }, []);
    return projects;
}
// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusToggle({ status, onChange }) {
    const active = status === 'active';
    return ((0, jsx_runtime_1.jsx)("button", { onClick: () => onChange(active ? 'inactive' : 'active'), title: active ? 'Disable rule' : 'Enable rule', style: {
            width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: active ? '#6366f1' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                position: 'absolute', top: 3, left: active ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', display: 'block',
            } }) }));
}
function AlertTypeBadge({ type }) {
    const s = ALERT_TYPE_STYLE[type];
    return ((0, jsx_runtime_1.jsx)("span", { style: { padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }, children: type }));
}
function TriggeredStatusBadge({ status }) {
    const s = TRIGGERED_STATUS_STYLE[status];
    return ((0, jsx_runtime_1.jsxs)("span", { style: { padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }, children: ["\u25CF ", status] }));
}
function ChannelMultiSelect({ selected, onChange }) {
    const all = ['Email', 'Slack', 'Teams', 'Webhook'];
    function toggle(ch) {
        onChange(selected.includes(ch) ? selected.filter(c => c !== ch) : [...selected, ch]);
    }
    return ((0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: all.map(ch => {
            const on = selected.includes(ch);
            return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggle(ch), style: {
                    padding: '6px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    background: on ? 'rgba(99,102,241,0.2)' : 'var(--input-bg)',
                    color: on ? '#818cf8' : 'var(--text-muted)',
                    border: on ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--input-border)',
                    transition: 'all 0.15s',
                }, children: [CHANNEL_ICONS[ch], " ", ch] }, ch));
        }) }));
}
// ─── Create / Edit Rule Modal ─────────────────────────────────────────────────
function RuleModal({ initial, onSave, onClose, projects }) {
    const [draft, setDraft] = (0, react_1.useState)(initial ?? { ...EMPTY_DRAFT });
    const set = (patch) => setDraft(d => ({ ...d, ...patch }));
    const isHighFailure = draft.alertType === 'High Failure';
    function setAlertType(type) {
        setDraft(d => ({
            ...d,
            alertType: type,
            // reset to defaults when switching to High Failure so fields are never empty
            threshold: type === 'High Failure' ? (d.threshold || '5') : d.threshold,
            window: type === 'High Failure' ? (d.window || '1 minute') : d.window,
        }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { onClick: onClose, style: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: 24,
        }, children: (0, jsx_runtime_1.jsxs)("div", { onClick: e => e.stopPropagation(), style: {
                background: 'var(--surface)', border: '1px solid var(--card-border)',
                borderRadius: 14, width: '100%', maxWidth: 540,
                maxHeight: '90vh', overflow: 'auto',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--card-border)' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 15, fontWeight: 700 }, children: initial ? 'Edit Alert Rule' : 'Create Alert Rule' }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, style: { ...btnStyle('ghost'), padding: '4px 10px' }, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Rule Name" }), (0, jsx_runtime_1.jsx)("input", { value: draft.name, onChange: e => set({ name: e.target.value }), placeholder: "e.g. High failure rate in prod", style: inputStyle })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Project Name" }), (0, jsx_runtime_1.jsx)("select", { value: draft.project, onChange: e => set({ project: e.target.value }), style: { ...selectStyle, width: '100%' }, children: projects.map(p => (0, jsx_runtime_1.jsx)("option", { value: p, children: p }, p)) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Alert Type" }), (0, jsx_runtime_1.jsxs)("select", { value: draft.alertType, onChange: e => setAlertType(e.target.value), style: { ...selectStyle, width: '100%' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "High Failure", children: "High Failure" }), (0, jsx_runtime_1.jsx)("option", { value: "New Error", children: "New Error" }), (0, jsx_runtime_1.jsx)("option", { value: "Regression", children: "Regression" })] })] }), isHighFailure && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Threshold" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, value: draft.threshold, onChange: e => set({ threshold: e.target.value }), placeholder: "e.g. 5", style: inputStyle }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "Number of failures to trigger" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Window" }), (0, jsx_runtime_1.jsxs)("select", { value: draft.window, onChange: e => set({ window: e.target.value }), style: { ...selectStyle, width: '100%' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "1 minute", children: "1 minute" }), (0, jsx_runtime_1.jsx)("option", { value: "5 minutes", children: "5 minutes" }), (0, jsx_runtime_1.jsx)("option", { value: "15 minutes", children: "15 minutes" })] }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "Time period for threshold" })] })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Notification Channels" }), (0, jsx_runtime_1.jsx)(ChannelMultiSelect, { selected: draft.channels, onChange: c => set({ channels: c }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label, { text: "Status" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(StatusToggle, { status: draft.status, onChange: s => set({ status: s }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13, color: draft.status === 'active' ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }, children: draft.status === 'active' ? 'Active' : 'Inactive' })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--card-border)' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, style: btnStyle('ghost'), children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { if (draft.name.trim())
                                onSave(draft); }, disabled: !draft.name.trim(), style: { ...btnStyle('primary'), opacity: draft.name.trim() ? 1 : 0.5 }, children: initial ? 'Save Changes' : 'Create Rule' })] })] }) }));
}
// ─── Tab: Alert Rules ─────────────────────────────────────────────────────────
function AlertRulesTab({ rules, onEdit, onDelete, onToggle, onCreateRule, projects }) {
    const [projectFilter, setProjectFilter] = (0, react_1.useState)('');
    const [typeFilter, setTypeFilter] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('');
    const filtered = rules.filter(r => (!projectFilter || r.project === projectFilter) &&
        (!typeFilter || r.alertType === typeFilter) &&
        (!statusFilter || r.status === statusFilter));
    const TH = ({ children, style }) => ((0, jsx_runtime_1.jsx)("th", { style: {
            padding: '10px 14px', textAlign: 'left', fontWeight: 600,
            color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)',
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
            ...style,
        }, children: children }));
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("select", { value: projectFilter, onChange: e => setProjectFilter(e.target.value), style: selectStyle, "aria-label": "Filter by project", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All Projects" }), projects.map(p => (0, jsx_runtime_1.jsx)("option", { value: p, children: p }, p))] }), (0, jsx_runtime_1.jsxs)("select", { value: typeFilter, onChange: e => setTypeFilter(e.target.value), style: selectStyle, "aria-label": "Filter by alert type", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All Types" }), (0, jsx_runtime_1.jsx)("option", { value: "High Failure", children: "High Failure" }), (0, jsx_runtime_1.jsx)("option", { value: "New Error", children: "New Error" }), (0, jsx_runtime_1.jsx)("option", { value: "Regression", children: "Regression" })] }), (0, jsx_runtime_1.jsxs)("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), style: selectStyle, "aria-label": "Filter by status", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All Statuses" }), (0, jsx_runtime_1.jsx)("option", { value: "active", children: "Active" }), (0, jsx_runtime_1.jsx)("option", { value: "inactive", children: "Inactive" })] }), (projectFilter || typeFilter || statusFilter) && ((0, jsx_runtime_1.jsx)("button", { onClick: () => { setProjectFilter(''); setTypeFilter(''); setStatusFilter(''); }, style: { ...btnStyle('ghost'), fontSize: 12 }, children: "Clear" })), (0, jsx_runtime_1.jsx)("div", { style: { marginLeft: 'auto' }, children: (0, jsx_runtime_1.jsx)("button", { onClick: onCreateRule, style: btnStyle('primary'), children: "+ Create Rule" }) })] }), (0, jsx_runtime_1.jsx)("div", { style: cardStyle, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: 'var(--input-bg)' }, children: [(0, jsx_runtime_1.jsx)(TH, { children: "Rule Name" }), (0, jsx_runtime_1.jsx)(TH, { children: "Alert Type" }), (0, jsx_runtime_1.jsx)(TH, { children: "Threshold" }), (0, jsx_runtime_1.jsx)(TH, { children: "Window" }), (0, jsx_runtime_1.jsx)(TH, { children: "Channels" }), (0, jsx_runtime_1.jsx)(TH, { children: "Status" }), (0, jsx_runtime_1.jsx)(TH, { style: { textAlign: 'right' }, children: "Actions" })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [filtered.length === 0 && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 7, style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 28, marginBottom: 8 }, children: "\uD83D\uDD14" }), "No alert rules found"] }) })), filtered.map((rule, i) => ((0, jsx_runtime_1.jsxs)("tr", { style: {
                                        borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                                        opacity: rule.status === 'inactive' ? 0.55 : 1,
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                    }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px', fontWeight: 600 }, children: rule.name }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px' }, children: (0, jsx_runtime_1.jsx)(AlertTypeBadge, { type: rule.alertType }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px', color: rule.threshold ? '#fbbf24' : 'var(--text-muted)', fontWeight: rule.threshold ? 700 : 400 }, children: rule.threshold ?? '—' }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px', color: 'var(--text-muted)' }, children: rule.window ?? '—' }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap' }, children: [rule.channels.map(ch => ((0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }, children: [CHANNEL_ICONS[ch], " ", ch] }, ch))), rule.channels.length === 0 && (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: "None" })] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(StatusToggle, { status: rule.status, onChange: () => onToggle(rule.id) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, color: rule.status === 'active' ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }, children: rule.status === 'active' ? 'Active' : 'Inactive' })] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 14px' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 6, justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => onEdit(rule), style: { ...btnStyle('ghost'), padding: '5px 10px', fontSize: 11 }, title: "Edit", children: "\u270F\uFE0F" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => onDelete(rule.id), style: { ...btnStyle('danger'), padding: '5px 10px', fontSize: 11 }, title: "Delete", children: "\uD83D\uDDD1" })] }) })] }, rule.id)))] })] }) })] }));
}
// ─── Tab: Triggered Alerts ────────────────────────────────────────────────────
function TriggeredAlertsTab({ alerts, projects }) {
    const [projectFilter, setProjectFilter] = (0, react_1.useState)('');
    const [typeFilter, setTypeFilter] = (0, react_1.useState)('');
    const [fromDate, setFromDate] = (0, react_1.useState)('');
    const [toDate, setToDate] = (0, react_1.useState)('');
    const filtered = alerts.filter(a => {
        if (projectFilter && a.project !== projectFilter)
            return false;
        if (typeFilter && a.alertType !== typeFilter)
            return false;
        if (fromDate && new Date(a.triggeredAt) < new Date(fromDate + 'T00:00:00'))
            return false;
        if (toDate && new Date(a.triggeredAt) > new Date(toDate + 'T23:59:59'))
            return false;
        return true;
    });
    const TH = ({ children }) => ((0, jsx_runtime_1.jsx)("th", { style: {
            padding: '10px 14px', textAlign: 'left', fontWeight: 600,
            color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)',
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
        }, children: children }));
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
                    padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--card-border)',
                    borderRadius: 8,
                }, children: [(0, jsx_runtime_1.jsxs)("select", { value: projectFilter, onChange: e => setProjectFilter(e.target.value), style: selectStyle, "aria-label": "Filter by project", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All Projects" }), projects.map(p => (0, jsx_runtime_1.jsx)("option", { value: p, children: p }, p))] }), (0, jsx_runtime_1.jsxs)("select", { value: typeFilter, onChange: e => setTypeFilter(e.target.value), style: selectStyle, "aria-label": "Filter by alert type", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All Types" }), (0, jsx_runtime_1.jsx)("option", { value: "High Failure", children: "High Failure" }), (0, jsx_runtime_1.jsx)("option", { value: "New Error", children: "New Error" }), (0, jsx_runtime_1.jsx)("option", { value: "Regression", children: "Regression" })] }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: "From:" }), (0, jsx_runtime_1.jsx)("input", { type: "date", value: fromDate, onChange: e => setFromDate(e.target.value), style: { ...inputStyle, width: 'auto' } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: "To:" }), (0, jsx_runtime_1.jsx)("input", { type: "date", value: toDate, onChange: e => setToDate(e.target.value), style: { ...inputStyle, width: 'auto' } }), (projectFilter || typeFilter || fromDate || toDate) && ((0, jsx_runtime_1.jsx)("button", { onClick: () => { setProjectFilter(''); setTypeFilter(''); setFromDate(''); setToDate(''); }, style: { ...btnStyle('ghost'), fontSize: 12 }, children: "Clear" })), (0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }, children: [filtered.length, " alert", filtered.length !== 1 ? 's' : ''] })] }), (0, jsx_runtime_1.jsx)("div", { style: cardStyle, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: 'var(--input-bg)' }, children: [(0, jsx_runtime_1.jsx)(TH, { children: "Triggered Time" }), (0, jsx_runtime_1.jsx)(TH, { children: "Project" }), (0, jsx_runtime_1.jsx)(TH, { children: "Error" }), (0, jsx_runtime_1.jsx)(TH, { children: "Rule Triggered" }), (0, jsx_runtime_1.jsx)(TH, { children: "Alert Type" })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [filtered.length === 0 && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 5, style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 28, marginBottom: 8 }, children: "\uD83D\uDCED" }), "No triggered alerts found"] }) })), filtered.map((a, i) => ((0, jsx_runtime_1.jsxs)("tr", { style: {
                                        borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                    }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '11px 14px', color: 'var(--text-muted)', fontFamily: 'ui-monospace,monospace', fontSize: 11, whiteSpace: 'nowrap' }, children: fmt(a.triggeredAt) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '11px 14px' }, children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#6366f120', color: '#818cf8' }, children: a.project }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '11px 14px', color: '#f87171', fontFamily: 'ui-monospace,monospace', fontSize: 11, maxWidth: 260, wordBreak: 'break-word' }, children: a.error }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '11px 14px', fontSize: 12, color: 'var(--text-subtle)' }, children: a.ruleTriggered }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '11px 14px' }, children: (0, jsx_runtime_1.jsx)(AlertTypeBadge, { type: a.alertType }) })] }, a.id)))] })] }) })] }));
}
// ─── Main component ───────────────────────────────────────────────────────────
function AlertManagement({ role }) {
    const [activeTab, setActiveTab] = (0, react_1.useState)('rules');
    const [rules, setRules] = (0, react_1.useState)([]);
    const [triggered, setTriggered] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
    const [editTarget, setEditTarget] = (0, react_1.useState)(null);
    const projects = useProjects();
    const canEdit = role === 'admin' || role === 'developer';
    // ── Map DB row → AlertRule ──────────────────────────────────────────────────
    function mapRule(row) {
        const windowMap = { 1: '1 minute', 5: '5 minutes', 15: '15 minutes' };
        return {
            id: row.id,
            name: row.rule_name,
            project: row.project_name,
            alertType: row.alert_type,
            threshold: row.threshold ?? null,
            window: row.window_minutes ? (windowMap[row.window_minutes] ?? `${row.window_minutes} minutes`) : null,
            channels: [],
            status: row.is_active ? 'active' : 'inactive',
        };
    }
    // ── Map DB row → TriggeredAlert ─────────────────────────────────────────────
    function mapTriggered(row) {
        return {
            id: row.id,
            triggeredAt: row.triggered_at,
            project: row.project_name,
            error: row.error ?? '',
            errorHash: '',
            ruleTriggered: row.rule_name ?? '—',
            alertType: row.alert_type,
            status: 'sent',
        };
    }
    function loadRules() {
        fetch('/api/alert-rules')
            .then(r => r.json())
            .then((rows) => setRules(rows.map(mapRule)))
            .catch(console.error)
            .finally(() => setLoading(false));
    }
    function loadTriggered() {
        fetch('/api/alert-history')
            .then(r => r.json())
            .then((rows) => setTriggered(rows.map(mapTriggered)))
            .catch(console.error);
    }
    react_1.default.useEffect(() => {
        loadRules();
        loadTriggered();
    }, []);
    function openCreate() { setEditTarget(null); setModalOpen(true); }
    function openEdit(rule) { setEditTarget(rule); setModalOpen(true); }
    async function handleSave(draft) {
        const windowMinMap = { '1 minute': 1, '5 minutes': 5, '15 minutes': 15 };
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
        }
        else {
            await fetch('/api/alert-rules', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
        }
        setModalOpen(false);
        loadRules();
    }
    async function handleDelete(id) {
        if (!window.confirm('Delete this alert rule?'))
            return;
        await fetch(`/api/alert-rules/${id}`, { method: 'DELETE' });
        loadRules();
    }
    async function handleToggle(id) {
        await fetch(`/api/alert-rules/${id}/toggle`, { method: 'PATCH' });
        loadRules();
    }
    const TABS = [
        { id: 'rules', label: 'Alert Rules', icon: '📋' },
        { id: 'triggered', label: 'Triggered Alerts', icon: '⚡' },
    ];
    const activeCount = rules.filter(r => r.status === 'active').length;
    return ((0, jsx_runtime_1.jsxs)("div", { "data-testid": "alert-management", children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 24 }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontSize: 22, fontWeight: 700, marginBottom: 4 }, children: "Alert Management" }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: 13, color: 'var(--text-muted)' }, children: "Configure alert rules, view triggered alerts, and manage notification channels" })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }, children: [
                    { label: 'Total Rules', value: rules.length, color: '#6366f1', icon: '📋' },
                    { label: 'Active Rules', value: activeCount, color: '#10b981', icon: '✅' },
                    { label: 'Triggered Today', value: triggered.length, color: '#f59e0b', icon: '⚡' },
                ].map(s => ((0, jsx_runtime_1.jsxs)("div", { style: {
                        background: 'var(--surface)', border: '1px solid var(--card-border)',
                        borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 22 }, children: s.icon }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 22, fontWeight: 800, color: s.color }, children: s.value }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }, children: s.label })] })] }, s.label))) }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }, children: TABS.map(tab => {
                    const active = activeTab === tab.id;
                    return ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setActiveTab(tab.id), style: {
                            padding: '9px 18px', borderRadius: '7px 7px 0 0', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                            background: active ? 'var(--surface)' : 'transparent',
                            color: active ? 'var(--text)' : 'var(--text-muted)',
                            borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                            marginBottom: -1,
                        }, children: [tab.icon, " ", tab.label] }, tab.id));
                }) }), activeTab === 'rules' && (loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }, children: "Loading\u2026" })) : ((0, jsx_runtime_1.jsx)(AlertRulesTab, { rules: rules, onEdit: canEdit ? openEdit : () => { }, onDelete: canEdit ? handleDelete : () => { }, onToggle: canEdit ? handleToggle : () => { }, onCreateRule: canEdit ? openCreate : () => { }, projects: projects }))), activeTab === 'triggered' && (0, jsx_runtime_1.jsx)(TriggeredAlertsTab, { alerts: triggered, projects: projects }), modalOpen && ((0, jsx_runtime_1.jsx)(RuleModal, { initial: editTarget ? {
                    name: editTarget.name,
                    project: editTarget.project,
                    alertType: editTarget.alertType,
                    threshold: editTarget.threshold != null ? String(editTarget.threshold) : '5',
                    window: editTarget.window ?? '1 minute',
                    channels: editTarget.channels,
                    status: editTarget.status,
                } : null, onSave: handleSave, onClose: () => setModalOpen(false), projects: projects }))] }));
}
//# sourceMappingURL=AlertManagement.js.map
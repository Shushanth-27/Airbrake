import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { ErrorDetailModal } from '../components/ErrorDetailModal';

const linkBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#818cf8',
  cursor: 'pointer',
  fontSize: 13,
  padding: 0,
  fontWeight: 500,
};

export function ErrorDetail() {
  const { errorHash } = useParams<{ errorHash: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const projectName = params.get('project_name') ?? params.get('project') ?? undefined;

  if (!errorHash) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: 16 }}>Invalid error detail route.</p>
        <button onClick={() => navigate('/breaks')} style={linkBtnStyle}>← Back to Breaks</button>
      </div>
    );
  }

  // After a resolve or reopen the BreaksList state is stale — navigate back
  // with a replace so the list re-mounts and re-fetches from the server.
  function handleClose() { navigate('/breaks', { replace: true }); }
  function handleRefresh() { /* navigation on close already causes a re-mount */ }

  return (
    <ErrorDetailModal
      row={location.state as import('../components/ErrorDetailModal').ErrorRow | undefined}
      errorHash={errorHash}
      projectName={projectName}
      onClose={handleClose}
      onRefresh={handleRefresh}
    />
  );
}

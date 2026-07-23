import { getTraceDisplayText } from '../ErrorDetailModal';

// getTraceDisplayText now shows only the saved KB solution text.
// error_detail is intentionally ignored — the stack trace section
// is a "known fix" display, not a raw error dump.
describe('getTraceDisplayText', () => {
  it('returns the solution text when present', () => {
    expect(getTraceDisplayText('Traceback: ValueError', 'Use the new config')).toBe('Use the new config');
  });

  it('returns null when solution text is absent', () => {
    expect(getTraceDisplayText('Traceback: ValueError', null)).toBeNull();
    expect(getTraceDisplayText('Traceback: ValueError', '')).toBeNull();
  });

  it('returns null when both arguments are empty', () => {
    expect(getTraceDisplayText(undefined, null)).toBeNull();
    expect(getTraceDisplayText(null, undefined)).toBeNull();
  });

  it('returns solution text regardless of error_detail value', () => {
    expect(getTraceDisplayText(null, 'Fix the DB pool')).toBe('Fix the DB pool');
    expect(getTraceDisplayText('', 'Fix the DB pool')).toBe('Fix the DB pool');
  });
});

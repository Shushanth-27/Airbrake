"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Unit tests for role-gated UI components.
 * Requirements: 6.3, 6.4, 6.5
 */
require("@testing-library/jest-dom");
const react_1 = require("@testing-library/react");
const AlertManagement_1 = require("../AlertManagement");
const Settings_1 = require("../../settings/Settings");
// DB-shaped mock data (matches mapRule field names)
const mockRules = [
    {
        id: 'rule-1',
        rule_name: 'High Error Rate',
        project_name: 'Test Project',
        alert_type: 'High Failure',
        threshold: 10,
        window_minutes: 1,
        is_active: true,
    },
];
const mockUsers = [
    {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
        oauthProvider: 'google',
        oauthSubject: 'sub-1',
        createdAt: new Date().toISOString(),
    },
];
const mockRetention = { applicationId: 'app-a', retentionDays: 30 };
// Helper: mock fetch — returns rules for /alert-rules, empty for everything else
function mockFetchForAlerts() {
    global.fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('alert-rules')) {
            return Promise.resolve({ ok: true, json: async () => mockRules });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
    });
}
beforeEach(() => {
    global.fetch = jest.fn();
});
afterEach(() => {
    jest.resetAllMocks();
});
describe('AlertManagement — role gating', () => {
    // AlertManagement makes 3 concurrent fetch calls on mount:
    //   /api/alert-rules, /api/alert-history, /api/projects
    // We use URL-based mocking so order doesn't matter.
    it('renders for admin role and shows rules after load', async () => {
        mockFetchForAlerts();
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByText('High Error Rate')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('alert-management')).toBeInTheDocument();
    });
    it('renders for developer role', async () => {
        mockFetchForAlerts();
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "developer" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByText('High Error Rate')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('alert-management')).toBeInTheDocument();
    });
    it('renders for viewer role (read-only)', async () => {
        mockFetchForAlerts();
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "viewer" }));
        // Component always renders for all roles
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('alert-management')).toBeInTheDocument());
    });
    it('renders alert rule items after data loads', async () => {
        mockFetchForAlerts();
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByText('High Error Rate')).toBeInTheDocument());
        expect(react_1.screen.getByText('High Error Rate')).toBeInTheDocument();
    });
});
describe('Settings — role gating', () => {
    // Settings makes 2 fetch calls on mount: /api/users and /api/retention
    function mockFetchForSettings() {
        global.fetch.mockImplementation((url) => {
            if (typeof url === 'string' && url.includes('users')) {
                return Promise.resolve({ ok: true, json: async () => mockUsers });
            }
            return Promise.resolve({ ok: true, json: async () => mockRetention });
        });
    }
    it('renders for admin role', async () => {
        mockFetchForSettings();
        (0, react_1.render)((0, jsx_runtime_1.jsx)(Settings_1.Settings, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('user-management')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('retention-settings')).toBeInTheDocument();
    });
    it('is hidden for developer role', () => {
        (0, react_1.render)((0, jsx_runtime_1.jsx)(Settings_1.Settings, { role: "developer" }));
        expect(react_1.screen.queryByTestId('settings')).not.toBeInTheDocument();
    });
    it('is hidden for viewer role', () => {
        (0, react_1.render)((0, jsx_runtime_1.jsx)(Settings_1.Settings, { role: "viewer" }));
        expect(react_1.screen.queryByTestId('settings')).not.toBeInTheDocument();
    });
    it('renders user rows', async () => {
        mockFetchForSettings();
        (0, react_1.render)((0, jsx_runtime_1.jsx)(Settings_1.Settings, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('user-row')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('user-email')).toHaveTextContent('admin@example.com');
        expect(react_1.screen.getByTestId('user-role')).toHaveTextContent('admin');
    });
});
//# sourceMappingURL=alertManagement.test.js.map
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
const mockRules = [
    {
        id: 'rule-1',
        name: 'High Error Rate',
        threshold: 10,
        windowSeconds: 60,
        triggerOnNewError: false,
        channels: [],
        createdBy: 'user-1',
        enabled: true,
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
beforeEach(() => {
    global.fetch = jest.fn();
});
afterEach(() => {
    jest.resetAllMocks();
});
describe('AlertManagement — role gating', () => {
    it('renders for admin role', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => mockRules,
        });
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('alert-management')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('create-rule')).toBeInTheDocument();
    });
    it('renders for developer role', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => mockRules,
        });
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "developer" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('alert-management')).toBeInTheDocument());
    });
    it('is hidden for viewer role', () => {
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "viewer" }));
        expect(react_1.screen.queryByTestId('alert-management')).not.toBeInTheDocument();
    });
    it('renders alert rule items', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => mockRules,
        });
        (0, react_1.render)((0, jsx_runtime_1.jsx)(AlertManagement_1.AlertManagement, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('alert-rule-item')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('rule-name')).toHaveTextContent('High Error Rate');
        expect(react_1.screen.getByTestId('rule-threshold')).toHaveTextContent('10');
    });
});
describe('Settings — role gating', () => {
    it('renders for admin role', async () => {
        global.fetch
            .mockResolvedValueOnce({ json: async () => mockUsers })
            .mockResolvedValueOnce({ json: async () => mockRetention });
        (0, react_1.render)((0, jsx_runtime_1.jsx)(Settings_1.Settings, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('settings')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('user-management')).toBeInTheDocument();
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
        global.fetch
            .mockResolvedValueOnce({ json: async () => mockUsers })
            .mockResolvedValueOnce({ json: async () => mockRetention });
        (0, react_1.render)((0, jsx_runtime_1.jsx)(Settings_1.Settings, { role: "admin" }));
        await (0, react_1.waitFor)(() => expect(react_1.screen.getByTestId('user-row')).toBeInTheDocument());
        expect(react_1.screen.getByTestId('user-email')).toHaveTextContent('admin@example.com');
        expect(react_1.screen.getByTestId('user-role')).toHaveTextContent('admin');
    });
});
//# sourceMappingURL=alertManagement.test.js.map
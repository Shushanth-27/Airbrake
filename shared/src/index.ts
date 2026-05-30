/**
 * @portal/shared — shared type definitions
 * Centralised domain types used across backend modules.
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

export type Role = 'viewer' | 'developer' | 'admin';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: Role;
  oauthProvider: string;
  oauthSubject: string;
  createdAt: Date;
}

// ─── LogRecord ────────────────────────────────────────────────────────────────

export interface LogRecord {
  id: string;
  applicationId: string;
  environment: 'production' | 'qa' | 'development';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  tags: string[];
  rawPayload: Record<string, unknown>;
}

// ─── Break ────────────────────────────────────────────────────────────────────

export type BreakStatus = 'new' | 'existing' | 'regression' | 'open' | 'resolved';

export interface Break {
  id: string;
  applicationId: string;
  environment: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  errorMessage: string;
  stackTrace: string;
  endpoint: string | null;
  requestPayload: Record<string, unknown> | null;
  userSession: Record<string, unknown> | null;
  timestamp: Date;
  fingerprint: string;
}

// ─── BreakGroup ───────────────────────────────────────────────────────────────

export interface BreakGroup {
  id: string;
  fingerprint: string;
  applicationId: string;
  firstOccurrence: Date;
  lastOccurrence: Date;
  occurrenceCount: number;
  status: 'open' | 'resolved' | 'regression';
  severity: 'info' | 'warning' | 'error' | 'critical';
  errorMessage: string;
}

// ─── AggregationResult ────────────────────────────────────────────────────────

export interface AggregationResult {
  group: BreakGroup;
  status: BreakStatus;
}

// ─── RetentionPolicy ─────────────────────────────────────────────────────────

export interface RetentionPolicy {
  applicationId: string;
  retentionDays: number;
}

// ─── AlertRule ────────────────────────────────────────────────────────────────

export type NotificationChannel =
  | { type: 'email'; address: string }
  | { type: 'teams'; webhookUrl: string }
  | { type: 'slack'; webhookUrl: string }
  | { type: 'webhook'; url: string };

export interface AlertRule {
  id: string;
  name: string;
  threshold: number;
  windowSeconds: number;
  triggerOnNewError: boolean;
  channels: NotificationChannel[];
  createdBy: string;
  enabled: boolean;
  createdAt?: Date;
}

// ─── AlertEvent ───────────────────────────────────────────────────────────────

export interface AlertEvent {
  ruleId: string;
  triggeredAt: Date;
  breakCount: number;
  newBreak?: Break;
}

// ─── SavedFilter ──────────────────────────────────────────────────────────────

export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  criteria: Record<string, unknown>;
}


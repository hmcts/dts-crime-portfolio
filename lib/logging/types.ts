/**
 * Shared types for the structured logging module.
 *
 * Spec: openspec/specs/observability/spec.md.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  event: string;
  service: "dts-crime-portfolio";
  [key: string]: unknown;
}

/**
 * Per-request context propagated via AsyncLocalStorage so that logger calls
 * inside a route handler automatically include the requestId, userEmail (when
 * resolved), method, and path without explicit threading.
 */
export interface RequestLogContext {
  requestId: string;
  method?: string;
  path?: string;
  userEmail?: string;
}

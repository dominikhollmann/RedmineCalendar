// Shared types for the RedmineCalendar codebase. Consumed by tsc --noEmit
// (JSDoc + checkJs); never imported at runtime.

// ── Browser globals loaded via <script> from CDNs ─────────────────
// Wrapped in `declare global` so the augmentation works even though this
// file is a module (it contains `export` declarations below).
declare global {
  const FullCalendar: any;
  const DOMPurify: any;
  const marked: any;
  const msal: any;

  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    // Mutable globals used by calendar.js to share state with FullCalendar callbacks
    _calendarArbzgWarnings?: ArbzgWarnings;
    _calendarDayTotals?: Record<string, number>;
    // CDN-loaded screenshot library (html2canvas@1.4.1)
    html2canvas?: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  }

  // FullCalendar event-object extensions used by calendar.js
  interface HTMLElement {
    _wired?: boolean;
  }
}

// ── Domain types ──────────────────────────────────────────────────

/**
 * Mapped Redmine time entry as used throughout the app. Built by
 * `mapTimeEntry(rawApiEntry)` in `redmine-api.js`.
 */
export interface TimeEntry {
  id: number | null;
  date: string; // YYYY-MM-DD
  hours: number;
  comment: string;
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  issueId?: number | null;
  issueSubject?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  projectIdentifier?: string | null;
  activityId?: number | null;
  activityName?: string | null;
  _rawComment?: string;
  _isMidnightContinuation?: boolean;
}

/** Search-result issue shape returned by `searchIssues()`. */
export interface IssueResult {
  id: number;
  subject: string;
  projectId: number | null;
  projectName: string;
  projectIdentifier: string | null;
  status: string;
}

/** Time-entry-activity row from `/enumerations/time_entry_activities.json`. */
export interface Activity {
  id: number;
  name: string;
  isDefault: boolean;
}

/** Per-user encrypted credentials (one of two shapes). */
export type Credentials =
  | { authType: 'apikey'; apiKey: string; username?: string; password?: string }
  | { authType: 'basic'; username: string; password: string; apiKey?: string };

/** Admin-managed shared configuration loaded from `/config.json`. */
export interface CentralConfig {
  redmineUrl: string;
  redmineServerUrl?: string;
  aiProvider?: string;
  aiModel?: string;
  aiProxyUrl?: string;
  azureClientId?: string;
  azureTenantId?: string;
  holidayTicket?: number;
  vacationTicket?: number;
  breakTicket?: number;
  redmineAcceptsZeroHours?: boolean;
  feedbackEmail?: string;
}

/** One captured JavaScript error or unhandled promise rejection. */
export interface SessionError {
  message: string;
  stack: string;
  timestamp: string; // ISO-8601
}

/** One entry in the network request ring buffer. */
export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number;
  ms: number;
}

/** One entry in the app-level log ring buffer. */
export interface AppLogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string; // ISO-8601
}

/** Current FullCalendar view snapshot. */
export interface CalendarViewState {
  view: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/** Full feedback report assembled before sending / mailto fallback. */
export interface FeedbackReport {
  category: 'bug' | 'suggestion';
  description: string;
  feedbackEmail: string;
  pageUrl: string;
  userAgent: string;
  os: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotDataUrl: string | null;
  errors?: SessionError[];
  networkLog?: NetworkLogEntry[];
  appLog?: AppLogEntry[];
  calendarState?: CalendarViewState | null;
  localStorageSnapshot?: Record<string, string>;
  timestamp: string; // ISO-8601
}

export type Locale = 'en' | 'de';

/** Working-hours pair persisted in localStorage. */
export interface WorkingHours {
  start: string; // HH:MM
  end: string; // HH:MM
}

/** Subset of the Microsoft Graph calendar event shape used by outlook.js. */
export interface OutlookEvent {
  subject: string;
  start: string; // ISO-ish "YYYY-MM-DDTHH:MM:SS"
  end: string;
  isAllDay: boolean;
  sensitivity: string;
  showAs: string;
}

/** A single ArbZG warning row as emitted by arbzg.js. */
export interface ArbzgWarning {
  rule: string;
  observed: number;
  allowed?: number;
  required?: number;
  messageKey: string;
}

/** Aggregate ArbZG warnings shape owned by the calendar-overlays module. */
export interface ArbzgWarnings {
  daily: Record<string, ArbzgWarning[]>;
  weekly: ArbzgWarning[];
  restPeriod: Record<string, ArbzgWarning>;
  sunday: string[];
  holiday: Record<string, string>;
  breaks: Record<string, ArbzgWarning[]>;
}

/** AI provider tool schema (Claude flavour). */
export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

/** Tool-call envelope (provider-agnostic, after parseClaudeResponse / OpenAI mapping). */
export interface ToolCall {
  type: 'tool_use';
  name?: string;
  input?: Record<string, any>;
  id?: string;
  text?: string | null;
  content?: string;
}

/** Tool execution result returned by `executeTool()`. */
export interface ToolResult {
  result: string;
}

/** Minimal AI config drawn from CentralConfig and used by chatbot-api.js. */
export interface AiConfig {
  aiProxyUrl: string;
  aiModel: string;
}

/** Callback invoked when the user selects a ticket in the time-entry form. */
export type TicketSelectCallback = (ticket: IssueResult) => void;

/** Lifecycle callbacks injected into openForm(). */
export interface TimeEntryFormCallbacks {
  onSave: (saved: TimeEntry) => void;
  onDelete: (deletedId: number) => void;
  onCancel?: () => void;
}

/** Outlook-derived booking proposal. */
export interface CalendarProposal {
  subject: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  hours: number;
  ticketId: number | null;
  ticketSubject: string | null;
  isAllDay: boolean;
  category: 'meeting' | 'break' | 'holiday' | 'vacation' | 'allday-other';
  status: 'proposed' | 'needs-ticket';
}

/** Planning View classification of an Outlook event. */
export type PlanningEventCategory = 'bookable' | 'needs-ticket' | 'excluded';

/** An Outlook event enriched with Planning View classification and rendering state. */
export interface PlanningEvent {
  id: string;
  proposal: CalendarProposal;
  rawEvent: OutlookEvent;
  planningCategory: PlanningEventCategory;
  isCovered: boolean;
  selected: boolean;
}

/** Saved classic calendar state for restoring on Planning View toggle-back. */
export interface SavedCalendarState {
  view: string; // e.g. 'timeGridWeek'
  date: string; // YYYY-MM-DD of the active start
}

/** Per-event outcome from a batch drag booking operation. */
export interface BookingOutcome {
  event: PlanningEvent;
  ok: boolean;
  error?: Error;
}

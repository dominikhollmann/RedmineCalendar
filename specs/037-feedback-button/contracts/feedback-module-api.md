# Contract: Feedback Module Public API

## js/feedback-context.js

Pure-logic module. No DOM access. Fully unit-testable.

### Exports

```ts
// Install the window.fetch proxy (call once at app startup, before other modules run)
export function installFetchLog(): void;

// Install window.onerror + unhandledrejection listeners (call once at app startup)
export function installErrorLog(): void;

// Opt-in structured log (replaces ad-hoc console calls in modules that want traceability)
export function log(level: 'log' | 'warn' | 'error', message: string): void;

// Snapshot all collected context for a FeedbackReport
export function collectBugContext(): Promise<BugContext>;
export function collectBaseContext(): BaseContext;

// Individual collectors (exposed for unit testing)
export function getNetworkLog(): NetworkLogEntry[];
export function getErrorLog(): SessionError[];
export function getAppLog(): AppLogEntry[];
export function getLocalStorageSnapshot(): Record<string, string>;
export function captureScreenshot(): Promise<string | null>;
```

### Types (internal to this contract)

```ts
interface BaseContext {
  pageUrl: string;
  userAgent: string;
  os: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotDataUrl: string | null;
}

interface BugContext extends BaseContext {
  errors: SessionError[];
  networkLog: NetworkLogEntry[];
  localStorageSnapshot: Record<string, string>;
  calendarState: CalendarViewState | null;
  appLog: AppLogEntry[];
}
```

---

## js/feedback.js

DOM-dependent module (`// @ts-nocheck`). Orchestrates the dialog and send flow.

### Exports

```ts
// Call from index.html and settings.html script after config is loaded.
// Creates the button and wires all event listeners. No-ops if feedbackEmail not configured.
export function initFeedback(): void;

// Programmatically open the dialog (for testing or future chatbot integration)
export function openFeedbackDialog(): void;
```

### Side effects of `initFeedback()`

1. Injects the feedback button `<button class="feedback-fab" …>` into `document.body`
2. Injects the feedback dialog `<dialog class="feedback-dialog" …>` into `document.body`
3. Wires button click → `openFeedbackDialog()`
4. Wires form submit → `_handleSubmit()`
5. Wires Cancel → dialog close + form reset

### Dialog lifecycle

```
[initFeedback called]
  → button created, hidden until config loaded
  → config has feedbackEmail → button shown

[user clicks button]
  → openFeedbackDialog()
  → captureScreenshot() called immediately (async, non-blocking)
  → base context captured synchronously
  → dialog shown (native <dialog> element, modal)

[user selects category]
  → Bug: error log, network log, localStorage, calendar state section revealed
  → Suggestion: only screenshot section shown

[user clicks Submit]
  → validate: category selected AND description non-empty
  → if Office 365 active: sendViaGraph(report)
  → else: openMailto(report)

[sendViaGraph resolves]
  → dialog closes, showToast(t('feedback.sent'))

[sendViaGraph rejects]
  → error message shown in dialog, dialog stays open, description preserved

[openMailto called]
  → window.open(mailtoUrl) — opens mail client
  → dialog closes
```

---

## js/outlook.js Extension

```ts
// New export — acquires Mail.Send token separately from Calendars.Read
export async function acquireFeedbackToken(): Promise<string>;

// New export — sends a pre-built FeedbackReport via Graph sendMail API
export async function sendFeedbackEmail(report: FeedbackReport): Promise<void>;

// New export — whether the user is currently signed in via MSAL
// (determines whether to attempt the Graph path or go straight to mailto)
export function isMsalSignedIn(): boolean;
```

---

## js/calendar.js Extension

```ts
// New export — returns current FullCalendar view state (view name + date range)
// Returns null if calendar not yet initialized (e.g. called from settings.html)
export function getCalendarViewState(): CalendarViewState | null;
```

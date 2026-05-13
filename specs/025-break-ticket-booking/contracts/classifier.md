# Contract: AI Subject Classifier (system-prompt extension)

**Feature**: 025 | **Consumer**: AI assistant (Claude / OpenAI) via the existing chatbot tool-call loop | **Producer**: `js/chatbot-tools.js` system prompt builder

> **SUPERSEDED during UAT (2026-05-08)**: The AI-prompt-based classifier proved unreliable — the AI would narrate classifications but not consistently route events. Per **FR-015**, classification was moved into the tool itself (`js/outlook.js`), which now returns a deterministic 4-section structure (EXCLUDED / AUTO-ROUTED-TO-BREAK / BOOKABLE / NEEDS-INPUT). The AI's role is now to relay the sections and call `create_time_entry` for each `status: proposed` row. The keyword vocabulary documented below is now hard-coded as `NON_WORK_KEYWORDS` (and sibling lists for bank-holiday names, vacation, overtime-comp, sick, informational) in `js/outlook.js`. See spec.md FR-015 through FR-018.

## Purpose

Teach the AI to classify each event in the proposal's "needs-ticket" bucket as work-related or non-work-related from its subject, and — when classified non-work AND `breakTicket` is in context — call `create_time_entry` with the break ticket and 0 hours rather than asking the user for a ticket.

## System-prompt addition (verbatim)

The booking-flow system prompt gains a paragraph appended after the existing tool-use instructions:

```
NON-WORK EVENT CLASSIFICATION

For each event in the "needs ticket" bucket of the proposal summary, classify the subject as
work-related or non-work-related. Non-work examples (English + German, case-insensitive — these
are HINTS, not a strict list; use judgment for variants and other languages):

  English: lunch, breakfast, dinner, coffee, gym, doctor, dentist, appointment, errand,
           school run, school pickup, personal, break, vacation, day off, walk
  German:  Mittagessen, Frühstück, Abendessen, Kaffee, Sport, Fitness, Arzt, Arzttermin,
           Zahnarzt, Termin, persönlich, Pause, privat, Urlaub, Spaziergang

If you classify the event as non-work AND a break ticket ID is provided in this conversation's
context (look for "break ticket: <ID>" in the day-summary), call create_time_entry with:
  issueId   = <break ticket ID>
  hours     = 0
  startTime = <event start time, HH:mm>
  spentOn   = <event date, YYYY-MM-DD>
  comment   = <event subject, verbatim>

Do NOT ask the user about a non-work event you classified yourself unless the user has previously
in this same conversation corrected one of your break-routings (in which case ask for that
correction's intent before re-classifying).

If no break ticket is in context, fall back to the existing flow: ask the user for a ticket as
you do today for events without an extracted ticket reference.
```

## Day-summary context line (added by `chatbot-tools.js`)

When `breakTicket` is present in the central config, the proposal summary text emitted by the `outlook.fetch_for_day` tool gains a header line:

```
break ticket: <breakTicket>
```

Placed before the proposals listing so the AI can reference it without ambiguity.

## Tool-call shape (existing `create_time_entry`, no schema change)

```json
{
  "name": "create_time_entry",
  "input": {
    "issueId":   <breakTicket>,
    "spentOn":   "<YYYY-MM-DD>",
    "hours":     0,
    "startTime": "<HH:mm>",
    "comment":   "<event.subject>",
    "activityId": <default activity ID from config>
  }
}
```

## Conformance checks (mocked-AI Vitest)

| Test                                                                 | Mocked AI emits                                                   | Expected outcome                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Lunch with `breakTicket`                                             | `create_time_entry(breakTicket, 0h, 12:00, "Lunch with Team")`    | Time entry created on break ticket; calendar shows 0h block at 12:00 |
| Doctor appointment with `breakTicket`                                | `create_time_entry(breakTicket, 0h, 14:00, "Doctor Appointment")` | Same as above                                                        |
| "Sprint Planning" with `breakTicket`                                 | (AI does NOT route to break) — emits work-flow ask                | User is prompted for a ticket                                        |
| Lunch WITHOUT `breakTicket`                                          | (AI does NOT route — falls back to ask)                           | User is prompted for a ticket                                        |
| Lunch with `breakTicket` followed by user "no, that's actually work" | Next lunch: AI re-asks instead of auto-routing                    | Confirms the "don't re-ask after correction" rule                    |

## Non-determinism note

The classifier's output is non-deterministic across model versions and runs. Vitest cases use mocked tool responses to enforce the contract above; live behavior is validated by UAT (see `quickstart.md`). Per spec Assumptions, this is the explicit testing strategy for AI-driven steps.

## Failure modes

| Scenario                                       | Behavior                                                                                                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI fails to classify (hallucinated tool call)  | Existing chatbot retry / error display; user sees the error and can re-run.                                                                                                                        |
| AI classifies a clear-work meeting as non-work | User sees the "Break (0h)" indicator in the summary OR catches it in the modal; user changes the ticket back to work, modal hours-lock releases (FR-012), entry saved as work. SC-003 covers this. |
| AI classifies a clear-non-work meeting as work | User opens the modal, changes ticket to break, modal hours-lock engages, entry saved at 0h. Same recovery path.                                                                                    |

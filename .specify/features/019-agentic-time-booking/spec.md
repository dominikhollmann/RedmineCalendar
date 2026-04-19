# Feature Specification: Agentic AI Time-Booking Assistant

**Feature Branch**: `019-agentic-time-booking`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "Extend AI Assistant to guide through daily time bookings using data from Outlook calendar, Teams, SharePoint, git, Windows Event Log. AI learns associations between activities and tickets. Uses ChatGPT/Codex at work."

## Vision

The AI assistant becomes a proactive time-booking agent. At the end of the workday, the user asks "Book my time for today." The assistant gathers activity data from multiple sources, reconstructs the day's timeline, maps activities to Redmine tickets (using learned associations and heuristics), and walks the user through confirming and booking each time block — all within the existing chat panel.

## Phased Delivery

This feature is too large for a single implementation cycle. It is broken into phases, each independently valuable:

| Phase | Scope | Value |
|-------|-------|-------|
| **Phase 1** | Outlook calendar integration — meetings with ticket numbers in titles auto-mapped to Redmine tickets | Covers ~40% of a typical day (meetings); immediately useful |
| **Phase 2** | Activity memory — AI learns associations (e.g., "calls with Peter → ticket #1234") and remembers them across sessions | Reduces repeated questions; AI gets smarter over time |
| **Phase 3** | Teams + Email integration — calls, messages, and sent emails as activity signals | Fills gaps between meetings; covers communication time |
| **Phase 4** | SharePoint + Git integration — file activity and commits as work signals | Covers deep-work time (coding, documents) |
| **Phase 5** | Windows Event Log — login/lock/unlock times for work session boundaries and break detection | Automates start/end/lunch detection |
| **Phase 6** | Full day reconstruction — combines all sources, rounds to quarter hours, handles gaps, produces complete booking proposal | The complete "book my day" experience |

Each phase is specified below as an independent user story. Only Phase 1 is detailed enough for immediate planning. Later phases will be refined when they become active.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Outlook Calendar Booking (Priority: P1) — Phase 1

A user says "Book my time for today" in the chat. The assistant fetches today's Outlook calendar events, identifies meetings with ticket numbers in the title (e.g., "Sprint Review #2097"), and proposes time entries for each. The user confirms each one via the time entry modal.

**Why this priority**: Calendar meetings are the most structured and reliable activity data. Many companies already put ticket numbers in meeting titles. This alone covers a large part of a typical workday.

**Independent Test**: Create a meeting in Outlook with "#1234" in the title, then ask the AI to book time for today. Verify it proposes a time entry for ticket #1234 with the meeting's start/end time.

**Acceptance Scenarios**:

1. **Given** the user has Outlook meetings today with ticket numbers in the titles, **When** they ask "Book my time for today", **Then** the assistant lists each meeting with the proposed ticket, start/end time, and asks for confirmation.
2. **Given** a meeting title contains "#1234", **When** the assistant processes it, **Then** it maps to Redmine ticket #1234 and resolves the ticket subject.
3. **Given** a meeting title has no ticket number, **When** the assistant processes it, **Then** it asks the user which ticket to book it on (or skip).
4. **Given** the user confirms a proposed entry, **When** they click Save in the modal, **Then** the entry is created in Redmine and the calendar refreshes.
5. **Given** the user says "skip" for a meeting, **When** the assistant continues, **Then** that meeting is skipped and the next one is presented.
6. **Given** the user has already booked time for some meetings today, **When** the assistant proposes entries, **Then** it excludes time slots that overlap with existing Redmine entries.

---

### User Story 2 — Activity Memory (Priority: P2) — Phase 2

The assistant learns associations between activities and tickets. When it encounters a pattern it has seen before (e.g., "call with Peter" → ticket #1234), it suggests the learned ticket instead of asking. The user can correct the suggestion, and the correction updates the memory.

**Why this priority**: Without memory, the assistant asks the same questions every day. Memory makes it progressively smarter and faster.

**Acceptance Scenarios**:

1. **Given** the user previously associated "Teams call with Peter" with ticket #1234, **When** the assistant sees another call with Peter, **Then** it suggests ticket #1234 automatically.
2. **Given** the user corrects a suggestion ("not #1234, use #5678"), **When** the correction is accepted, **Then** the memory is updated for future use.
3. **Given** the user has recurring morning email/chat activity, **When** the assistant sees this pattern, **Then** it suggests the user's orga ticket.

---

### User Story 3 — Teams + Email Integration (Priority: P3) — Phase 3

The assistant reads Teams call history and email send/receive timestamps to identify communication activities and fill gaps between meetings.

**Acceptance Scenarios**:

1. **Given** the user had a Teams call from 10:03–10:20, **When** the assistant processes the day, **Then** it shows this as a time block and suggests a ticket (from memory or asks).
2. **Given** the user sent emails from 8:30–8:54, **When** the assistant processes this, **Then** it groups it as a communication block.

---

### User Story 4 — SharePoint + Git Integration (Priority: P4) — Phase 4

The assistant detects file activity in SharePoint and git commits to identify focused work blocks.

**Acceptance Scenarios**:

1. **Given** there was SharePoint activity on a file in "Project X" from 10:20–12:27, **When** the assistant processes this, **Then** it identifies the project and suggests the relevant ticket.
2. **Given** the user made git commits on a branch named "feature/1234-login", **When** the assistant processes this, **Then** it extracts ticket #1234 from the branch name.

---

### User Story 5 — Windows Event Log (Priority: P5) — Phase 5

The assistant reads Windows login/lock/unlock events to determine work session start/end and detect breaks.

**Acceptance Scenarios**:

1. **Given** the user logged in at 8:30 and it is now 17:00, **When** the assistant starts, **Then** it proposes 8:30–17:00 as the work session and asks for confirmation.
2. **Given** the PC was locked from 12:27–13:03, **When** the assistant processes this, **Then** it identifies this as a lunch break and excludes it from bookable time.

---

### User Story 6 — Full Day Reconstruction (Priority: P6) — Phase 6

The assistant combines all data sources into a complete day timeline, rounds times to quarter hours, handles overlaps and gaps, and produces a full booking proposal.

**Acceptance Scenarios**:

1. **Given** all data sources are connected, **When** the user asks "Book my time for today", **Then** the assistant presents a complete day plan with all time blocks mapped to tickets.
2. **Given** there are gaps in the timeline, **When** the assistant encounters them, **Then** it asks the user what they were doing.
3. **Given** overlapping activities, **When** the assistant processes them, **Then** it picks the most likely primary activity and asks for confirmation.

---

### Edge Cases

- What if the user has no Outlook access configured? The assistant should gracefully skip that source and use whatever is available.
- What if a meeting spans multiple tickets? The assistant should ask the user to split or assign to one ticket.
- What about recurring meetings that change tickets over time? Memory should store the most recent association, not a permanent one.
- What about private/confidential calendar events? The assistant should respect calendar privacy flags and skip those events.
- What about timezone differences? All times should be in the user's local timezone.
- What about half-day work or sick days? The assistant should handle work sessions shorter than a full day.

## Requirements *(mandatory)*

### Functional Requirements

**Phase 1 (Outlook Calendar):**
- **FR-001**: The assistant MUST be able to read the user's Outlook calendar events for a given day.
- **FR-002**: The assistant MUST extract ticket numbers from meeting titles using the `#<number>` pattern.
- **FR-003**: For meetings with a ticket number, the assistant MUST propose a time entry with the meeting's start/end time and the extracted ticket.
- **FR-004**: For meetings without a ticket number, the assistant MUST ask the user which ticket to use.
- **FR-005**: The assistant MUST open the time entry modal for each proposed entry so the user can confirm via Save.
- **FR-006**: The assistant MUST skip time slots that overlap with already-booked Redmine entries.
- **FR-007**: Times MUST be rounded to the nearest quarter hour.
- **FR-008**: The assistant MUST work with ChatGPT/Codex as the LLM provider (not Claude) in the company environment.

**Phase 2 (Memory):**
- **FR-009**: The assistant MUST persist learned activity-to-ticket associations across sessions.
- **FR-010**: The user MUST be able to correct any AI suggestion, and the correction MUST update the memory.

**Phase 3+ (Future — not detailed):**
- FR-011 to FR-020 will be specified when those phases become active.

### Key Entities

- **Activity Source**: A system that provides activity data (Outlook, Teams, SharePoint, Git, Windows Event Log). Each source has a connector that normalizes data into activity blocks.
- **Activity Block**: A time range + source + metadata (meeting title, call participant, file name, commit message). The AI maps these to tickets.
- **Activity-Ticket Association**: A learned mapping from an activity pattern (e.g., "call with Peter") to a Redmine ticket number. Stored in the user's browser and updated on correction.
- **Day Plan**: A chronological sequence of activity blocks covering the work session, with each block mapped to a ticket (confirmed or proposed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: (Phase 1) Users can book a full day of meetings in under 5 minutes using chat-guided booking, compared to 15+ minutes manually.
- **SC-002**: (Phase 1) 80% of meetings with ticket numbers in the title are correctly auto-mapped on the first attempt.
- **SC-003**: (Phase 2) After 2 weeks of use, 70% of recurring activities are auto-suggested without asking.
- **SC-004**: (Phase 6) A complete workday can be booked in under 10 minutes with AI assistance.

## Assumptions

- **Architecture**: This feature requires a local agent or companion service running on the user's Windows machine to access Outlook, Teams, SharePoint, and Windows Event Log. The browser-based web app communicates with this agent via a local API (similar to the CORS proxy pattern).
- **Microsoft 365 access**: Outlook calendar data is accessed via the Microsoft Graph API. The user authenticates via OAuth2 (company SSO). Teams, SharePoint, and email also use Graph API with appropriate scopes.
- **Windows Event Log**: Requires a local script or service with permission to read the Security event log (logon/logoff/lock/unlock events).
- **LLM provider**: The company uses ChatGPT/Codex. The assistant uses the OpenAI-compatible API for tool calling. The existing multi-provider chatbot-api.js already supports this.
- **Privacy**: Activity data is processed locally and sent to the LLM only as summarized context (e.g., "meeting titled 'Sprint Review #2097' from 9:00-10:00"), never raw email content or file contents.
- **Memory storage**: Activity-ticket associations are stored in the user's browser (localStorage or IndexedDB), consistent with the existing credential storage pattern.
- **Phased delivery**: Only Phase 1 will be planned and implemented immediately. Later phases are specified at a high level and will be refined when they become the next priority.
- **Quarter-hour rounding**: All proposed times are rounded to the nearest 15-minute boundary (e.g., 10:03 → 10:00, 10:08 → 10:15).

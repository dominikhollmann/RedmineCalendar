# Feature Specification: Enhanced Project Display and Search

**Feature Branch**: `023-project-prominence`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Include project more prominently. Display project by ID and title in modal and calendar. Search tickets by project in modal. AI Assistant should have access to project name and ID for booking."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Project ID and Name in Calendar and Modal (Priority: P1)

A user with many Redmine tickets across multiple projects needs to quickly identify which project a time entry belongs to. In the calendar view, each event displays both the project identifier (e.g., "PROJ") and the project name (e.g., "My Project") instead of just the project name. The same applies in the time entry modal -- when viewing or editing an entry, the project is shown as "PROJ — My Project".

**Why this priority**: This is the most impactful change with the lowest complexity. Users with many projects currently struggle to distinguish entries that share similar ticket titles but belong to different projects. The project identifier is a compact, recognizable label they already use in Redmine.

**Independent Test**: Can be fully tested by creating time entries on tickets from different projects and verifying both the calendar events and the modal display the project identifier alongside the project name.

**Acceptance Scenarios**:

1. **Given** a time entry exists for a ticket in project "PROJ" (named "My Project"), **When** the user views the calendar, **Then** the event displays the project as "PROJ — My Project".
2. **Given** a user opens the time entry modal for an existing entry, **When** they view the project field, **Then** it shows "PROJ — My Project".
3. **Given** a user searches for tickets in the modal and selects one, **When** the search results are displayed, **Then** each result shows the project identifier and name alongside the ticket title.
4. **Given** a project has no identifier set in Redmine, **When** the entry is displayed, **Then** only the project name is shown (graceful fallback).
5. **Given** the user is on a mobile device, **When** they view the calendar, **Then** the project identifier and name are both visible, with the display adapting to the smaller screen (e.g., shorter format if needed).

---

### User Story 2 - Search Tickets by Project (Priority: P2)

A user wants to find a specific ticket to log time against, but only remembers the project it belongs to. In the time entry modal's search field, they can type a project name or project identifier to filter the ticket list. They can also combine project and ticket terms (e.g., "PROJ management" to find the "Project Management" ticket in project PROJ).

**Why this priority**: With many tickets, scrolling through unfiltered results is slow. Project-based filtering dramatically narrows results and matches how users think about their work -- by project first, then by task.

**Independent Test**: Can be tested by typing a project identifier or name in the search field and verifying that results are filtered to tickets from that project.

**Acceptance Scenarios**:

1. **Given** the time entry modal is open, **When** the user types a project identifier (e.g., "PROJ") in the search field, **Then** the results show only tickets from that project.
2. **Given** the time entry modal is open, **When** the user types a project name (e.g., "My Project") in the search field, **Then** the results show only tickets from that project.
3. **Given** the time entry modal is open, **When** the user types a combination of project and ticket terms (e.g., "PROJ management"), **Then** the results show tickets from project PROJ that match "management" in their title.
4. **Given** the user types a search term that matches both a project name and a ticket title, **When** results are displayed, **Then** both matches are shown, with project matches clearly distinguishable from title matches.
5. **Given** the user has favourites or recently-used tickets, **When** they type a project filter, **Then** the favourites/recent lists are also filtered by the matching project.

---

### User Story 3 - AI Assistant Knows About Projects (Priority: P3)

A user tells the AI assistant to "book 2 hours on the Project-Management ticket of Project X". The assistant understands project references by name or identifier, resolves the correct ticket, and creates the time entry. When the assistant reports existing time entries, it includes the project identifier and name.

**Why this priority**: This extends the project awareness to the AI interaction layer (features 014/015). It's lower priority because it depends on the data changes from P1 and enhances an existing capability rather than introducing a new workflow.

**Independent Test**: Can be tested by asking the assistant to book time using project references and verifying it resolves the correct ticket and creates the entry.

**Acceptance Scenarios**:

1. **Given** the AI assistant is open, **When** the user says "book 2h on the Project-Management ticket of PROJ", **Then** the assistant identifies the correct ticket in project PROJ and creates the time entry.
2. **Given** the AI assistant queries time entries, **When** it reports results, **Then** each entry includes the project identifier and name (e.g., "PROJ — My Project").
3. **Given** the user references a project by name (e.g., "Project X"), **When** the assistant searches for tickets, **Then** it filters by that project and presents matching tickets.
4. **Given** the user provides an ambiguous project reference that matches multiple projects, **When** the assistant processes it, **Then** it asks the user to clarify which project they mean.
5. **Given** the user says "what did I book on Project X this week?", **When** the assistant queries, **Then** it filters time entries by the referenced project and summarizes them.

---

### Edge Cases

- What happens when a project identifier is very long? The display truncates gracefully with a tooltip showing the full identifier and name.
- What happens when multiple projects share similar names? The project identifier disambiguates them in all views.
- What happens when the Redmine API does not return project identifier data? The system falls back to displaying only the project name, as it does today.
- What happens when the user searches with a project term that matches no projects? Normal ticket-title search behavior applies; no results are hidden.
- What happens when the AI assistant receives a project reference that doesn't exist? The assistant informs the user that no matching project was found and suggests checking the project name or identifier.

## Requirements *(mandatory)*

### Functional Requirements

**Display**

- **FR-001**: System MUST display the project identifier and project name together (format: "ID — Name") on calendar events, replacing the current name-only display.
- **FR-002**: System MUST display the project identifier and name in the time entry modal when viewing or editing an entry.
- **FR-003**: System MUST display the project identifier and name in ticket search results within the time entry modal.
- **FR-004**: System MUST fall back to displaying only the project name when no project identifier is available.
- **FR-005**: System MUST fetch and store the project identifier alongside the project name for all ticket and time entry data.

**Search**

- **FR-006**: System MUST allow users to search tickets in the time entry modal by project identifier.
- **FR-007**: System MUST allow users to search tickets in the time entry modal by project name.
- **FR-008**: System MUST support combined search terms that include both project and ticket information (e.g., "PROJ management").
- **FR-009**: System MUST filter favourites and recently-used ticket lists when a project filter is applied.

**AI Assistant**

- **FR-010**: The AI assistant MUST have access to project identifiers and names when querying or creating time entries.
- **FR-011**: The AI assistant MUST be able to resolve ticket references that include project context (by name or identifier).
- **FR-012**: The AI assistant MUST include project identifier and name when reporting time entries to the user.
- **FR-013**: The AI assistant MUST ask for clarification when a project reference is ambiguous (matches multiple projects).

**Localization**

- **FR-014**: All user-visible strings introduced by this feature MUST be localized via the existing i18n system (English and German).

### Key Entities

- **Project**: A Redmine project with an identifier (short string, e.g., "PROJ"), a numeric ID, and a display name. Projects group related tickets.
- **Ticket (Issue)**: An existing entity, now enriched with its parent project's identifier in addition to the project name already available.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every time entry displayed on the calendar and in the modal shows the project identifier alongside the project name (where an identifier exists in Redmine).
- **SC-002**: Users can find a ticket by typing only the project identifier or project name in the search field, with results appearing in under 1 second.
- **SC-003**: Combined project-and-title searches (e.g., "PROJ management") return correctly filtered results, narrowing the result set by at least 80% compared to title-only search.
- **SC-004**: The AI assistant correctly resolves project-scoped ticket references (e.g., "the management ticket in Project X") in at least 90% of cases where a unique match exists.
- **SC-005**: Users with 10+ active projects report that locating the right ticket is noticeably faster than with title-only display and search.

## Assumptions

- The Redmine API provides the project identifier field in its issue and project responses (standard field in Redmine REST API).
- "Project identifier" refers to Redmine's short string identifier (e.g., "my-project"), not the numeric database ID. Both are fetched, but the identifier is used for display and search since it's more human-readable.
- The existing calendar event layout and modal layout can accommodate the additional project identifier text without a redesign.
- The AI assistant's existing tool-calling architecture (features 014/015) supports adding project fields to tool schemas without structural changes.
- The feature applies to all views: desktop and mobile calendar, time entry modal, and AI assistant chat.
- Search by project is additive — it enhances the existing search, not replacing any current search behavior.

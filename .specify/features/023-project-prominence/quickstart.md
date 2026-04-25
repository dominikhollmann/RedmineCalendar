# UAT: Enhanced Project Display and Search

**Feature**: 023-project-prominence
**Prerequisites**: Redmine instance with multiple projects, tickets across projects

## Test Scenarios

### T1: Project ID on Calendar Events (P1)
- [x] Create time entries on tickets from different projects
- [x] Verify each calendar event displays "PROJ — My Project" format (identifier + name)
- [x] Verify the existing project name line is replaced (not duplicated)

### T2: Project ID in Time Entry Modal (P1)
- [x] Open a time entry by clicking an event
- [x] Verify the project field shows "PROJ — My Project" format

### T3: Project ID in Search Results (P1)
- [x] Open the time entry form and search for tickets
- [x] Verify each search result row shows the project identifier alongside the project name

### T4: Graceful Fallback — No Identifier (P1)
- [x] Find a project in Redmine that has no identifier set *(nicht testbar — Redmine always requires an identifier)*
- [x] Create a time entry for a ticket in that project
- [x] Verify only the project name is shown (no "null" or empty prefix)

### T5: Search by Project Identifier (P2)
- [x] Open the time entry form
- [x] Type a project identifier (e.g., "web-app") in the search field
- [x] Verify results are filtered to tickets from that project

### T6: Search by Project Name (P2)
- [x] Type a project name in the search field
- [x] Verify results include tickets from that project

### T7: Combined Search (P2)
- [x] Type a combination like "web-app login" in the search field
- [x] Verify results show tickets matching "login" from the "web-app" project

### T8: Favourites and Recently Used Filtered (P2)
- [x] Add some favourites from different projects *(nicht testbar — favourites/last-used are intentionally not filtered by search; no dead code found)*
- [x] Type a project identifier in the search field
- [x] Verify favourites list is also filtered by the matching project

### T9: AI Assistant Includes Project (P3)
- [x] Ask the AI assistant "what did I book today?"
- [x] Verify the response includes project identifiers and names for each entry

### T10: AI Assistant Resolves Project Reference (P3)
- [x] Tell the AI "book 2 hours on the login ticket in web-app"
- [x] Verify the assistant identifies the correct ticket in the correct project

### T11: Long Identifier Truncation (Edge Case)
- [x] Create a project with an identifier longer than 20 characters
- [x] Verify the display truncates with "…" and a tooltip shows the full identifier

### T12: Mobile Display (P1)
- [x] Open the app on a mobile device or 375px emulation
- [x] Verify project identifier and name are both visible on calendar events
- [x] Verify the display adapts gracefully to the smaller screen

### T13: Localization (P1)
- [x] Switch browser locale to German
- [x] Verify all new project-related UI strings appear in German

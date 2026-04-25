# UAT: Enhanced Project Display and Search

**Feature**: 023-project-prominence
**Prerequisites**: Redmine instance with multiple projects, tickets across projects

## Test Scenarios

### T1: Project ID on Calendar Events (P1)
- [ ] Create time entries on tickets from different projects
- [ ] Verify each calendar event displays "PROJ — My Project" format (identifier + name)
- [ ] Verify the existing project name line is replaced (not duplicated)

### T2: Project ID in Time Entry Modal (P1)
- [ ] Open a time entry by clicking an event
- [ ] Verify the project field shows "PROJ — My Project" format

### T3: Project ID in Search Results (P1)
- [ ] Open the time entry form and search for tickets
- [ ] Verify each search result row shows the project identifier alongside the project name

### T4: Graceful Fallback — No Identifier (P1)
- [ ] Find a project in Redmine that has no identifier set
- [ ] Create a time entry for a ticket in that project
- [ ] Verify only the project name is shown (no "null" or empty prefix)

### T5: Search by Project Identifier (P2)
- [ ] Open the time entry form
- [ ] Type a project identifier (e.g., "web-app") in the search field
- [ ] Verify results are filtered to tickets from that project

### T6: Search by Project Name (P2)
- [ ] Type a project name in the search field
- [ ] Verify results include tickets from that project

### T7: Combined Search (P2)
- [ ] Type a combination like "web-app login" in the search field
- [ ] Verify results show tickets matching "login" from the "web-app" project

### T8: Favourites and Recently Used Filtered (P2)
- [ ] Add some favourites from different projects
- [ ] Type a project identifier in the search field
- [ ] Verify favourites list is also filtered by the matching project

### T9: AI Assistant Includes Project (P3)
- [ ] Ask the AI assistant "what did I book today?"
- [ ] Verify the response includes project identifiers and names for each entry

### T10: AI Assistant Resolves Project Reference (P3)
- [ ] Tell the AI "book 2 hours on the login ticket in web-app"
- [ ] Verify the assistant identifies the correct ticket in the correct project

### T11: Long Identifier Truncation (Edge Case)
- [ ] Create a project with an identifier longer than 20 characters
- [ ] Verify the display truncates with "…" and a tooltip shows the full identifier

### T12: Mobile Display (P1)
- [ ] Open the app on a mobile device or 375px emulation
- [ ] Verify project identifier and name are both visible on calendar events
- [ ] Verify the display adapts gracefully to the smaller screen

### T13: Localization (P1)
- [ ] Switch browser locale to German
- [ ] Verify all new project-related UI strings appear in German

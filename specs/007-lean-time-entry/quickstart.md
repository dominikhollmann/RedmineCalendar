# Quickstart & Acceptance Checklist: Super Lean Time Entry UX (007)

**Prerequisites**: App is running (`npm run proxy` + `npm run serve`), Redmine API key configured in Settings, at least one Redmine project with open issues accessible.

---

## Setup

- [x] Open http://localhost:3000
- [x] Verify the calendar loads without errors
- [x] Confirm you are on the weekly calendar view

---

## 1. Core Flow — Create a Time Entry

- [x] Drag on the calendar to select a time range (e.g. 09:00–10:30)
- [x] Verify a minimal form appears immediately with focus on the search field
- [x] Verify the form has **no** Comment field
- [x] Verify the form has **no** Activity dropdown
- [x] Verify the form has **no** manual duration/hours input
- [x] Type 2–3 characters of a ticket name or number
- [x] Verify search results appear within 1 second
- [x] Press the down arrow key to highlight the first result
- [x] Press Enter
- [x] Verify the time entry is saved and appears on the calendar in the correct time slot
- [x] Verify the form closes automatically after saving

---

## 2. Keyboard Navigation

- [x] Open the form again (drag a new time range)
- [x] Type a search query
- [x] Use arrow keys to navigate up and down through results
- [x] Press Enter on a highlighted result — verify it saves
- [x] Open the form again
- [x] Press Escape — verify the form closes without saving anything

---

## 3. Favourites

- [x] Open the form (drag a time range)
- [x] Search for a ticket
- [x] Mark the ticket as a favourite (star/pin icon)
- [x] Press Escape to close without saving
- [x] Open the form again
- [x] Verify the favourited ticket appears in the list **before typing anything**
- [x] Select it with keyboard (arrow + Enter) or click — verify the entry saves
- [x] Open the form again
- [x] Remove the ticket from favourites
- [x] Open the form again — verify the ticket no longer appears in the favourites list
- [x] Reload the page — open the form — verify favourites persist after reload

---

## 4. Last Used

- [x] Save a time entry against a ticket (any method)
- [x] Open the form again
- [x] Verify the ticket just used appears in the "Last used" section before typing
- [x] Save 6 different ticket entries one by one
- [x] Open the form — verify only the 5 most recent tickets appear in Last used (oldest dropped)
- [x] Reload the page — verify Last used list persists

---

## 5. Edit Existing Entry

- [ ] Click on an existing time entry on the calendar
- [ ] Verify a minimal edit form appears showing the current ticket
- [ ] Verify the edit form has **no** Comment field
- [ ] Verify the edit form has **no** Activity dropdown
- [ ] Change the ticket by searching and selecting a new one
- [ ] Save — verify the calendar event updates to show the new ticket
- [ ] Click the entry again — verify the Delete button is visible
- [ ] Click Delete — confirm — verify the entry is removed from the calendar

---

## 6. Edge Cases

- [x] Drag a time range → search for a term with no results → verify a "No results" message appears (not a blank dropdown)
- [x] Open the form → click outside the form → verify the form closes without saving
- [x] Drag a time range → do nothing → wait — verify no entry is created

---

## Completion

All items above must be checked before marking feature 007 as UAT complete in BACKLOG.md.

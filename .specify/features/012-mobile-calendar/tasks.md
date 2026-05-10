# Tasks: Mobile Calendar View

## Phase 1: Mobile Calendar Layout

- [x] T001 [US1] Add CSS media queries in `css/style.css` for screens <768px: calendar fills viewport, hide desktop-only UI elements, stack header vertically
- [x] T002 [US1] Update `js/calendar.js` — detect mobile viewport on init and switch to `timeGridDay` view. Re-check on window resize.
- [x] T003 [US1] Add swipe navigation in `js/calendar.js` — touchstart/touchend handler on calendar element, swipe left = next day, swipe right = prev day

## Phase 2: Mobile Form & Panels

- [x] T004 [US2] Add CSS media queries for time entry modal — full-screen on mobile, full-width inputs, larger buttons (44px+ touch targets)
- [x] T005 [US2] Add CSS media queries for settings page — full-width card, larger inputs
- [x] T006 [US3] Add CSS media queries for AI chat panel — full-screen overlay on mobile instead of side panel
- [x] T007 [US3] Add CSS media queries for docs panel — full-screen overlay on mobile

## Phase 3: Tests & Polish

- [x] T008 Add UI test `tests/ui/mobile.spec.js` — test with mobile viewport (375px): calendar renders, day view active, form opens full-screen
- [x] T009 Update user docs `docs/content.en.md` and `docs/content.de.md` — mention mobile support
- [x] T010 Run quickstart.md acceptance tests

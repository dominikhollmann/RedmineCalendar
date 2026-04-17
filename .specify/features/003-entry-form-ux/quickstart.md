# Quickstart & Acceptance Checklist: Localization (003)

**Prerequisites**: App running (`npm run serve`), Redmine API key configured.

---

## Setup

- [x] Open browser DevTools → Application / Storage → confirm no stale locale overrides
- [x] Open http://localhost:3000

---

## 1. German locale

- [x] Set browser language to German (`de` or `de-DE`) and reload
- [x] Verify the calendar page displays all labels in German (toolbar buttons, week total, day names)
- [x] Verify the settings page displays all labels in German
- [x] Open the lean time entry modal (drag a range) — verify all strings are in German ("Suche", "Zuletzt verwendet", "Favoriten", "Speichern", "Abbrechen")
- [x] Verify dates in the calendar header use DD.MM.YYYY format

---

## 2. English locale

- [x] Set browser language to English (`en` or `en-US`) and reload
- [x] Verify the calendar page displays all labels in English
- [x] Verify the settings page displays all labels in English
- [x] Open the lean time entry modal — verify all strings are in English ("Search", "Last used", "Favourites", "Save", "Cancel")

---

## 3. Fallback locale

- [x] Set browser language to an unsupported language (e.g., `fr`) and reload
- [x] Verify the application falls back to English

---

## 4. No flash of English in German mode

- [x] With browser set to German, do a hard reload (Ctrl+Shift+R)
- [x] Verify no English strings appear even briefly before German strings load

---

## 5. Error messages

- [x] Disconnect from the network, trigger a save or calendar load
- [x] Verify the error message displayed is in German when browser language is `de`
- [x] Reconnect and verify normal operation resumes

---

## 6. Dynamic Redmine content (exclusion check)

- [x] Verify ticket subjects, project names, and activity names are shown as-is from Redmine (not translated)

---

## Completion

All items above must be checked before marking feature 003 as UAT complete in BACKLOG.md.

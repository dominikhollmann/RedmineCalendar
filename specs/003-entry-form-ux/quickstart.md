# Quickstart & Acceptance Checklist: Localization (003)

**Prerequisites**: App running (`npm run serve` or `npm run serve:staging`), Redmine API key configured.

---

## Setup

- [ ] Open browser DevTools → Application / Storage → confirm no stale locale overrides
- [ ] Open http://localhost:3000

---

## 1. German locale

- [ ] Set browser language to German (`de` or `de-DE`) and reload
- [ ] Verify the calendar page displays all labels in German (toolbar buttons, week total, day names)
- [ ] Verify the settings page displays all labels in German
- [ ] Open the lean time entry modal (drag a range) — verify all strings are in German ("Suche", "Zuletzt verwendet", "Favoriten", "Speichern", "Abbrechen")
- [ ] Verify dates in the calendar header use DD.MM.YYYY format

---

## 2. English locale

- [ ] Set browser language to English (`en` or `en-US`) and reload
- [ ] Verify the calendar page displays all labels in English
- [ ] Verify the settings page displays all labels in English
- [ ] Open the lean time entry modal — verify all strings are in English ("Search", "Last used", "Favourites", "Save", "Cancel")

---

## 3. Fallback locale

- [ ] Set browser language to an unsupported language (e.g., `fr`) and reload
- [ ] Verify the application falls back to English

---

## 4. No flash of English in German mode

- [ ] With browser set to German, do a hard reload (Ctrl+Shift+R)
- [ ] Verify no English strings appear even briefly before German strings load

---

## 5. Error messages

- [ ] Disconnect from the network, trigger a save or calendar load
- [ ] Verify the error message displayed is in German when browser language is `de`
- [ ] Reconnect and verify normal operation resumes

---

## 6. Dynamic Redmine content (exclusion check)

- [ ] Verify ticket subjects, project names, and activity names are shown as-is from Redmine (not translated)

---

## Completion

All items above must be checked before marking feature 003 as UAT complete in BACKLOG.md.

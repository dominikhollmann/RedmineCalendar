# Contract: CSS-Architektur nach Feature 036

**Version**: 1.0 | **Status**: Draft (wird mit Phase 2 final)

## Datei-zu-Komponente-Mapping (bindend ab Phase 2)

| CSS-Datei | Verantwortliche Komponenten | Eingebunden in |
|---|---|---|
| `css/base.css` | `:root` Variablen, Dark-Mode `:root`-Overrides, html/body/a Reset, Typografie, Toast, Loading Overlay, Error Banner, A11y-Utilities | `index.html`, `settings.html` |
| `css/calendar.css` | App-Header, Kalender-Container, FullCalendar-Overrides, Event-Content, Toolbar-Switches, View-Mode-Switch, Arbeitszeit-Modal-Row, Clipboard-Banner, ArbZG-Warnungen, Break-Ticket, Anomalie-Badge, Overflow-Indikatoren, Mobile-Responsive (Kalender) | `index.html` |
| `css/time-entry.css` | Time-Entry-Modal, Bestätigungsdialog, Lean-Formular (3-Spalten-Layout), AI-Highlighted-Fields, Mobile-Responsive (Formular) | `index.html` |
| `css/docs.css` | Help-Button, Docs-Panel, Chatbot-Button, Chatbot-Panel, Voice-Input | `index.html` |
| `css/settings.css` | Settings-Seite, Willkommensbanner, Konfig-Fehlerseite, Passwort-Toggle, Versionsanzeige, Auth-Methoden-Toggle, Open-Source-Lizenzen-Seite | `settings.html` (+ `index.html` für Toast-Wiederverwendung) |

## `<link>`-Reihenfolge (bindend)

### `index.html`

```html
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/calendar.css" />
<link rel="stylesheet" href="css/time-entry.css" />
<link rel="stylesheet" href="css/docs.css" />
<link rel="stylesheet" href="css/settings.css" />
```

### `settings.html`

```html
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/docs.css" />
<link rel="stylesheet" href="css/settings.css" />
```

**Begründung**: `base.css` muss immer zuerst geladen sein (definiert alle Variablen). Komponentendateien sind voneinander unabhängig (kein Kaskadierungsabhängigkeit zwischen ihnen). `settings.html` lädt nur was es braucht.

## Dark-Mode-Platzierungsregel (bindend, aus Klarify-Session)

Dark-Mode-Überschreibungen für **Komponenten-Selektoren** (nicht `:root`-Variablen) werden **am Ende der jeweiligen Komponenten-Datei** platziert:

```css
/* Ende von calendar.css — Dark Mode */
[data-theme='dark'] .app-header { ... }
[data-theme='dark'] .anomaly-badge { ... }
```

Der **`:root[data-theme='dark']`-Block** (CSS-Variablen-Overrides) bleibt **ausschließlich in `base.css`**.

## Verbotene Praktiken (CI-erzwungen)

| Verstoß | Durchgesetzt von |
|---|---|
| `<style>`-Block in HTML | HTMLHint `no-style-tag` |
| `style=""`-Attribut in HTML | HTMLHint `inline-style-disabled` |
| Hardcodierter Farbwert in CSS (`#hex`, `rgb()`, `rgba()`, `hsl()`) | Stylelint custom rule |
| CSS `@import` zwischen Komponentendateien | Code-Review-Gate (keine automatische Regel nötig) |

## Stylelint-Ausnahmen (dokumentiert, minimal)

FullCalendar-Overrides verwenden das `--fc-*` CSS-Variablenschema von FullCalendar selbst. Diese Variablen werden mit unserem Designsystem-Werten befüllt:

```css
/* In calendar.css */
.fc {
  --fc-border-color: var(--neutral-stroke-1);       /* ✓ var(--*) */
  --fc-page-bg-color: var(--neutral-background-1);   /* ✓ var(--*) */
}
```

Keine `/* stylelint-disable */`-Kommentare sind für Standard-Use-Cases notwendig.

## Migrationspfad für Style-CSS

Nach Phase 2 wird `css/style.css` ersetzt durch:

```css
/* css/style.css — DEPRECATED
   This file has been split. See css/base.css, css/calendar.css,
   css/time-entry.css, css/docs.css, css/settings.css */
```

Alternativ vollständige Löschung wenn keine externen Referenzen existieren (empfohlen).

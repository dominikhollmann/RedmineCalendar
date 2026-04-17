# RedmineCalendar Hilfe

## Erste Schritte

RedmineCalendar ist eine Wochenkalender-Ansicht für Ihre Redmine-Zeiteinträge. Die App verbindet sich über einen lokalen CORS-Proxy mit Ihrem Redmine-Server und zeigt alle Ihre Zeiteinträge in einer übersichtlichen Kalenderansicht an.

Öffnen Sie zum Einrichten die **Einstellungen** (Zahnrad-Symbol in der Kopfzeile) und konfigurieren Sie Ihre Redmine-Server-URL und Ihren API-Schlüssel. Die App verbindet sich über einen lokalen Proxy, den Sie auf Ihrem Rechner starten.

## Kalender-Navigation

Der Kalender zeigt jeweils eine Woche an. Verwenden Sie die Navigations-Buttons in der Werkzeugleiste:

- **Zurück / Weiter**-Pfeile wechseln eine Woche vor oder zurück
- **Heute**-Button springt zur aktuellen Woche
- Die **Wochensumme** wird in der Kopfzeile angezeigt und zeigt die Gesamtstunden der sichtbaren Woche

## Zeiteinträge

### Zeiteintrag erstellen

Klicken oder ziehen Sie auf einen leeren Zeitslot im Kalender. Ein Formular öffnet sich, in dem Sie:

- Nach einem Redmine-Ticket per Name oder ID suchen können
- Aus zuletzt verwendeten Tickets oder Favoriten auswählen können
- Start- und Endzeit festlegen (vorausgefüllt basierend auf Ihrem Klick)
- Den Eintrag speichern

Der Eintrag erscheint sofort nach dem Speichern im Kalender.

### Zeiteintrag bearbeiten

Doppelklicken Sie auf einen bestehenden Zeiteintrag (oder wählen Sie ihn aus und drücken **Enter**), um das Bearbeitungsformular zu öffnen. Ändern Sie beliebige Felder und klicken Sie auf **Speichern**.

### Zeiteintrag löschen

Wählen Sie einen Zeiteintrag per Klick aus und drücken Sie **Entf**, um ihn zu löschen. Sie werden vor dem Löschen um Bestätigung gebeten.

## Kopieren und Einfügen von Zeiteinträgen

Sie können Zeiteinträge duplizieren, um ähnliche Arbeit schnell zu erfassen:

1. **Wählen** Sie einen Zeiteintrag per Klick aus (er wird mit blauem Rahmen hervorgehoben)
2. Drücken Sie **Strg+C** zum Kopieren — ein Banner bestätigt die Kopie
3. **Klicken Sie auf einen leeren Zeitslot**, um den Eintrag dort einzufügen
4. Der eingefügte Eintrag behält dasselbe Ticket und die Dauer, verwendet aber den neuen Zeitslot

Ziehen Sie über mehrere Slots, um mit einer individuellen Dauer einzufügen.

## Arbeitszeitansicht

Schalten Sie die Arbeitszeitansicht mit dem **Uhr-Symbol** in der Kalender-Werkzeugleiste um. Wenn aktiviert, zeigt der Kalender nur Zeitslots innerhalb Ihrer konfigurierten Arbeitszeiten (z.B. 08:00–17:00).

Wenn Zeiteinträge außerhalb des sichtbaren Bereichs vorhanden sind, erscheinen Hinweise oben oder unten im Kalender.

Konfigurieren Sie Ihre Arbeitszeiten in den **Einstellungen** unter „Arbeitszeiten". Lassen Sie beide Felder leer, um diese Ansicht zu deaktivieren.

## Arbeitswoche / Volle Woche

Verwenden Sie den **Mo–Fr**-Umschalter in der Werkzeugleiste, um zwischen folgenden Ansichten zu wechseln:

- **Arbeitswoche**: Zeigt nur Montag bis Freitag
- **Volle Woche**: Zeigt alle sieben Tage inklusive Samstag und Sonntag

Wenn Zeiteinträge an ausgeblendeten Wochenendtagen vorhanden sind, erscheint ein Hinweis an der Seite des Kalenders.

## Favoriten-Tickets

Markieren Sie häufig verwendete Tickets als Favoriten für schnellen Zugriff:

- Klicken Sie im Zeiteintrag-Formular auf das **Stern-Symbol** neben einem Suchergebnis oder kürzlich verwendeten Ticket, um es als Favorit hinzuzufügen
- Favoriten erscheinen in einem eigenen Bereich oben in der Ticket-Auswahl
- Klicken Sie erneut auf den Stern, um ein Ticket aus den Favoriten zu entfernen

Favoriten werden lokal im Browser gespeichert und bleiben über Sitzungen hinweg erhalten.

## ArbZG-Konformitätsanzeigen

Der Kalender zeigt Warnungen an, wenn Ihre erfassten Stunden möglicherweise gegen das Arbeitszeitgesetz (ArbZG) verstoßen:

- **Tageshöchstarbeitszeit**: Mehr als 10 Stunden an einem Tag gearbeitet
- **Wochenhöchstarbeitszeit**: Mehr als 48 Stunden in einer Woche gearbeitet
- **Ruhezeit**: Weniger als 11 Stunden zwischen dem Ende eines Tages und dem Beginn des nächsten
- **Pausenregelung**: Mehr als 6 Stunden ununterbrochene Arbeit ohne Pause
- **Sonn-/Feiertagsarbeit**: Zeiteinträge an Sonntagen oder gesetzlichen Feiertagen

Warnungen erscheinen als farbige Indikatoren in den betroffenen Tageskopfzeilen. Fahren Sie mit der Maus darüber für Details.

## Einstellungen

Öffnen Sie die Einstellungen über das **Zahnrad-Symbol** in der Kopfzeile.

### Redmine-Server-URL

Geben Sie die vollständige URL Ihrer Redmine-Instanz ein (z.B. `https://redmine.example.com`). Diese wird verwendet, um den Proxy-Befehl zu generieren.

### Proxy-URL

Die CORS-Proxy-URL, die die App für API-Anfragen verwendet. Standard: `http://localhost:8010/proxy`. Starten Sie den Proxy mit dem auf der Einstellungsseite angezeigten Befehl.

### Authentifizierung

Wählen Sie zwischen:

- **API-Schlüssel**: Zu finden in Redmine unter *Mein Konto* und dann *API-Zugriffsschlüssel*
- **Benutzername & Passwort**: Ihre Redmine-Anmeldedaten

### Arbeitszeiten

Legen Sie Ihre tägliche Start- und Endzeit fest. Diese werden vom Arbeitszeitansicht-Umschalter im Kalender verwendet.

## Tastenkürzel

| Tastenkürzel | Aktion |
|----------|--------|
| Klick | Zeiteintrag auswählen |
| Doppelklick | Zeiteintrag zum Bearbeiten öffnen |
| Enter | Ausgewählten Zeiteintrag zum Bearbeiten öffnen |
| Strg+C | Ausgewählten Zeiteintrag kopieren |
| Entf | Ausgewählten Zeiteintrag löschen |
| Escape | Dialog schließen oder Auswahl aufheben |

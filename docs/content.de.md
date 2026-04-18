# RedmineCalendar Hilfe

## Erste Schritte

RedmineCalendar ist eine Wochenkalender-Ansicht für Ihre Redmine-Zeiteinträge. Die App verbindet sich mit Ihrem Redmine-Server und zeigt alle Ihre Zeiteinträge in einer übersichtlichen Kalenderansicht an.

Öffnen Sie zum Einrichten die **Einstellungen** (Zahnrad-Symbol in der Kopfzeile) und geben Sie Ihren persönlichen Redmine-API-Schlüssel ein. Die Redmine-Server-URL und weitere gemeinsame Einstellungen werden von Ihrem Administrator in `config.json` konfiguriert.

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

## KI-Chat-Assistent

Der KI-Chat-Assistent hilft Ihnen, RedmineCalendar zu verstehen und zu nutzen. Klicken Sie auf das **Chat-Symbol** (💬) in der Kalender-Kopfzeile, um das Chat-Panel zu öffnen.

### Was Sie fragen können

- Wie Sie eine Funktion verwenden ("Wie kopiere ich einen Zeiteintrag?")
- Was Warnungen bedeuten ("Was ist das ArbZG-Tageslimit?")
- Technische Details ("Welche localStorage-Schlüssel verwendet die App?")
- Fragen auf Deutsch oder Englisch — der Assistent antwortet in Ihrer Sprache

### Tipps

- Der Assistent kennt die Dokumentation, Funktionsspezifikationen und den Quellcode der App
- Er lehnt Fragen ab, die nichts mit RedmineCalendar zu tun haben
- Er gibt niemals Ihre API-Schlüssel oder Anmeldedaten preis
- Das Gespräch bleibt erhalten, wenn Sie das Panel schließen und wieder öffnen (wird beim Neuladen der Seite gelöscht)
- Ziehen Sie den linken Rand des Panels, um die Größe anzupassen

## Einstellungen

Öffnen Sie die Einstellungen über das **Zahnrad-Symbol** in der Kopfzeile.

### Server-Konfiguration (schreibgeschützt)

Die Redmine-URL, KI-Assistenten-Einstellungen und Proxy-URLs werden von Ihrem Administrator in `config.json` verwaltet. Diese werden als schreibgeschützte Informationen oben auf der Einstellungsseite angezeigt. Bei Änderungsbedarf wenden Sie sich an Ihren Administrator.

### Authentifizierung

Wählen Sie zwischen:

- **API-Schlüssel**: Zu finden in Redmine unter *Mein Konto* und dann *API-Zugriffsschlüssel*. Ein direkter Link zu Ihrer Redmine-Kontoseite wird neben dem Feld angezeigt.
- **Benutzername & Passwort**: Ihre Redmine-Anmeldedaten

Ihre Anmeldedaten werden verschlüsselt in Ihrem Browser gespeichert und niemals an den Webserver gesendet.

### Arbeitszeiten

Legen Sie Ihre tägliche Start- und Endzeit fest. Diese werden vom Arbeitszeitansicht-Umschalter im Kalender verwendet.

### KI-Assistent

Der KI-Chat-Assistent wird zentral vom Administrator konfiguriert. Auf Ihrer Seite ist keine Einrichtung nötig — wenn der Administrator einen KI-Anbieter in `config.json` konfiguriert hat, ist die Chat-Funktion automatisch verfügbar.

## Tastenkürzel

| Tastenkürzel | Aktion |
|----------|--------|
| Klick | Zeiteintrag auswählen |
| Doppelklick | Zeiteintrag zum Bearbeiten öffnen |
| Enter | Ausgewählten Zeiteintrag zum Bearbeiten öffnen |
| Strg+C | Ausgewählten Zeiteintrag kopieren |
| Entf | Ausgewählten Zeiteintrag löschen |
| Escape | Dialog schließen oder Auswahl aufheben |

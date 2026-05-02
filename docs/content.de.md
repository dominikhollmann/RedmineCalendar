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

- Nach einem Redmine-Ticket per Name, ID oder **Projekt** suchen — tippen Sie eine Projektkennung (z.B. "web-app") oder einen Projektnamen, um Tickets nach Projekt zu filtern, oder kombinieren Sie mit Ticket-Begriffen (z.B. "web-app login")
- Aus zuletzt verwendeten Tickets oder Favoriten auswählen (auch nach Projekt filterbar)
- Datum, Start- und Endzeit festlegen (vorausgefüllt basierend auf Ihrem Klick — alle drei sind Pflichtfelder)
- Einen optionalen Kommentar hinzufügen
- Den Eintrag speichern

Die Ticket-ID und der Titel im Formular sind ein klickbarer Link zum Redmine-Ticket.

Der Eintrag erscheint sofort nach dem Speichern im Kalender. Die Ticketnummer auf jedem Kalendereintrag ist ein klickbarer Link zum Redmine-Ticket (öffnet in neuem Tab). Jeder Eintrag zeigt auch die **Projektkennung und den Namen** (z.B. "web-app — Web App"), um Einträge projektübergreifend unterscheiden zu können.

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
- Fragen zu Ihren Zeiteinträgen ("Wie viel habe ich letzte Woche gebucht?", "Wann habe ich zuletzt auf Ticket #123 gearbeitet?")
- Fragen auf Deutsch oder Englisch — der Assistent antwortet in Ihrer Sprache

### Zeiteinträge per Chat verwalten

Sie können Zeiteinträge durch natürlichsprachliche Befehle erstellen, bearbeiten und löschen:

- **Erstellen**: "Buche 2 Stunden auf Ticket #5678 für heute" — öffnet das Formular vorausgefüllt
- **Bearbeiten**: "Ändere meinen Montags-Eintrag auf Ticket #5678 auf 3 Stunden" — öffnet das Formular mit dem Eintrag und den vorgeschlagenen Änderungen
- **Löschen**: "Lösche meinen Eintrag von gestern auf Ticket #1234" — öffnet das Formular zur Bestätigung

Der Assistent öffnet immer das Zeiteintrag-Formular zur Überprüfung und Bestätigung — er nimmt nie Änderungen ohne Ihre Zustimmung vor.

### Spracheingabe

Sie können mit dem KI-Assistenten sprechen, statt zu tippen. Klicken Sie auf die **Mikrofon-Taste** neben der Senden-Taste, um die Spracheingabe zu starten.

- **Start**: Tippen Sie auf die Mikrofon-Taste, um die Aufnahme zu starten. Ihre Sprache wird live im Eingabefeld transkribiert.
- **Automatisches Senden**: Die Aufnahme stoppt automatisch nach 2 Sekunden Stille und Ihre Nachricht wird gesendet — komplett freihändig.
- **Stop**: Sie können auch die Stop-Taste tippen, um sofort zu beenden.
- **Abbrechen**: Tippen Sie erneut auf die Mikrofon-Taste, bevor Sie sprechen, um abzubrechen.
- Die Mikrofon-Taste ist nur in Browsern sichtbar, die Spracherkennung unterstützen (Chrome, Edge, Safari).
- Bei der ersten Nutzung erscheint ein Datenschutzhinweis, der erklärt, dass Ihr Browser Audio zur Verarbeitung an Cloud-Dienste senden kann.
- Die Aufnahme stoppt automatisch nach maximal 60 Sekunden.

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

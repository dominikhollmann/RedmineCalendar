# RedmineCalendar Hilfe

**Inhalt**

1. [Erste Schritte](#erste-schritte)
2. [Kalender-Navigation](#kalender-navigation)
3. [Zeiteinträge](#zeiteinträge)
4. [Break-Ticket-Einträge](#break-ticket-einträge)
5. [Kopieren und Einfügen von Zeiteinträgen](#kopieren-und-einfügen-von-zeiteinträgen)
6. [Mehrfachauswahl, Verschieben und Löschen](#mehrfachauswahl-verschieben-und-löschen)
7. [Arbeitszeitansicht](#arbeitszeitansicht)
8. [Arbeitswoche / Volle Woche](#arbeitswoche--volle-woche)
9. [Planungsansicht](#planungsansicht)
10. [Mobile Nutzung](#mobile-nutzung)
11. [Favoriten-Tickets](#favoriten-tickets)
12. [ArbZG-Konformitätsanzeigen](#arbzg-konformitätsanzeigen)
13. [Anomalie-Indikatoren](#anomalie-indikatoren)
14. [KI-Chat-Assistent](#ki-chat-assistent)
15. [Einstellungen](#einstellungen)
16. [Tastenkürzel](#tastenkürzel)

## Erste Schritte

RedmineCalendar ist eine Wochenkalender-Ansicht für Ihre Redmine-Zeiteinträge. Die App verbindet sich mit Ihrem Redmine-Server und zeigt alle Ihre Zeiteinträge in einer übersichtlichen Kalenderansicht an.

Öffnen Sie zum Einrichten die **Einstellungen** (Zahnrad-Symbol in der Kopfzeile) und geben Sie Ihren persönlichen Redmine-API-Schlüssel ein. Die Redmine-Server-URL und weitere gemeinsame Einstellungen werden von Ihrem Administrator in `config.json` konfiguriert.

## Kalender-Navigation

Der Kalender zeigt jeweils eine Woche an. Verwenden Sie die Navigations-Buttons in der Werkzeugleiste:

- **Zurück / Weiter**-Pfeile wechseln eine Woche vor oder zurück
- **Heute**-Button springt zur aktuellen Woche
- Die **Wochensumme** wird in der Kopfzeile angezeigt und zeigt die Gesamtstunden der sichtbaren Woche

Wenn Sie in den Einstellungen ein **Wochenstunden-Ziel** gesetzt haben, zeigt die Kopfzeile zusätzlich einen Zielindikator:

- `Gebucht / Ziel` — z.B. `24 / 40h`
- `Xh verbleibend` — noch fehlende Stunden bis zum Ziel
- `Xt` — verbleibende Arbeitstage der aktuellen Woche (bei vergangenen Wochen nicht angezeigt)

Bei genau erreichtem Ziel erscheint ein Häkchen (✓). Bei Überschreitung wird das Plus angezeigt (z.B. `+5h`). Der Indikator aktualisiert sich sofort beim Hinzufügen, Bearbeiten oder Löschen von Einträgen.

## Zeiteinträge

### Zeiteintrag erstellen

Klicken oder ziehen Sie auf einen leeren Zeitslot im Kalender. Ein Formular öffnet sich, in dem Sie:

- Nach einem Redmine-Ticket per Name, ID oder **Projekt** suchen — tippen Sie eine Projektkennung (z.B. "web-app") oder einen Projektnamen, um Tickets nach Projekt zu filtern, oder kombinieren Sie mit Ticket-Begriffen (z.B. "web-app login")
- Tippen Sie `#1234`, um ein bestimmtes Ticket direkt per ID nachzuschlagen
- Aus zuletzt verwendeten Tickets oder Favoriten auswählen (auch nach Projekt filterbar)

> **Hinweis zu geschlossenen Tickets:** Die Ticket-Suche liefert ausschließlich **offene Tickets**. Geschlossene oder erledigte Tickets erscheinen nicht in den Suchergebnissen. Falls Sie trotzdem eine Zeit auf ein geschlossenes Ticket buchen möchten, geben Sie die ID direkt ein (z.B. `#1234`) — eine direkte ID-Suche umgeht den Filter und funktioniert unabhängig vom Ticket-Status.

- Datum, Start- und Endzeit festlegen (vorausgefüllt basierend auf Ihrem Klick — alle drei sind Pflichtfelder)
- Einen optionalen Kommentar hinzufügen
- Den Eintrag speichern

Die Ticket-ID und der Titel im Formular sind ein klickbarer Link zum Redmine-Ticket.

**Das Formular schließt sich nicht durch Klicken außerhalb.** Um das Formular ohne Speichern zu schließen, drücken Sie **Escape** oder klicken Sie auf **Abbrechen**. So gehen Ihre Eingaben nicht versehentlich verloren.

Der Eintrag erscheint sofort nach dem Speichern im Kalender. Die Ticketnummer auf jedem Kalendereintrag ist ein klickbarer Link zum Redmine-Ticket (öffnet in neuem Tab). Jeder Eintrag zeigt auch die **Projektkennung und den Namen** (z.B. "web-app — Web App"), um Einträge projektübergreifend unterscheiden zu können.

### Warnung bei geschlossenem Ticket

Wenn das gewählte Ticket geschlossen ist, erscheint im Formular ein **⚠ Dieses Ticket ist geschlossen.**-Badge. Beim Klick auf **Speichern** erscheint ein Bestätigungsdialog, bevor der Eintrag an Redmine übermittelt wird. Dies gilt für alle Buchungswege — das Formular (Neu und Bearbeiten), Einfügen, KI-Vorausfüllung, Planungsansicht-Ziehen und Drag-to-Move im Hauptkalender.

Das **⚠-Symbol erscheint auch direkt** neben dem Ticket-Titel in den Schnellauswahl-Listen **Zuletzt verwendet** und **Favoriten**, wenn das Ticket inzwischen geschlossen wurde — so erkennen Sie veraltete Verknüpfungen, bevor Sie sie auswählen.

### Warnung bei Buchung in der Zukunft

Wenn Sie einen Zeiteintrag speichern, der **in der Zukunft** datiert ist, erscheint ein Bestätigungsdialog, bevor der Eintrag übermittelt wird. Zukunftsdatierte Einträge sind ungewöhnlich, da Zeitbuchungen normalerweise für bereits geleistete Arbeit erfasst werden. Klicken Sie auf **Trotzdem fortfahren**, um die Buchung abzuschließen, oder auf **Abbrechen**, um das Datum zu korrigieren.

**Ausnahme:** Einträge auf dem vom Administrator konfigurierten Urlaubs- oder Feiertagsticket sind von dieser Prüfung ausgenommen, da es zulässig ist, Urlaub im Voraus zu erfassen.

### Warnung bei Meldeschluss

Ihr Administrator kann einen **Meldeschluss** konfigurieren (z. B. jeden Freitag um 22:00 Uhr). Wenn Sie einen Zeiteintrag erstellen, bearbeiten oder löschen, der **vor dem letzten Meldeschluss** datiert ist, erscheint ein Bestätigungsdialog mit dem Hinweis, dass die Änderung in keinem bereits eingereichten Wochenbericht erscheinen wird. Die Prüfung gilt für:

- Speichern eines neuen Eintrags oder Bearbeiten eines vorhandenen im Formular.
- Löschen eines einzelnen Eintrags über den Löschen-Button im Formular.
- Löschen von Einträgen über den Tastaturbefehl (**Entf** im Mehrfachauswahl-Modus).
- Verschieben eines Eintrags per Drag-and-Drop oder Größenänderung im Kalender.

Klicken Sie auf **Trotzdem fortfahren**, um die Änderung anzuwenden. Klicken Sie auf **Abbrechen**, um den Eintrag unverändert zu lassen.

Wenn kein Meldeschluss vom Administrator konfiguriert ist (Standard), wird diese Warnung nie angezeigt.

### Zeiteintrag bearbeiten

Doppelklicken Sie auf einen bestehenden Zeiteintrag (oder wählen Sie ihn aus und drücken **Enter**), um das Bearbeitungsformular zu öffnen. Ändern Sie beliebige Felder und klicken Sie auf **Speichern**.

### Zeiteintrag löschen

Wählen Sie einen Zeiteintrag per Klick aus und drücken Sie **Entf**, um ihn zu löschen. Sie werden vor dem Löschen um Bestätigung gebeten.

## Break-Ticket-Einträge

Ihr Administrator kann ein **Break-Ticket** in der `config.json` konfigurieren. Zeiteinträge auf dem Break-Ticket repräsentieren Nicht-Arbeitsblöcke (Mittagessen, Arzttermin, Sport, Überstundenausgleich usw.), die Sie im Kalender sichtbar haben möchten, ohne sie als Arbeitszeit zu zählen.

Sobald Sie das Break-Ticket auswählen — entweder manuell im Zeiteintrag-Formular oder weil der KI-Assistent es aus einem Outlook-Termin vorausgefüllt hat — wechselt die Dauer-Anzeige des Formulars zu **„0m (Pause)"**, um zu signalisieren, dass der Eintrag mit null Stunden gespeichert wird. Die Start- und End-Zeit-Eingaben bleiben editierbar, sodass der Kalenderblock die echte Termindauer widerspiegelt. Beim Wechsel zurück auf ein anderes Ticket wird die berechnete Dauer wiederhergestellt.

Break-Einträge erscheinen im Kalender in gedämpftem Grau mit einem kleinen „(0h)"-Badge. Sie zählen nicht als Arbeitsstunden für Ihre Wochen- oder Tagessumme. (Wenn Ihre Redmine-Instanz Null-Stunden-Einträge nicht akzeptiert, speichert die App stattdessen 0,01h als Platzhalter, damit der Eintrag persistiert; der Kalender behandelt ihn weiterhin als Pause.)

## Kopieren und Einfügen von Zeiteinträgen

Sie können Zeiteinträge duplizieren, um ähnliche Arbeit schnell zu erfassen:

1. **Wählen** Sie einen Zeiteintrag per Klick aus (er wird mit blauem Rahmen hervorgehoben)
2. Drücken Sie **Strg+C** zum Kopieren — ein Banner bestätigt die Kopie
3. **Klicken Sie auf einen leeren Zeitslot**, um den Eintrag dort einzufügen
4. Der eingefügte Eintrag behält dasselbe Ticket und die Dauer, verwendet aber den neuen Zeitslot

Ziehen Sie über mehrere Slots, um mit einer individuellen Dauer einzufügen.

## Mehrfachauswahl, Verschieben und Löschen

Sie können mehrere Zeiteinträge gleichzeitig auswählen und sie in einem Schritt verschieben oder löschen.

### Mehrere Einträge auswählen

- **Einfacher Klick** wählt einen Eintrag aus (wie bisher).
- **Shift+Klick** fügt einen Eintrag der Mehrfachauswahl hinzu oder entfernt ihn daraus. Ausgewählte Einträge werden blau umrahmt hervorgehoben.
- **Klick auf einen leeren Zeitslot** oder der Wechsel zu einer anderen Woche hebt die gesamte Auswahl auf.

Wenn zwei oder mehr Einträge ausgewählt sind, erscheint eine **Mehrfachauswahl-Leiste** mit der Anzahl der ausgewählten Einträge und den verfügbaren Aktionen.

### Mehrere Einträge verschieben

Klicken Sie in der Leiste auf **+1 Tag** oder **−1 Tag**, um alle ausgewählten Einträge um einen Tag vor oder zurück zu verschieben. Jeder Eintrag behält seine ursprüngliche Uhrzeit und Dauer.

Ein Banner zeigt an, wie viele Einträge erfolgreich verschoben wurden. Fehlgeschlagene Einträge (z.B. bei gesperrtem Abrechnungszeitraum) bleiben ausgewählt, damit Sie es erneut versuchen können.

### Mehrere Einträge löschen

Klicken Sie in der Leiste auf **Löschen**. Ein Bestätigungsdialog zeigt die Anzahl der zu löschenden Einträge. Bestätigen Sie, um sie alle aus Redmine zu entfernen.

> **Hinweis:** Mehrfachauswahl steht nur auf dem Desktop zur Verfügung. Auf Smartphones (Viewport < 768 px) hat Shift+Klick keine Wirkung.

## Arbeitszeitansicht

Schalten Sie die Arbeitszeitansicht mit dem **Uhr-Symbol** in der Kalender-Werkzeugleiste um. Wenn aktiviert, zeigt der Kalender nur Zeitslots innerhalb Ihrer konfigurierten Arbeitszeiten (z.B. 08:00–17:00).

Wenn Zeiteinträge außerhalb des sichtbaren Bereichs vorhanden sind, erscheinen Hinweise oben oder unten im Kalender.

Konfigurieren Sie Ihre Arbeitszeiten in den **Einstellungen** unter „Arbeitszeiten". Lassen Sie beide Felder leer, um diese Ansicht zu deaktivieren.

## Arbeitswoche / Volle Woche

Verwenden Sie den **Mo–Fr**-Umschalter in der Werkzeugleiste, um zwischen folgenden Ansichten zu wechseln:

- **Arbeitswoche**: Zeigt nur Montag bis Freitag
- **Volle Woche**: Zeigt alle sieben Tage inklusive Samstag und Sonntag

Wenn Zeiteinträge an ausgeblendeten Wochenendtagen vorhanden sind, erscheint ein Hinweis an der Seite des Kalenders.

## Planungsansicht

Die Planungsansicht zeigt Ihre Redmine-Zeiteinträge, Outlook-Kalendertermine und Microsoft-Teams-Anrufe & -Besprechungen nebeneinander für einen einzelnen Tag, sodass Sie Zeit direkt aus Ihrem Kalender und Kommunikationsverlauf buchen können.

### Planungsansicht öffnen

- Klicken Sie auf die Schaltfläche **Planungsansicht** in der Kopfzeile (nur Desktop — auf Bildschirmen mit weniger als 768 Pixeln Breite ist die Schaltfläche ausgeblendet).
- Oder **doppelklicken** Sie auf eine Tagesspaltenüberschrift im Wochenkalender, um direkt zu diesem Tag in der Planungsansicht zu springen.

### Tagesnavigation

Verwenden Sie die Schaltflächen **◀** (vorheriger) und **▶** (nächster) in der Kopfzeile der Planungsansicht, um tageweise zu navigieren. Die Schaltfläche **Heute** springt immer zum aktuellen Tag. Wenn der **Mo–Fr**-Umschalter im Hauptkalender aktiv ist, überspringt die Navigation automatisch Wochenenden.

### Buchungsspalte (links)

Zeigt Ihre Redmine-Zeiteinträge für den ausgewählten Tag als Standard-FullCalendar-Zeitraster. Sie können:

- **Klicken und ziehen** Sie einen leeren Slot, um einen neuen Zeiteintrag zu erstellen (das Standardformular öffnet sich).
- **Doppelklicken** Sie auf einen vorhandenen Eintrag, um ihn zu bearbeiten oder zu löschen.
- **Ziehen** Sie einen Eintrag, um ihn in eine andere Zeit zu verschieben.

ArbZG-Konformitätsüberlagerungen (Arbeitszeitwarnungen) erscheinen in der Buchungsspalte genau wie im Hauptkalender.

### Outlook-Spalte (rechts)

Zeigt Ihre Outlook-/Microsoft-365-Kalendertermine für den Tag. Termine erfordern eine in den Einstellungen verbundene Outlook-Verbindung. Jeder Termin wird farblich klassifiziert:

| Farbe | Kategorie      | Bedeutung                                                                                |
| ----- | -------------- | ---------------------------------------------------------------------------------------- |
| Grün  | Buchbar        | Hat ein passendes Redmine-Ticket — ziehen, um sofort einen Eintrag zu erstellen          |
| Amber | Ticket fehlt   | Noch kein Ticket gefunden — ziehen, um das Formular zu öffnen und ein Ticket auszuwählen |
| Grau  | Ausgeschlossen | Pause, Feiertag, Urlaub oder ganztägiger Sonstig-Termin — kann nicht gebucht werden      |

### Drag-to-Book (Ziehen zum Buchen)

Ziehen Sie eine **buchbare** oder **Ticket-fehlt**-Karte aus der Outlook-Spalte in die Buchungsspalte:

- **Buchbar**: Ein Redmine-Zeiteintrag wird sofort erstellt (kein Formular). Karten mit geschlossenen Tickets zeigen ein **⚠**-Symbol im Termintitel — beim Ziehen erscheint ein Bestätigungsdialog, bevor der Eintrag übermittelt wird. Karten, deren Ticket-ID in Redmine nicht gefunden wurde, zeigen ebenfalls ein **⚠**-Symbol (Tooltip: „Ungültiges Ticket") statt einer separaten Ticket-Zeile.
- **Ticket fehlt**: Das Zeiteintrag-Formular öffnet sich vorausgefüllt mit Startzeit, Endzeit und Stunden des Termins. Das Quellereignis wird zur Referenz angezeigt.

Zum **gleichzeitigen Buchen mehrerer Termine**: Shift-Klick auf mehrere Karten (ausgeschlossene Karten können nicht ausgewählt werden), dann eine der ausgewählten Karten ziehen. Nach Abschluss der Stapelverarbeitung zeigt eine Benachrichtigung, wie viele Einträge erstellt wurden und wie viele fehlgeschlagen sind. Outlook und Teams teilen sich einen gemeinsamen Auswahlpool — per Shift-Klick lassen sich Ereignisse aus beiden Spalten zu einer Auswahl zusammenfassen, und das Ziehen einer markierten Karte bucht alle ausgewählten Ereignisse aus beiden Spalten. Das Auswählen einer Buchung in der Buchungsspalte hebt die Outlook/Teams-Auswahl auf, und umgekehrt.

### Zeitlich abgedeckte Karten (Greyout)

Wenn der vollständige Zeitraum eines Outlook-Termins bereits durch eine bestehende Redmine-Buchung abgedeckt ist, wird die Karte mit einer halbtransparenten Überlagerung angezeigt. Die Klassifizierungsfarbe bleibt schwach sichtbar, damit Sie den Ereignistyp noch erkennen können.

### Outlook-Spalte deaktivieren

Öffnen Sie **Einstellungen → Planungsansicht-Quellen** und deaktivieren Sie den Outlook-Umschalter. Die Spalte zeigt dann eine „deaktiviert"-Meldung statt Terminen. Durch erneutes Aktivieren wird sie bei der nächsten Navigation wiederhergestellt.

### Teams-Spalte (ganz rechts)

Zeigt Ihre Microsoft-Teams-Anrufe und Online-Besprechungen für den Tag. Die Teams-Spalte setzt Folgendes voraus:

1. **Microsoft 365 verbunden** — Ihr Administrator muss eine Azure-App-Registrierung konfiguriert haben (`azureClientId` in `config.json`) und Sie müssen über die Outlook-Integration angemeldet sein.
2. **Teams-Spalte aktiviert** — Öffnen Sie **Einstellungen → Planungsansicht-Quellen** und aktivieren Sie den Umschalter **Microsoft Teams** (standardmäßig deaktiviert).

Nach der Aktivierung zeigt die Spalte:

- **Anrufe** — direkte Anrufe und Gruppenanrufe, an denen Sie teilgenommen haben, mit den Namen der anderen Teilnehmer und der tatsächlichen Anrufdauer (vom Zeitpunkt Ihres Beitritts bis zu Ihrem Verlassen, auf 15 Minuten gerundet für die Buchung).
- **Besprechungen** — geplante Teams-Besprechungen, für die tatsächliche Beitritts- und Verlasszeiten aufgezeichnet wurden. Der Besprechungstitel wird angezeigt. Wenn keine Anwesenheitsdaten für eine Besprechung verfügbar sind, wird die Besprechung nicht angezeigt (FR-005: nur tatsächlich besuchte Termine).

Die gleiche farbcodierte Klassifizierung gilt wie in der Outlook-Spalte (grün = buchbar, amber = Ticket fehlt, grau = ausgeschlossen).

**Buchung eines Teams-Ereignisses**: Ziehen Sie eine Karte in die Buchungsspalte. Das Zeiteintrag-Formular öffnet sich vorausgefüllt mit den gerundeten Start- und Endzeiten. Für Anrufe bleibt das Kommentarfeld leer (keine persönlichen Teilnehmerdaten werden in Redmine gespeichert). Für Besprechungen ist der Kommentar mit dem Besprechungstitel vorausgefüllt.

**Erforderliche Microsoft-Berechtigungen**: Die Anruf-Spur (`/communications/callRecords`) erfordert die Anwendungsberechtigung `CallRecords.Read.All`, die von einem Microsoft-365-Administrator erteilt werden muss. Wenn diese Berechtigung nicht erteilt wurde, zeigt der Anrufbereich einen Hinweis „Berechtigungen nicht verfügbar", während Besprechungen weiterhin normal funktionieren. Die Besprechungsspur benötigt nur Ihre persönliche delegierte `Calendars.Read`-Berechtigung (wie Outlook).

**Memoisierungs-Cache**: Redmine-Issue-Abfragen werden zwischen der Outlook- und Teams-Spalte geteilt. Wenn dieselbe Issue-Nummer in beiden Spalten erscheint, wird pro Sitzung nur ein Redmine-API-Aufruf gemacht — das Ergebnis wird im Arbeitsspeicher zwischengespeichert, bis Sie die Seite verlassen.

### Zurück zum Kalender

Klicken Sie auf **Zurück zum Kalender** in der Kopfzeile der Planungsansicht (oder klicken Sie erneut auf die Umschalter-Schaltfläche). Der Hauptkalender wird mit der Woche fortgesetzt, die den zuletzt angezeigten Tag enthält.

## Mobile Nutzung

RedmineCalendar passt sich automatisch an Smartphones und kleine Bildschirme an:

- **Tagesansicht**: Auf Smartphones wechselt der Kalender zur Einzeltagsansicht (statt der Wochengitter-Ansicht), damit jeder Eintrag groß genug zum Lesen ist.
- **Wischnavigation**: Wischen Sie auf dem Kalender nach links oder rechts, um zum nächsten oder vorherigen Tag zu springen.
- **Tippen Sie auf einen leeren Slot**, um das Zeiteintrag-Formular im Vollbild zu öffnen.
- **Zeiteintrag-Formular**: im Vollbild auf Smartphones, mit größeren Eingabefeldern und mindestens 44px-Touch-Zielen für präzises Antippen.
- **KI-Chatpanel**: öffnet auf Smartphones als Vollbild-Overlay (statt als Seitenpanel) für eine bequeme Tipp-Fläche.

Die Outlook-Kalenderbuchung (im KI-Chat-Assistenten) ist primär für die Desktop-Nutzung gedacht; auf Smartphones bevorzugen Sie manuelle Zeiterfassung oder die Chat-basierten Erstellen-/Bearbeiten-/Löschen-Befehle.

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
- **Pausendauer**: Mindestens 30 Minuten Pause nach 6 Stunden Arbeit oder 45 Minuten nach 9 Stunden
- **Ununterbrochene Arbeit**: Keine zusammenhängende Arbeitsphase länger als 6 Stunden
- **Sonn-/Feiertagsarbeit**: Zeiteinträge an Sonntagen oder gesetzlichen Feiertagen

Warnungen erscheinen als farbige Indikatoren in den betroffenen Tageskopfzeilen. Fahren Sie mit der Maus darüber für Details.

**Urlaubs- und Feiertagseinträge sind von diesen Prüfungen ausgenommen.** Zeiteinträge, die auf das vom Administrator konfigurierte Feiertags- oder Urlaubsticket gebucht werden, stellen bezahlte Freizeit dar — keine Arbeitszeit. Sie zählen daher nicht zu den Tages-/Wochensummen, lösen keine Sonn-/Feiertagswarnungen für den jeweiligen Tag aus und lösen keine Pausenpflichten aus. Reguläre Arbeitseinträge am selben Tag werden weiterhin normal geprüft.

## Anomalie-Indikatoren

Der Kalender markiert Zeiteinträge mit möglichen Fehlern durch ein kleines **⚠-Symbol** in der Ecke des Eintrags. Fahren Sie mit der Maus darüber (oder tippen Sie auf dem Mobilgerät), um den Grund zu sehen. Das Symbol verschwindet, sobald Sie den Eintrag korrigieren — ohne Neuladen der Seite.

### Sehr kurzer Eintrag

Ein Eintrag kürzer als 6 Minuten (0,1 h) auf einem Nicht-Break-Ticket wird als möglicher Tippfehler markiert. Öffnen Sie den Eintrag und korrigieren Sie die Dauer.

### Überlappende Einträge

Wenn sich zwei Einträge am selben Tag zeitlich überschneiden, werden beide mit Start und Ende des überlappenden Eintrags markiert. Break-Ticket-Einträge werden von der Überlappungserkennung ausgenommen.

Ein Eintrag kann mehrere Regeln gleichzeitig auslösen; der Tooltip listet alle Gründe auf.

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

### Outlook-Kalender buchen

Wenn Ihr Administrator die Azure-AD-Integration konfiguriert hat, können Sie Ihre Outlook-Termine als Zeiteinträge buchen:

1. Sagen Sie **"Buche meine Zeit für heute"** (oder ein beliebiges Datum)
2. Der Assistent ruft Ihren Outlook-Kalender ab und liefert vier beschriftete Abschnitte — **Ausgeschlossen**, **Automatisch auf Break-Ticket**, **Buchbare Termine**, **Benötigt Nutzer-Input** — jeder Eintrag mit dem **vorgeschlagenen Ticket (Nummer und Titel)**
3. Ticketextraktion gewinnt immer: Termine mit `#1234` im Titel werden auf dieses Ticket gebucht, unabhängig von jeder anderen Klassifizierung (z.B. "Lunch Sync #1234" → #1234, nicht das Break-Ticket)
4. **Automatisch auf Break-Ticket** — nicht-arbeitsbezogene Termine (Mittagessen, Arzttermin, Sport, Kaffee, lunch, doctor, gym usw.) und Überstundenausgleich-Blöcke (Überstundenausgleich, Überstundenabbau, Zeitausgleich, Gleittag, comp time) werden auf das konfigurierte Break-Ticket mit 0 Stunden gebucht; die tatsächliche Outlook-Termindauer bleibt als Kalenderblock sichtbar
5. **Buchbare Termine** — Arbeitsmeetings mit extrahierten Tickets, Ganztagstermine für Feiertage auf dem Feiertagsticket, Urlaub/OOO-Ganztagstermine auf dem Urlaubsticket
6. **Benötigt Nutzer-Input** — Termine ohne Ticket, die das Tool nicht klassifizieren konnte; Krankheitstermine (werden nie automatisch geroutet); andere unklassifizierte Ganztagstermine. Sie wählen das Ticket oder überspringen
7. **Ausgeschlossen** — überlappende Termine (bereits durch einen vorhandenen Eintrag abgedeckt) und rein informative Termine (Geburtstage, Jubiläen, Erinnerungen)

**Ganztagsklassifizierung** unterscheidet:

- **Feiertage** (Bank Holiday, Feiertag, Christi Himmelfahrt, Weihnachten, Karfreitag, …) → Feiertagsticket mit Tagesstunden
- **Urlaub / OOO** (Urlaub, vacation, day off, OOO, abwesend, annual leave) → Urlaubsticket mit Tagesstunden
- **Überstundenausgleich** (Überstundenausgleich, Überstundenabbau, Zeitausgleich, Gleittag, comp time, TOIL) → Break-Ticket mit 0 Stunden
- **Krankheit** (krank, sick, Krankmeldung) → wird nie automatisch geroutet; Sie wählen das richtige Ticket
- Ganztagstermine, die in Outlook als **Abwesend** markiert sind, ohne Schlüsselwort-Treffer → Fallback auf Feiertagsticket
- Geburtstage / Jubiläen / Erinnerungen → ausgeschlossen (werden nie gebucht)

**Einstellungen für Outlook-Buchung** (auf der Einstellungsseite):

- **Wochenstunden**: Ihre vertraglichen Wochenstunden (Tagesstunden für Feiertag-/Urlaubseinträge = Wochenstunden ÷ 5)

Das **Feiertagsticket**, **Urlaubsticket** und **Break-Ticket** werden vom Administrator in der `config.json` konfiguriert — sie gelten installationsweit und sind pro Nutzer nicht editierbar. Wenn ein Ticket nicht gesetzt ist, fallen Termine, die dorthin geroutet würden, in „Benötigt Nutzer-Input".

Die Outlook-Sensitivität (Privat/Vertraulich) hat keinen Einfluss auf die Routenzuordnung — die Klassifizierung erfolgt ausschließlich über den Termin-Betreff. Ein als privat markierter Arbeitstermin wird trotzdem als Arbeit gebucht; ein als öffentlich markierter Pausentermin wird trotzdem als Break gebucht. Zeiten werden auf Viertelstunden gerundet.

Wenn Sie einen break-routed Eintrag bestätigen, öffnet sich das Formular mit dem unter [Break-Ticket-Einträge](#break-ticket-einträge) beschriebenen Verhalten.

### Tipps

- Der Assistent kennt die Dokumentation, Funktionsspezifikationen und den Quellcode der App
- Er lehnt Fragen ab, die nichts mit RedmineCalendar zu tun haben
- Er gibt niemals Ihre API-Schlüssel oder Anmeldedaten preis
- Das Gespräch bleibt erhalten, wenn Sie das Panel schließen und wieder öffnen (wird beim Neuladen der Seite gelöscht)
- Ziehen Sie den linken Rand des Panels, um die Größe anzupassen

## Einstellungen

Öffnen Sie die Einstellungen über das **Zahnrad-Symbol** in der Kopfzeile.

### Serverkonfiguration

Die Redmine-URL, KI-Assistenten-Einstellungen und Proxy-URLs werden von Ihrem Administrator in `config.json` verwaltet. Sie werden nicht mehr auf der Einstellungsseite angezeigt — bei Änderungsbedarf wenden Sie sich an Ihren Administrator.

### Authentifizierung

Wählen Sie zwischen:

- **API-Schlüssel**: Zu finden in Redmine unter _Mein Konto_ und dann _API-Zugriffsschlüssel_. Ein direkter Link zu Ihrer Redmine-Kontoseite wird neben dem Feld angezeigt.
- **Benutzername & Passwort**: Ihre Redmine-Anmeldedaten

Ihre Anmeldedaten werden verschlüsselt in Ihrem Browser gespeichert und niemals an den Webserver gesendet.

### Arbeitszeiten

Legen Sie Ihre tägliche Start- und Endzeit fest. Diese werden vom Arbeitszeitansicht-Umschalter im Kalender verwendet.

### Erscheinungsbild

Wählen Sie zwischen **Hell** (Standard) und **Dunkel**. Die Einstellung wird sofort auf allen Seiten übernommen und bleibt auch nach dem Neuladen erhalten. Die Einstellung wird pro Browser-Profil gespeichert.

### KI-Assistent

Der KI-Chat-Assistent wird zentral vom Administrator konfiguriert. Auf Ihrer Seite ist keine Einrichtung nötig — wenn der Administrator einen KI-Anbieter konfiguriert hat, erscheint die Chat-Schaltfläche (💬) automatisch. Wenn die Schaltfläche nicht sichtbar ist, wurde die KI-Funktion für Ihre Installation nicht aktiviert — wenden Sie sich an Ihren Administrator.

## Tastenkürzel

| Tastenkürzel    | Aktion                                                   |
| --------------- | -------------------------------------------------------- |
| Klick           | Zeiteintrag auswählen                                    |
| Doppelklick     | Zeiteintrag zum Bearbeiten öffnen                        |
| Enter           | Ausgewählten Zeiteintrag zum Bearbeiten öffnen           |
| Strg+C          | Ausgewählten Zeiteintrag kopieren                        |
| Entf            | Ausgewählten Zeiteintrag löschen                         |
| Escape          | Dialog schließen oder Auswahl aufheben                   |
| Strg+Z          | Letzte Zeiteintrag-Änderung rückgängig machen            |
| Strg+Umschalt+Z | Rückgängig gemachte Aktion wiederherstellen              |
| Strg+Y          | Rückgängig gemachte Aktion wiederherstellen (alternativ) |

### Rückgängig & Wiederherstellen

Strg+Z macht den letzten Schreibvorgang rückgängig — Erstellen, Bearbeiten, Ziehen, Größe ändern, Löschen, Mehrfachlöschen oder Einfügen. Strg+Umschalt+Z (oder Strg+Y) stellt die zuletzt rückgängig gemachte Aktion wieder her.

- Der Verlauf umfasst die letzten **20 Schritte** und wird beim Neuladen der Seite zurückgesetzt.
- Rückgängig und Wiederherstellen sind während das Eintrag-Formular oder der KI-Chat geöffnet ist nicht aktiv.
- Eine neue Datenaktion (z. B. Formular absenden) löscht den Wiederherstellen-Verlauf.

## Barrierefreiheit

Die Anwendung erfüllt die Vorgaben von **WCAG 2.2 Stufe AA**:

- Jedes interaktive Element ist per Tastatur erreichbar; der Fokusring ist in beiden Designs (hell und dunkel) deutlich sichtbar (Kontrast ≥3:1).
- Das Zeiteintrag-Formular, das Chatbot-Panel und das Hilfe-Panel signalisieren ihre Dialog-Rolle gegenüber Screenreadern und tragen einen lesbaren Namen.
- Dekorative Symbole werden vor assistiver Technik verborgen; bedeutungstragende Symbole erhalten ein erkennbares Label.
- Dynamische Inhalte (Chatbot-Antworten) werden über Live-Regionen angekündigt.
- Die Sprache der Seite wird automatisch aus der bevorzugten Browsersprache (Deutsch oder Englisch) übernommen.

Treten Probleme mit der Barrierefreiheit auf, eröffnen Sie bitte ein GitHub-Issue mit dem Label `a11y`.

## Feedback geben

In der unteren rechten Ecke jeder Seite erscheint die Schaltfläche **Feedback geben**, sobald Ihr Administrator in der Datei `config.json` eine `feedbackEmail` eingetragen hat. Mit einem Klick senden Sie einen Fehlerbericht oder einen Verbesserungsvorschlag.

### Kategorien

| Kategorie                  | Inhalt der Nachricht                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fehlerbericht**          | Vollständiger Diagnosekontext: Screenshot, URL, Browser/Betriebssystem, Viewport, JS-Fehler, Netzwerkprotokoll, App-Protokoll, Kalenderstatus, localStorage-Momentaufnahme |
| **Verbesserungsvorschlag** | Kompakt: Screenshot, URL, Browser/Betriebssystem und Viewport                                                                                                              |

### Versandwege

- **Office 365 (über MSAL angemeldet)** — Das Feedback wird direkt als formatierte HTML-E-Mail mit angehängtem Screenshot versendet. Der Dialog schließt sich nach dem Versand, und eine Benachrichtigung bestätigt die Zustellung.
- **Mailto-Fallback (nicht angemeldet)** — Ihr Standard-E-Mail-Client öffnet sich mit vorausgefülltem Betreff und Beschreibung. Der Textkörper ist auf 1 800 Zeichen begrenzt, um URL-Kürzungen zu vermeiden.

### Screenshot

Die Anwendung erstellt beim Öffnen des Dialogs automatisch einen Screenshot der aktuellen Seite. Wenn der Browser die Aufnahme blockiert (Datenschutzeinstellungen, Sandbox), zeigt der Screenshot-Bereich „Screenshot nicht verfügbar" — die Übermittlung ist trotzdem möglich.

### Admin-Einrichtung

Tragen Sie `"feedbackEmail": "helpdesk@example.com"` in `config.json` ein. Ohne diesen Eintrag ist die Schaltfläche für alle Benutzer ausgeblendet.

## Open-Source-Lizenzen

Diese Anwendung verwendet mehrere Open-Source-Bibliotheken (FullCalendar, MSAL.js, DOMPurify, marked, das mitgelieferte Spec-Kit-Tooling u. a.). Für die vollständige Quellenangabe:

- **In der Anwendung**: Auf der Einstellungsseite ganz unten den Link „Open-Source-Lizenzen" öffnen. Die Seite listet jede Laufzeit-Bibliothek mit Version, SPDX-Lizenz, Webseite und Copyright-Zeile.
- **Für Tools**: Ein CycloneDX-1.6-SBoM steht unter `/sbom.json` (in der bereitgestellten Anwendung) zur Verfügung und wird zusätzlich als Asset an jedes GitHub Release angehängt.

Das Abhängigkeitsverzeichnis wird automatisch neu generiert; CI-Prüfungen pro Pull Request erkennen Abweichungen und nicht erlaubte Lizenzen gegen eine SPDX-Erlaubnisliste.

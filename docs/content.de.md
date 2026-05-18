# RedmineCalendar Hilfe

**Inhalt**

1. [Erste Schritte](#erste-schritte)
2. [Kalender-Navigation](#kalender-navigation)
3. [Zeiteinträge](#zeiteinträge)
4. [Break-Ticket-Einträge](#break-ticket-einträge)
5. [Kopieren und Einfügen von Zeiteinträgen](#kopieren-und-einfügen-von-zeiteinträgen)
6. [Arbeitszeitansicht](#arbeitszeitansicht)
7. [Arbeitswoche / Volle Woche](#arbeitswoche--volle-woche)
8. [Mobile Nutzung](#mobile-nutzung)
9. [Favoriten-Tickets](#favoriten-tickets)
10. [ArbZG-Konformitätsanzeigen](#arbzg-konformitätsanzeigen)
11. [KI-Chat-Assistent](#ki-chat-assistent)
12. [Einstellungen](#einstellungen)
13. [Tastenkürzel](#tastenkürzel)

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
- Tippen Sie `#1234`, um ein bestimmtes Ticket direkt per ID nachzuschlagen
- Aus zuletzt verwendeten Tickets oder Favoriten auswählen (auch nach Projekt filterbar)
- Datum, Start- und Endzeit festlegen (vorausgefüllt basierend auf Ihrem Klick — alle drei sind Pflichtfelder)
- Einen optionalen Kommentar hinzufügen
- Den Eintrag speichern

Die Ticket-ID und der Titel im Formular sind ein klickbarer Link zum Redmine-Ticket.

**Das Formular schließt sich nicht durch Klicken außerhalb.** Um das Formular ohne Speichern zu schließen, drücken Sie **Escape** oder klicken Sie auf **Abbrechen**. So gehen Ihre Eingaben nicht versehentlich verloren.

Der Eintrag erscheint sofort nach dem Speichern im Kalender. Die Ticketnummer auf jedem Kalendereintrag ist ein klickbarer Link zum Redmine-Ticket (öffnet in neuem Tab). Jeder Eintrag zeigt auch die **Projektkennung und den Namen** (z.B. "web-app — Web App"), um Einträge projektübergreifend unterscheiden zu können.

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

## Arbeitszeitansicht

Schalten Sie die Arbeitszeitansicht mit dem **Uhr-Symbol** in der Kalender-Werkzeugleiste um. Wenn aktiviert, zeigt der Kalender nur Zeitslots innerhalb Ihrer konfigurierten Arbeitszeiten (z.B. 08:00–17:00).

Wenn Zeiteinträge außerhalb des sichtbaren Bereichs vorhanden sind, erscheinen Hinweise oben oder unten im Kalender.

Konfigurieren Sie Ihre Arbeitszeiten in den **Einstellungen** unter „Arbeitszeiten". Lassen Sie beide Felder leer, um diese Ansicht zu deaktivieren.

## Arbeitswoche / Volle Woche

Verwenden Sie den **Mo–Fr**-Umschalter in der Werkzeugleiste, um zwischen folgenden Ansichten zu wechseln:

- **Arbeitswoche**: Zeigt nur Montag bis Freitag
- **Volle Woche**: Zeigt alle sieben Tage inklusive Samstag und Sonntag

Wenn Zeiteinträge an ausgeblendeten Wochenendtagen vorhanden sind, erscheint ein Hinweis an der Seite des Kalenders.

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

### KI-Assistent

Der KI-Chat-Assistent wird zentral vom Administrator konfiguriert. Auf Ihrer Seite ist keine Einrichtung nötig — wenn der Administrator einen KI-Anbieter in `config.json` konfiguriert hat, ist die Chat-Funktion automatisch verfügbar.

## Tastenkürzel

| Tastenkürzel | Aktion                                         |
| ------------ | ---------------------------------------------- |
| Klick        | Zeiteintrag auswählen                          |
| Doppelklick  | Zeiteintrag zum Bearbeiten öffnen              |
| Enter        | Ausgewählten Zeiteintrag zum Bearbeiten öffnen |
| Strg+C       | Ausgewählten Zeiteintrag kopieren              |
| Entf         | Ausgewählten Zeiteintrag löschen               |
| Escape       | Dialog schließen oder Auswahl aufheben         |

## Barrierefreiheit

Die Anwendung erfüllt die Vorgaben von **WCAG 2.2 Stufe AA**:

- Jedes interaktive Element ist per Tastatur erreichbar; der Fokusring ist in beiden Designs (hell und dunkel) deutlich sichtbar (Kontrast ≥3:1).
- Das Zeiteintrag-Formular, das Chatbot-Panel und das Hilfe-Panel signalisieren ihre Dialog-Rolle gegenüber Screenreadern und tragen einen lesbaren Namen.
- Dekorative Symbole werden vor assistiver Technik verborgen; bedeutungstragende Symbole erhalten ein erkennbares Label.
- Dynamische Inhalte (Chatbot-Antworten) werden über Live-Regionen angekündigt.
- Die Sprache der Seite wird automatisch aus der bevorzugten Browsersprache (Deutsch oder Englisch) übernommen.

Treten Probleme mit der Barrierefreiheit auf, eröffnen Sie bitte ein GitHub-Issue mit dem Label `a11y`.

## Open-Source-Lizenzen

Diese Anwendung verwendet mehrere Open-Source-Bibliotheken (FullCalendar, MSAL.js, DOMPurify, marked, das mitgelieferte Spec-Kit-Tooling u. a.). Für die vollständige Quellenangabe:

- **In der Anwendung**: Auf der Einstellungsseite ganz unten den Link „Open-Source-Lizenzen" öffnen. Die Seite listet jede Laufzeit-Bibliothek mit Version, SPDX-Lizenz, Webseite und Copyright-Zeile.
- **Für Tools**: Ein CycloneDX-1.6-SBoM steht unter `/sbom.json` (in der bereitgestellten Anwendung) zur Verfügung und wird zusätzlich als Asset an jedes GitHub Release angehängt.

Das Abhängigkeitsverzeichnis wird automatisch neu generiert; CI-Prüfungen pro Pull Request erkennen Abweichungen und nicht erlaubte Lizenzen gegen eine SPDX-Erlaubnisliste.

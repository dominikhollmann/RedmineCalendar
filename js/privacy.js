// @ts-nocheck — DOM-heavy module; renders the GDPR Art. 13 privacy notice
// page (privacy.html). All user-visible strings go through t() for i18n.

import { t, locale } from './i18n.js';
import {
  getPrivacyControllerName,
  getPrivacyControllerEmail,
  getPrivacyDpoEmail,
  loadCentralConfig,
} from './config-store.js';

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/** Translate all elements with data-i18n attributes. */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}

function renderControllerSection(controllerName, controllerEmail, dpoEmail) {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Verantwortlicher im Sinne der DSGVO Art. 4 Nr. 7:</p>
<p><strong>${controllerName}</strong><br>
E-Mail: <a href="mailto:${controllerEmail}">${controllerEmail}</a></p>
<p>Datenschutzbeauftragter (falls bestellt):<br>
E-Mail: <a href="mailto:${dpoEmail}">${dpoEmail}</a></p>`;
  }
  return `<p>Data controller as per GDPR Art. 4(7):</p>
<p><strong>${controllerName}</strong><br>
Email: <a href="mailto:${controllerEmail}">${controllerEmail}</a></p>
<p>Data Protection Officer (if appointed):<br>
Email: <a href="mailto:${dpoEmail}">${dpoEmail}</a></p>`;
}

function renderDataSection() {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Diese Anwendung verarbeitet folgende personenbezogene Daten:</p>
<ul>
  <li><strong>Redmine-Anmeldedaten</strong> — API-Schlüssel oder Benutzername/Passwort, verschlüsselt im Browser-Speicher gespeichert. Zweck: Authentifizierung beim Redmine-Server.</li>
  <li><strong>Zeitbuchungen</strong> — Datum, Dauer, Ticket-ID und optionaler Kommentar. Werden direkt an Ihren Redmine-Server gesendet; die Anwendung speichert keine Kopie.</li>
  <li><strong>Outlook-Kalendertermine</strong> — werden live von Microsoft Graph abgerufen, wenn Sie die KI-Planungsfunktion verwenden. Die App speichert diese Daten nicht lokal. Erteilen Sie Ihre ausdrückliche Einwilligung, werden die Termine zur Verarbeitung an den KI-Anbieter weitergeleitet. Die Outlook-Quelle kann in den Einstellungen deaktiviert werden.</li>
  <li><strong>Teams-Anruf- und Besprechungsdaten</strong> — die App liest über Microsoft Graph (Berechtigung: CallRecords.Read.All), wer wann mit wem telefoniert oder an Besprechungen teilgenommen hat (Zeitpunkt, Dauer, Teilnehmer). Diese Daten werden nicht lokal gespeichert und nur nach Ihrer ausdrücklichen Einwilligung an den KI-Anbieter weitergeleitet. Die Teams-Quelle kann in den Einstellungen deaktiviert werden.</li>
  <li><strong>Einstellungen und Präferenzen</strong> — Arbeitszeiten, Kalenderansicht, Planungsquellen-Einstellungen. Ausschließlich lokal gespeichert, nicht übermittelt.</li>
  <li><strong>Feedback-Diagnosekontext (optional)</strong> — wenn Sie beim Absenden von Feedback ausdrücklich zustimmen, werden ein Screenshot der aktuellen Seite sowie Diagnoseprotokolle (Fehler, Netzwerkprotokoll mit bereinigten URLs ohne Query-Strings, App-Protokoll, Kalenderstatus, Einstellungs-Momentaufnahme) an das vom Administrator konfigurierte Ticketsystem übermittelt. <strong>Empfänger:</strong> das konfigurierte Redmine-Projekt oder GitHub-Repository sowie alle Personen mit Zugriff darauf. Ohne Ihre Zustimmung wird nur Ihr eingegebener Text übermittelt; Anmeldedaten sind niemals enthalten.</li>
</ul>
<p><strong>Rechtsgrundlage:</strong> DSGVO Art. 6 Abs. 1 lit. b (Vertragserfüllung) für Anmeldedaten, Zeitbuchungen und Einstellungen; DSGVO Art. 6 Abs. 1 lit. a (Einwilligung) für Outlook- und Teams-Daten, die an den KI-Anbieter weitergeleitet werden, sowie für den freiwilligen Feedback-Diagnosekontext, der an das Ticketsystem übermittelt wird.</p>`;
  }
  return `<p>This application processes the following personal data:</p>
<ul>
  <li><strong>Redmine credentials</strong> — API key or username/password, stored encrypted in browser storage. Purpose: authentication with the Redmine server.</li>
  <li><strong>Time entries</strong> — date, duration, ticket ID, and optional comment. Sent directly to your Redmine server; the application stores no copy.</li>
  <li><strong>Outlook calendar events</strong> — retrieved live from Microsoft Graph when you use the AI planning feature. The app does not store these events locally. When you give explicit consent, the events are forwarded to the AI provider for processing. The Outlook source can be disabled in Settings.</li>
  <li><strong>Teams call and meeting data</strong> — the app reads from Microsoft Graph (permission: CallRecords.Read.All) who called or met with whom, and when (timestamp, duration, participants). This data is not stored locally and is forwarded to the AI provider only after your explicit consent. The Teams source can be disabled in Settings.</li>
  <li><strong>Settings and preferences</strong> — working hours, calendar view, planning source settings. Stored locally only, never transmitted.</li>
  <li><strong>Feedback diagnostic context (optional)</strong> — when you give explicit consent while submitting feedback, a screenshot of the current page and diagnostic logs (errors, network log with sanitized URLs stripped of query strings, app log, calendar state, settings snapshot) are transmitted to the ticket system configured by your administrator. <strong>Recipients:</strong> the configured Redmine project or GitHub repository, and everyone with access to it. Without your consent, only your typed description is transmitted; credentials are never included.</li>
</ul>
<p><strong>Legal basis:</strong> GDPR Art. 6(1)(b) (contractual necessity) for credentials, time entries, and settings; GDPR Art. 6(1)(a) (consent) for Outlook and Teams data forwarded to the AI provider, and for the optional feedback diagnostic context transmitted to the ticket system.</p>`;
}

function renderRetentionSection() {
  const isDE = locale === 'de';
  if (isDE) {
    return `<ul>
  <li><strong>KI-Einwilligungsnachweis</strong>: bis zum Widerruf oder bis zur Verwendung der Funktion „Planungsdaten löschen".</li>
  <li><strong>Anmeldedaten</strong>: dauerhaft bis zur manuellen Änderung in den Einstellungen.</li>
  <li><strong>Einstellungen und Präferenzen</strong>: dauerhaft bis zur manuellen Änderung oder Löschung des Browserspeichers.</li>
</ul>`;
  }
  return `<ul>
  <li><strong>AI consent record</strong>: until withdrawn or the "Delete planning data" action is used.</li>
  <li><strong>Credentials</strong>: indefinitely until manually changed in Settings.</li>
  <li><strong>Settings and preferences</strong>: indefinitely until manually changed or browser storage cleared.</li>
</ul>`;
}

function renderRightsSection(controllerEmail) {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Als betroffene Person haben Sie gemäß DSGVO folgende Rechte (Art. 15–22):</p>
<ul>
  <li>Auskunftsrecht (Art. 15) — Einsicht in Ihre gespeicherten Planungsdaten über den Bereich „Meine gespeicherten Planungsdaten" in den Einstellungen.</li>
  <li>Recht auf Löschung (Art. 17) — Planungsdaten über die Funktion „Planungsdaten löschen" in den Einstellungen entfernen.</li>
  <li>Recht auf Einschränkung der Verarbeitung (Art. 18) — KI-Planungseinwilligung in den Einstellungen widerrufen.</li>
  <li>Widerspruchsrecht (Art. 21) — Wenden Sie sich an den Verantwortlichen unter <a href="mailto:${controllerEmail}">${controllerEmail}</a>.</li>
  <li>Beschwerderecht (Art. 77) — Bei Ihrer zuständigen Datenschutzaufsichtsbehörde.</li>
</ul>`;
  }
  return `<p>As a data subject you have the following rights under the GDPR (Art. 15–22):</p>
<ul>
  <li>Right of access (Art. 15) — view your stored planning data in the "My stored planning data" section in Settings.</li>
  <li>Right to erasure (Art. 17) — remove planning data via "Delete planning data" in Settings.</li>
  <li>Right to restriction of processing (Art. 18) — withdraw AI planning consent in Settings.</li>
  <li>Right to object (Art. 21) — contact the controller at <a href="mailto:${controllerEmail}">${controllerEmail}</a>.</li>
  <li>Right to lodge a complaint (Art. 77) — with your competent data protection supervisory authority.</li>
</ul>`;
}

function renderTtdsgSection() {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Gemäß TTDSG § 25 Abs. 2 Nr. 2 ist für Speichertechnologien keine Einwilligung erforderlich, wenn die Speicherung ausschließlich zur Durchführung einer vom Nutzer ausdrücklich gewünschten Diensteistung technisch notwendig ist.</p>
<p>Alle von dieser Anwendung verwendeten localStorage-Schlüssel (Anmeldedaten, Einstellungen, Planungsquellen-Präferenzen, KI-Einwilligungsnachweis) sind technisch notwendig für die Bereitstellung der Funktionen, die der Nutzer ausdrücklich genutzt hat. Ein gesondertes Cookie-Banner oder eine Einwilligung für die Speicherung ist daher nicht erforderlich.</p>
<p>Diese Einschätzung wird überprüft, sobald eine neue, nicht technisch notwendige Speicherform eingeführt wird. Neue Features müssen die DSGVO-Impact-Checkliste (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md) durchlaufen.</p>`;
  }
  return `<p>Under TTDSG § 25(2)(2), no consent is required for storage technologies that are strictly technically necessary to provide a service explicitly requested by the user.</p>
<p>All localStorage keys used by this application (credentials, settings, planning source preferences, AI consent record) are technically strictly necessary for delivering the features the user has explicitly requested. No separate cookie consent banner or storage consent is therefore required.</p>
<p>This determination is reviewed whenever a new non-strictly-necessary storage mechanism is introduced. New features must go through the DSGVO impact checklist (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md).</p>`;
}

function renderBetriebsratSection() {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Die Teams-Planungsspalte liest Anruf- und Besprechungsverläufe aus Microsoft Graph (Berechtigung: CallRecords.Read.All). Diese Daten zeigen, wer wann mit wem telefoniert oder an Besprechungen teilgenommen hat. Je nach betrieblicher Nutzung kann diese Leseberechtigung eine Überwachungsmaßnahme im Sinne des BetrVG § 87 Abs. 1 Nr. 6 darstellen, über die der Betriebsrat mitzubestimmen hat. Ob eine entsprechende Betriebsvereinbarung vorliegt, ist beim Arbeitgeber zu erfragen.</p>`;
  }
  return `<p>The Teams planning column reads call and meeting history from Microsoft Graph (permission: CallRecords.Read.All). This data shows who called or met with whom and when. Depending on how the employer uses this, the read access may constitute a monitoring measure subject to works council (Betriebsrat) co-determination under BetrVG § 87(1)(6). Whether a works agreement covering this exists should be confirmed with your employer.</p>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.title = t('privacy.title');
  applyI18n();

  try {
    await loadCentralConfig();
  } catch {
    // config may not load on privacy page (no credentials required)
  }

  const controllerName = getPrivacyControllerName();
  const controllerEmail = getPrivacyControllerEmail();
  const dpoEmail = getPrivacyDpoEmail();

  setHtml(
    'privacy-controller-content',
    renderControllerSection(controllerName, controllerEmail, dpoEmail)
  );
  setHtml('privacy-data-content', renderDataSection());
  setHtml('privacy-retention-content', renderRetentionSection());
  setHtml('privacy-rights-content', renderRightsSection(controllerEmail));
  setHtml('privacy-ttdsg-content', renderTtdsgSection());
  setHtml('privacy-betriebsrat-content', renderBetriebsratSection());
});

// @ts-nocheck — DOM-heavy module; renders the GDPR Art. 13 privacy notice
// page (privacy.html). All user-visible strings go through t() for i18n.

import { t, locale } from './i18n.js';
import {
  getPrivacyControllerName,
  getPrivacyControllerEmail,
  getPrivacyDpoEmail,
  getPlanningDataRetentionDays,
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

function renderDataSection(retentionDays) {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Diese Anwendung verarbeitet folgende personenbezogene Daten:</p>
<ul>
  <li><strong>Redmine-Anmeldedaten</strong> — API-Schlüssel oder Benutzername/Passwort, verschlüsselt im Browser-Speicher gespeichert. Zweck: Authentifizierung beim Redmine-Server. Rechtsgrundlage: DSGVO Art. 6 Abs. 1 lit. b (Vertragserfüllung).</li>
  <li><strong>Zeitbuchungen</strong> — Datum, Dauer, Ticket-ID und optionaler Kommentar. Werden direkt an Ihren Redmine-Server gesendet; die Anwendung speichert keine Kopie. Rechtsgrundlage: DSGVO Art. 6 Abs. 1 lit. b.</li>
  <li><strong>Outlook-Kalendertermine</strong> — werden bei Verwendung der KI-Planungsfunktion nach Ihrer ausdrücklichen Einwilligung an den KI-Anbieter übermittelt. Aufbewahrungsdauer im lokalen Speicher: ${retentionDays} Tage. Rechtsgrundlage: DSGVO Art. 6 Abs. 1 lit. a (Einwilligung).</li>
  <li><strong>Teams-Anruf- und Besprechungsdaten</strong> — wie Outlook-Daten, nur nach Einwilligung übermittelt. Rechtsgrundlage: DSGVO Art. 6 Abs. 1 lit. a.</li>
  <li><strong>Einstellungen und Präferenzen</strong> — Arbeitszeiten, Kalenderansicht, Planungsquellen-Einstellungen. Ausschließlich lokal gespeichert, nicht übermittelt. Rechtsgrundlage: DSGVO Art. 6 Abs. 1 lit. b.</li>
</ul>`;
  }
  return `<p>This application processes the following personal data:</p>
<ul>
  <li><strong>Redmine credentials</strong> — API key or username/password, stored encrypted in browser storage. Purpose: authentication with the Redmine server. Legal basis: GDPR Art. 6(1)(b) (contractual necessity).</li>
  <li><strong>Time entries</strong> — date, duration, ticket ID, and optional comment. Sent directly to your Redmine server; the application stores no copy. Legal basis: GDPR Art. 6(1)(b).</li>
  <li><strong>Outlook calendar events</strong> — transmitted to the AI provider upon your explicit consent when using the AI planning feature. Local storage retention: ${retentionDays} days. Legal basis: GDPR Art. 6(1)(a) (consent).</li>
  <li><strong>Teams call and meeting data</strong> — same as Outlook data; only transmitted after consent. Legal basis: GDPR Art. 6(1)(a).</li>
  <li><strong>Settings and preferences</strong> — working hours, calendar view, planning source settings. Stored locally only, never transmitted. Legal basis: GDPR Art. 6(1)(b).</li>
</ul>`;
}

function renderRetentionSection(retentionDays) {
  const isDE = locale === 'de';
  if (isDE) {
    return `<ul>
  <li><strong>Planungs-Snapshots</strong>: ${retentionDays} Tage (automatische Bereinigung beim App-Start).</li>
  <li><strong>KI-Einwilligungsnachweis</strong>: bis zum Widerruf oder bis zur Verwendung der Funktion „Planungsdaten löschen".</li>
  <li><strong>Anmeldedaten</strong>: dauerhaft bis zur manuellen Änderung in den Einstellungen.</li>
  <li><strong>Einstellungen und Präferenzen</strong>: dauerhaft bis zur manuellen Änderung oder Löschung des Browserspeichers.</li>
</ul>`;
  }
  return `<ul>
  <li><strong>Planning snapshots</strong>: ${retentionDays} days (automatic cleanup on app start).</li>
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

function renderTtdsgSection(retentionDays) {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>Gemäß TTDSG § 25 Abs. 2 Nr. 2 ist für Speichertechnologien keine Einwilligung erforderlich, wenn die Speicherung ausschließlich zur Durchführung einer vom Nutzer ausdrücklich gewünschten Diensteistung technisch notwendig ist.</p>
<p>Alle von dieser Anwendung verwendeten localStorage-Schlüssel (Anmeldedaten, Einstellungen, Planungsquellen-Präferenzen, KI-Einwilligungsnachweis) sind technisch notwendig für die Bereitstellung der Funktionen, die der Nutzer ausdrücklich genutzt hat. Ein gesondertes Cookie-Banner oder eine Einwilligung für die Speicherung ist daher nicht erforderlich.</p>
<p>Diese Einschätzung wird überprüft, sobald eine neue, nicht technisch notwendige Speicherform eingeführt wird. Neue Features müssen die DSGVO-Impact-Checkliste (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md) durchlaufen.</p>
<p>Speicherdauer für Planungs-Snapshots: ${retentionDays} Tage.</p>`;
  }
  return `<p>Under TTDSG § 25(2)(2), no consent is required for storage technologies that are strictly technically necessary to provide a service explicitly requested by the user.</p>
<p>All localStorage keys used by this application (credentials, settings, planning source preferences, AI consent record) are technically strictly necessary for delivering the features the user has explicitly requested. No separate cookie consent banner or storage consent is therefore required.</p>
<p>This determination is reviewed whenever a new non-strictly-necessary storage mechanism is introduced. New features must go through the DSGVO impact checklist (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md).</p>
<p>Retention period for planning snapshots: ${retentionDays} days.</p>`;
}

function renderBetriebsratSection() {
  const isDE = locale === 'de';
  if (isDE) {
    return `<p>PC-Aktivitätsprotokolle und Microsoft-Teams-Anrufaufzeichnungen sind optionale Funktionen, die nur dann aktiv sind, wenn der Arbeitgeber die entsprechenden Felder in der Anwendungskonfiguration (config.json) aktiviert hat. Sofern vorhanden, hat der Betriebsrat über diese Überwachungsmaßnahmen gemäß BetrVG § 87 Abs. 1 Nr. 6 mitzubestimmen. Die Verfügbarkeit dieser Funktionen gibt keinen Aufschluss darüber, ob eine Betriebsvereinbarung existiert — wenden Sie sich an Ihre zuständige Stelle.</p>`;
  }
  return `<p>PC-activity logging and Microsoft Teams call recording are optional features activated only when the employer enables the corresponding fields in the application configuration (config.json). Where present, the works council (Betriebsrat) has co-determination rights over these monitoring measures under BetrVG § 87(1)(6). The availability of these features does not indicate whether a works agreement exists — contact your responsible body for details.</p>`;
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
  const retentionDays = getPlanningDataRetentionDays();

  setHtml(
    'privacy-controller-content',
    renderControllerSection(controllerName, controllerEmail, dpoEmail)
  );
  setHtml('privacy-data-content', renderDataSection(retentionDays));
  setHtml('privacy-retention-content', renderRetentionSection(retentionDays));
  setHtml('privacy-rights-content', renderRightsSection(controllerEmail));
  setHtml('privacy-ttdsg-content', renderTtdsgSection(retentionDays));
  setHtml('privacy-betriebsrat-content', renderBetriebsratSection());
});

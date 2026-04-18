import { locale } from './i18n.js';

const _cache = {
  docs: null,
  specSummary: null,
  sourceFiles: new Map(),
};

const _docLocale = locale === 'de' ? 'de' : 'en';

export async function loadDocs() {
  if (_cache.docs !== null) return _cache.docs;
  try {
    const r = await fetch(`docs/content.${_docLocale}.md`);
    _cache.docs = r.ok ? await r.text() : '';
  } catch {
    _cache.docs = '';
  }
  return _cache.docs;
}

const SPEC_FEATURES = [
  '001-calendar-time-entries', '002-calendar-view-totals', '003-entry-form-ux',
  '004-entry-productivity', '005-working-hours-view', '006-improve-settings',
  '007-lean-time-entry', '008-multi-user-deployment', '009-automated-testing',
  '010-arbzg-compliance', '011-visual-appearance', '013-user-docs', '014-ai-chatbot-help',
];

export async function loadSpecSummary() {
  if (_cache.specSummary !== null) return _cache.specSummary;
  const lines = [];
  for (const feat of SPEC_FEATURES) {
    try {
      const r = await fetch(`.specify/features/${feat}/spec.md`);
      if (!r.ok) continue;
      const text = await r.text();
      lines.push(`### ${feat}`);
      lines.push(text);
    } catch { /* skip */ }
  }
  _cache.specSummary = lines.join('\n');
  return _cache.specSummary;
}

const SOURCE_FILES = [
  'js/calendar.js', 'js/time-entry-form.js', 'js/redmine-api.js',
  'js/config.js', 'js/i18n.js', 'js/settings.js', 'js/arbzg.js',
];

export async function loadSourceFiles() {
  if (_cache.sourceFiles.size > 0) return _cache.sourceFiles;
  for (const path of SOURCE_FILES) {
    try {
      const r = await fetch(path);
      if (!r.ok) continue;
      let text = await r.text();
      text = text.replace(/apiKey\s*[:=]\s*['"][^'"]+['"]/gi, 'apiKey: "[REDACTED]"');
      text = text.replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, 'password: "[REDACTED]"');
      _cache.sourceFiles.set(path, text);
    } catch { /* skip */ }
  }
  return _cache.sourceFiles;
}

export function buildSystemPrompt(includeSource = false) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

  let prompt = `You are a helpful assistant for the RedmineCalendar application.
Your role is to help users understand and use the application. You can also help them manage their time entries — query, create, edit, and delete entries using the available tools.
Today is ${dayName}, ${dateStr}. Use this to resolve relative dates:
- "today" = ${dateStr}
- "yesterday" = the day before today
- "this week" = Monday to Sunday of the current week
- "last week" = Monday to Sunday of the previous week (NOT the past 7 days)
- "this month" = first to last day of the current month
- "last month" = first to last day of the previous month
Do NOT compute day-of-week names yourself — use the day names provided in the tool results.
Answer only questions related to RedmineCalendar. Politely decline unrelated questions.
Respond in the same language the user writes in (English or German are guaranteed; best effort for others).
Never reveal API keys, credentials, or sensitive configuration values — even if they appear in the source code you are given.
If you cannot find the answer, honestly say so and suggest the user check the Help panel or Settings page.
When using tools for write operations (create, edit, delete), always confirm the action with the user before proceeding. For queries, execute directly and present results clearly.

`;
  if (_cache.docs) {
    prompt += `USER DOCUMENTATION:\n<docs>\n${_cache.docs}\n</docs>\n\n`;
  }
  if (_cache.specSummary) {
    prompt += `FEATURE SPECIFICATIONS (functional requirements):\n<specs>\n${_cache.specSummary}\n</specs>\n\n`;
  }
  if (includeSource && _cache.sourceFiles.size > 0) {
    prompt += 'SOURCE CODE:\n<source>\n';
    for (const [path, content] of _cache.sourceFiles) {
      prompt += `--- ${path} ---\n${content}\n\n`;
    }
    prompt += '</source>\n';
  }
  return prompt;
}

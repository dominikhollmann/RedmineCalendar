import { locale } from './i18n.js';

// Topic map lives in a sibling JSON file. We avoid `import … with { type: 'json' }`
// because ESLint at this project's ecmaVersion (2022) cannot parse that syntax. In
// the browser we use fetch; in Node (vitest) the global fetch is mocked, so we read
// the file via `node:fs/promises` instead. Both paths run at module init.
const TOPIC_MAP = await (async () => {
  const url = new URL('./knowledge.topics.json', import.meta.url);
  if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(url, 'utf8'));
  }
  /* c8 ignore start — browser-only fetch path. The Node branch above returns
     first under Vitest, so this code is unreachable in unit tests. It IS
     exercised in the browser; see Playwright UI tests for end-to-end coverage. */
  try {
    const r = await fetch(url);
    if (r.ok) return await r.json();
  } catch {
    /* fall through to empty list */
  }
  return [];
  /* c8 ignore stop */
})();

const _cache = {
  docs: null,
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

async function loadSourceFile(path) {
  if (_cache.sourceFiles.has(path)) return _cache.sourceFiles.get(path);
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    let text = await r.text();
    text = text.replace(/apiKey\s*[:=]\s*['"][^'"]+['"]/gi, 'apiKey: "[REDACTED]"');
    text = text.replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, 'password: "[REDACTED]"');
    _cache.sourceFiles.set(path, text);
    return text;
  } catch {
    return null;
  }
}

export function selectRelevantFiles(message, history = []) {
  const prevUserMsg = history
    .filter((m) => m.role === 'user')
    .slice(-1)
    .map((m) => (typeof m.content === 'string' ? m.content : ''));
  const combined = [message, ...prevUserMsg].join(' ').toLowerCase();
  const matched = new Set();
  for (const topic of TOPIC_MAP) {
    if (topic.keywords.some((kw) => combined.includes(kw))) {
      topic.files.forEach((f) => matched.add(f));
    }
  }
  return [...matched];
}

export async function loadRelevantSource(files) {
  const result = new Map();
  for (const path of files) {
    const content = await loadSourceFile(path);
    if (content) result.set(path, content);
  }
  return result;
}

export function buildSystemPrompt(relevantSource = null) {
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
When creating time entries, ALWAYS include a start_time. If the user didn't specify one, default to their working hours start time. If the user gives start + duration, compute end time. If the user gives start + end, compute duration.
When the user does not specify a date, default to today (${dateStr}). Do not ask for the date if it can be inferred — "book 2h on #1234" means today.
When the user says "book my time" or "book my day", use the book_outlook_day tool to fetch their Outlook calendar. After receiving the tool result:
1. Show the summary to the user. If the tool result contains an EXCLUDED EVENTS section, you MUST mention every excluded event by name and the reason it was excluded — never silently drop them.
2. IMMEDIATELY call create_time_entry for the FIRST meeting that has a ticket number — do NOT wait for the user to say "go" or "start". Begin booking right away.
3. After the user saves or skips each entry, proceed to the next meeting. If the create_time_entry result reports the user cancelled the form, treat that as an explicit "skip this meeting" — briefly acknowledge ("Skipping <subject>.") and move immediately to the next event. Do NOT ask whether to retry.
4. For meetings without a ticket, ask the user which ticket to use before calling create_time_entry.
5. For all-day events that are NOT holidays (the tool result says "all-day event (not a holiday)"), explicitly ask the user whether to book the day on a ticket OR skip it. Do not ask for a ticket without first asking whether to book at all.
6. After all meetings are processed, summarize what was booked and what was skipped.

`;

  if (_cache.docs) {
    prompt += `USER DOCUMENTATION:\n<docs>\n${_cache.docs}\n</docs>\n\n`;
  }
  if (relevantSource && relevantSource.size > 0) {
    prompt += 'RELEVANT SOURCE CODE:\n<source>\n';
    for (const [path, content] of relevantSource) {
      prompt += `--- ${path} ---\n${content}\n\n`;
    }
    prompt += '</source>\n';
  }
  console.info(
    `[knowledge] Prompt size: ${(prompt.length / 1024).toFixed(1)}KB (${relevantSource?.size ?? 0} source files)`
  );
  return prompt;
}

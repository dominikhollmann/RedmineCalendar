import { locale } from './i18n.js';

const _cache = {
  docs: null,
  sourceFiles: new Map(),
};

const _docLocale = locale === 'de' ? 'de' : 'en';

export async function loadDocs() {
  if (_cache.docs \!== null) return _cache.docs;
  try {
    const r = await fetch(`docs/content.${_docLocale}.md`);
    _cache.docs = r.ok ? await r.text() : '';
  } catch {
    _cache.docs = '';
  }
  return _cache.docs;
}

const SOURCE_FILES = [
  'js/calendar.js', 'js/time-entry-form.js', 'js/redmine-api.js',
  'js/config.js', 'js/i18n.js', 'js/settings.js', 'js/arbzg.js',
  'js/chatbot-tools.js', 'js/crypto.js', 'js/version.js', 'js/docs.js',
];

const TOPIC_MAP = [
  { keywords: ['calendar', 'week', 'day', 'navigate', 'view', 'event', 'display', 'render'], files: ['js/calendar.js'] },
  { keywords: ['copy', 'paste', 'clipboard', 'duplicate', 'ctrl+c'], files: ['js/calendar.js'] },
  { keywords: ['form', 'modal', 'ticket', 'issue', 'search', 'save', 'create', 'edit', 'delete', 'favourite', 'comment', 'lean'], files: ['js/time-entry-form.js'] },
  { keywords: ['api', 'redmine', 'request', 'fetch', 'network', 'error', 'timeout', 'proxy'], files: ['js/redmine-api.js'] },
  { keywords: ['setting', 'config', 'credential', 'encrypt', 'decrypt', 'key', 'password', 'login', 'auth'], files: ['js/settings.js', 'js/crypto.js', 'js/config.js'] },
  { keywords: ['arbzg', 'working time', 'overtime', 'daily limit', 'weekly limit', 'rest period', 'break', 'sunday', 'holiday', 'compliance'], files: ['js/arbzg.js'] },
  { keywords: ['language', 'translation', 'german', 'english', 'locale', 'i18n', 'deutsch'], files: ['js/i18n.js'] },
  { keywords: ['chat', 'ai', 'assistant', 'tool', 'query', 'book', 'chatbot', 'prompt'], files: ['js/chatbot-tools.js'] },
  { keywords: ['version', 'deploy', 'release'], files: ['js/version.js'] },
  { keywords: ['help', 'documentation', 'docs', 'panel'], files: ['js/docs.js'] },
  { keywords: ['working hours', 'work start', 'work end', 'slot', 'toggle'], files: ['js/calendar.js', 'js/settings.js'] },
];

async function loadSourceFile(path) {
  if (_cache.sourceFiles.has(path)) return _cache.sourceFiles.get(path);
  try {
    const r = await fetch(path);
    if (\!r.ok) return null;
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
  const combined = [message, ...history.slice(-4).map(m => m.content || '')].join(' ').toLowerCase();
  const matched = new Set();
  for (const topic of TOPIC_MAP) {
    if (topic.keywords.some(kw => combined.includes(kw))) {
      topic.files.forEach(f => matched.add(f));
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
  console.log(`[knowledge] Prompt size: ${(prompt.length / 1024).toFixed(1)}KB (${relevantSource?.size ?? 0} source files)`);
  return prompt;
}

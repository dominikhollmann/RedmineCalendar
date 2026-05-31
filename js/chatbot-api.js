import { t } from './i18n.js';
import { getToolSchemas } from './chatbot-tools.js';

/** @typedef {import('./types').AiConfig} AiConfig */
/** @typedef {import('./types').ToolCall} ToolCall */

function detectProvider(model) {
  if (model.startsWith('claude')) return 'claude';
  return 'openai';
}

function httpsOrigin(url) {
  try {
    return `https://${new URL(url).host}/`;
  } catch {
    return url;
  }
}

const _AI_RETRY_STATUSES = new Set([429, 503]);
const _AI_RETRY_COUNT = 2;
const _AI_RETRY_BASE_MS = 1000;

async function fetchAiWithRetry(url, init, onNetworkError) {
  for (let attempt = 0; attempt <= _AI_RETRY_COUNT; attempt++) {
    /** @type {Response} */
    let response;
    try {
      response = await fetch(url, init);
    } catch {
      if (attempt === _AI_RETRY_COUNT) throw onNetworkError();
      await new Promise((r) => setTimeout(r, _AI_RETRY_BASE_MS * Math.pow(2, attempt)));
      continue;
    }
    if (!_AI_RETRY_STATUSES.has(response.status) || attempt === _AI_RETRY_COUNT) return response;
    const retryAfterSec = Number(response.headers.get('Retry-After'));
    const delay =
      retryAfterSec > 0 ? retryAfterSec * 1000 : _AI_RETRY_BASE_MS * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }
  // unreachable: last iteration always returns or throws
  throw onNetworkError();
}

function proxyError(aiProxyUrl) {
  const proxyUrl = httpsOrigin(aiProxyUrl);
  const err = /** @type {Error & {proxyUrl?: string}} */ (new Error(t('chatbot.error_proxy')));
  err.proxyUrl = proxyUrl;
  return err;
}

function mapClaudeMessage(m) {
  if (m.role === 'tool_result') {
    return {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: m.tool_use_id, content: m.content }],
    };
  }
  if (m.role === 'assistant' && Array.isArray(m.content)) {
    return { role: 'assistant', content: m.content };
  }
  return { role: m.role, content: m.content };
}

async function claudeErrorFromResponse(response) {
  if (response.status === 401) return new Error(t('chatbot.error_invalid_key'));
  if (response.status === 429) return new Error(t('chatbot.error_rate_limit'));
  const errData = await response.json().catch(() => null);
  const errMsg = errData?.error?.message;
  return new Error(
    errMsg ? t('chatbot.error_with_detail', { message: errMsg }) : t('chatbot.error_generic')
  );
}

function parseClaudeResponse(data) {
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
  const toolUse = data.content?.find((b) => b.type === 'tool_use');
  if (toolUse) {
    return {
      type: 'tool_use',
      name: toolUse.name,
      input: toolUse.input,
      id: toolUse.id,
      text: text || null,
    };
  }
  return { type: 'text', content: text };
}

async function sendClaude(messages, systemPrompt, config) {
  const { aiProxyUrl, aiModel } = config;
  const body = {
    model: aiModel,
    max_tokens: 1024,
    system: systemPrompt,
    tools: getToolSchemas('claude'),
    messages: messages.map(mapClaudeMessage),
  };

  // The `x-api-key` header is intentionally NOT sent from the browser — the AI
  // proxy injects the company API key server-side (issue #114). The browser
  // never sees the key.
  const response = await fetchAiWithRetry(
    `${aiProxyUrl}/v1/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    },
    () => proxyError(aiProxyUrl)
  );

  if (!response.ok) throw await claudeErrorFromResponse(response);
  return parseClaudeResponse(await response.json());
}

async function sendOpenAI(messages, systemPrompt, config) {
  const { aiProxyUrl, aiModel } = config;
  const tools = getToolSchemas('openai');
  const body = {
    model: aiModel,
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => {
        if (m.role === 'tool_result') {
          return { role: 'tool', tool_call_id: m.tool_use_id, content: m.content };
        }
        return { role: m.role, content: m.content };
      }),
    ],
  };

  // The `Authorization` header is intentionally NOT sent from the browser —
  // the AI proxy injects the company API key server-side (issue #114).
  const response = await fetchAiWithRetry(
    `${aiProxyUrl}/v1/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    () => proxyError(aiProxyUrl)
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error(t('chatbot.error_invalid_key'));
    if (response.status === 429) throw new Error(t('chatbot.error_rate_limit'));
    throw new Error(t('chatbot.error_generic'));
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (choice?.message?.tool_calls?.length) {
    const tc = choice.message.tool_calls[0];
    return {
      type: 'tool_use',
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
      id: tc.id,
      text: choice.message.content || null,
    };
  }

  return { type: 'text', content: choice?.message?.content ?? '' };
}

function sanitizeMessages(messages) {
  const clean = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'assistant' && Array.isArray(m.content) && m.content[0]?.type === 'tool_use') {
      const next = messages[i + 1];
      if (!next || next.role !== 'tool_result') continue;
    }
    clean.push(m);
  }
  return clean;
}

/**
 * Dispatch to the Claude or OpenAI sender depending on `config.aiModel`.
 * Strips orphan tool_use messages (no following tool_result) so retries don't
 * leak invalid request shapes to the AI provider.
 * @param {Array<{role:string, content:any, tool_use_id?:string}>} messages
 * @param {string} systemPrompt
 * @param {AiConfig} config
 * @returns {Promise<{type:'text', content:string} | ToolCall>}
 * @throws {Error} when the AI proxy is not configured or the provider returns an error.
 */
export async function sendMessage(messages, systemPrompt, config) {
  if (!config.aiProxyUrl) throw new Error(t('chatbot.error_no_key'));
  const sanitized = sanitizeMessages(messages);
  const provider = detectProvider(config.aiModel);
  if (provider === 'claude') {
    return /** @type {Promise<{type:'text',content:string} | ToolCall>} */ (
      sendClaude(sanitized, systemPrompt, config)
    );
  }
  return /** @type {Promise<{type:'text',content:string} | ToolCall>} */ (
    sendOpenAI(sanitized, systemPrompt, config)
  );
}

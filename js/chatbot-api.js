import { t } from './i18n.js';
import { getToolSchemas } from './chatbot-tools.js';

function detectProvider(model) {
  if (model.startsWith('claude')) return 'claude';
  return 'openai';
}

async function sendClaude(messages, systemPrompt, config) {
  const { aiApiKey, aiProxyUrl, aiModel } = config;
  const tools = getToolSchemas('claude');
  const body = {
    model: aiModel,
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: messages.map(m => {
      if (m.role === 'tool_result') {
        return { role: 'user', content: [{ type: 'tool_result', tool_use_id: m.tool_use_id, content: m.content }] };
      }
      if (m.role === 'assistant' && Array.isArray(m.content)) {
        return { role: 'assistant', content: m.content };
      }
      return { role: m.role, content: m.content };
    }),
  };

  let response;
  try {
    response = await fetch(`${aiProxyUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(t('chatbot.error_proxy', { proxyUrl: aiProxyUrl }));
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error(t('chatbot.error_invalid_key'));
    if (response.status === 429) throw new Error(t('chatbot.error_rate_limit'));
    const errData = await response.json().catch(() => null);
    const errMsg = errData?.error?.message;
    throw new Error(errMsg ? `AI error: ${errMsg}` : t('chatbot.error_generic'));
  }

  const data = await response.json();

  const toolUse = data.content?.find(b => b.type === 'tool_use');
  if (toolUse) {
    const text = data.content?.find(b => b.type === 'text')?.text ?? '';
    return { type: 'tool_use', name: toolUse.name, input: toolUse.input, id: toolUse.id, text: text || null };
  }

  const text = data.content?.find(b => b.type === 'text')?.text ?? '';
  return { type: 'text', content: text };
}

async function sendOpenAI(messages, systemPrompt, config) {
  const { aiApiKey, aiProxyUrl, aiModel } = config;
  const tools = getToolSchemas('openai');
  const body = {
    model: aiModel,
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => {
        if (m.role === 'tool_result') {
          return { role: 'tool', tool_call_id: m.tool_use_id, content: m.content };
        }
        return { role: m.role, content: m.content };
      }),
    ],
  };

  let response;
  try {
    response = await fetch(`${aiProxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(t('chatbot.error_proxy', { proxyUrl: aiProxyUrl }));
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error(t('chatbot.error_invalid_key'));
    if (response.status === 429) throw new Error(t('chatbot.error_rate_limit'));
    throw new Error(t('chatbot.error_generic'));
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (choice?.message?.tool_calls?.length) {
    const tc = choice.message.tool_calls[0];
    return { type: 'tool_use', name: tc.function.name, input: JSON.parse(tc.function.arguments), id: tc.id, text: choice.message.content || null };
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

export async function sendMessage(messages, systemPrompt, config) {
  if (!config.aiApiKey) throw new Error(t('chatbot.error_no_key'));
  const sanitized = sanitizeMessages(messages);
  const provider = detectProvider(config.aiModel);
  if (provider === 'claude') return sendClaude(sanitized, systemPrompt, config);
  return sendOpenAI(sanitized, systemPrompt, config);
}

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
    throw new Error(t('chatbot.error_proxy'));
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
    return { type: 'tool_use', name: toolUse.name, input: toolUse.input, id: toolUse.id };
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
    throw new Error(t('chatbot.error_proxy'));
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
    return { type: 'tool_use', name: tc.function.name, input: JSON.parse(tc.function.arguments), id: tc.id };
  }

  return { type: 'text', content: choice?.message?.content ?? '' };
}

export async function sendMessage(messages, systemPrompt, config) {
  if (!config.aiApiKey) throw new Error(t('chatbot.error_no_key'));
  const provider = detectProvider(config.aiModel);
  if (provider === 'claude') return sendClaude(messages, systemPrompt, config);
  return sendOpenAI(messages, systemPrompt, config);
}

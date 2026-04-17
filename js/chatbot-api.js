import { t } from './i18n.js';

function detectProvider(model) {
  if (model.startsWith('claude')) return 'claude';
  return 'openai';
}

async function sendClaude(messages, systemPrompt, config) {
  const { aiApiKey, aiProxyPort, aiModel } = config;
  const body = {
    model: aiModel,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  };

  let response;
  try {
    response = await fetch(`http://localhost:${aiProxyPort}/proxy/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiApiKey,
        'anthropic-version': '2023-06-01',
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
  return data.content?.[0]?.text ?? '';
}

async function sendOpenAI(messages, systemPrompt, config) {
  const { aiApiKey, aiProxyPort, aiModel } = config;
  const body = {
    model: aiModel,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  };

  let response;
  try {
    response = await fetch(`http://localhost:${aiProxyPort}/proxy/v1/chat/completions`, {
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
  return data.choices?.[0]?.message?.content ?? '';
}

export async function sendMessage(messages, systemPrompt, config) {
  if (!config.aiApiKey) throw new Error(t('chatbot.error_no_key'));
  const provider = detectProvider(config.aiModel);
  if (provider === 'claude') return sendClaude(messages, systemPrompt, config);
  return sendOpenAI(messages, systemPrompt, config);
}

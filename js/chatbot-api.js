import { t } from './i18n.js';

export async function sendMessage(messages, systemPrompt, config) {
  const { aiApiKey, aiProxyPort, aiModel } = config;

  if (!aiApiKey) throw new Error(t('chatbot.error_no_key'));

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

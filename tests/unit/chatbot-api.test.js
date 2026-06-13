import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key, vars = {}) => {
    if (key === 'chatbot.error_with_detail') return `AI error: ${vars.message}`;
    return key;
  }),
  locale: 'en',
}));
vi.mock('../../js/chatbot-tool-schemas.js', () => ({
  TOOL_SCHEMAS_CLAUDE: [],
  OUTLOOK_TOOL_SCHEMA: {},
  toOpenAITools: vi.fn(() => []),
}));
vi.mock('../../js/outlook.js', () => ({ isOutlookConfigured: vi.fn(() => false) }));

import { sendMessage } from '../../js/chatbot-api.js';

// --- Helpers ---

function makeConfig(overrides = {}) {
  return {
    aiProxyUrl: 'http://localhost:8080',
    aiModel: 'claude-3-sonnet',
    ...overrides,
  };
}

function mockFetchResponse(body, { ok = true, status = 200 } = {}) {
  global.fetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

function mockFetchErrorResponse(status, body = null, times = 1) {
  const response = {
    ok: false,
    status,
    headers: { get: () => null },
    json: body
      ? async () => body
      : async () => {
          throw new Error('no json');
        },
  };
  for (let i = 0; i < times; i++) global.fetch.mockResolvedValueOnce(response);
}

beforeEach(() => {
  global.fetch = vi.fn();
});

// --- Tests ---

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when aiProxyUrl is empty', async () => {
    await expect(sendMessage([], 'system', makeConfig({ aiProxyUrl: '' }))).rejects.toThrow(
      'chatbot.error_no_key'
    );
  });

  it('does not send an auth header from the browser (key injected by proxy)', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });
    await sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig());
    const { headers } = global.fetch.mock.calls[0][1];
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['Authorization']).toBeUndefined();
  });

  it('does not send an Authorization header for OpenAI either', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'ok' } }] });
    await sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig({ aiModel: 'gpt-4' }));
    const { headers } = global.fetch.mock.calls[0][1];
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();
  });

  it('routes to Claude when model starts with claude', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'hello' }] });

    await sendMessage(
      [{ role: 'user', content: 'hi' }],
      'sys',
      makeConfig({ aiModel: 'claude-3-sonnet' })
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/v1/messages');
  });

  it('routes to OpenAI for other models', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'hello' } }] });

    await sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig({ aiModel: 'gpt-4' }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/v1/chat/completions');
  });
});

describe('Claude provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses text response correctly', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'The answer is 42' }] });

    const result = await sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig());

    expect(result).toEqual({ type: 'text', content: 'The answer is 42' });
  });

  it('parses tool_use response correctly', async () => {
    mockFetchResponse({
      content: [
        {
          type: 'tool_use',
          name: 'query_time_entries',
          input: { from: '2026-04-20', to: '2026-04-20' },
          id: 'tool_abc',
        },
      ],
    });

    const result = await sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig());

    expect(result).toEqual({
      type: 'tool_use',
      name: 'query_time_entries',
      input: { from: '2026-04-20', to: '2026-04-20' },
      id: 'tool_abc',
      text: null,
    });
  });

  it('throws error_invalid_key on 401', async () => {
    mockFetchErrorResponse(401);

    await expect(
      sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig())
    ).rejects.toThrow('chatbot.error_invalid_key');
  });

  it('throws error_rate_limit on 429 after exhausting retries', async () => {
    vi.useFakeTimers();
    mockFetchErrorResponse(429, null, 3);
    const p = sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig());
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(10000);
    await expect(p).rejects.toThrow('chatbot.error_rate_limit');
    vi.useRealTimers();
  });

  it('throws AI error with message body on other errors', async () => {
    mockFetchErrorResponse(500, { error: { message: 'Internal failure' } });

    await expect(
      sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig())
    ).rejects.toThrow('AI error: Internal failure');
  });

  it('throws error_generic when error body has no message', async () => {
    mockFetchErrorResponse(500);

    await expect(
      sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig())
    ).rejects.toThrow('chatbot.error_generic');
  });

  it('throws error_proxy on network error after exhausting retries', async () => {
    vi.useFakeTimers();
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const p = sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig());
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(10000);
    await expect(p).rejects.toThrow('chatbot.error_proxy');
    vi.useRealTimers();
  });

  it('transforms tool_result messages to user role with content array', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });

    const messages = [
      { role: 'user', content: 'do something' },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'query_time_entries', input: {} }],
      },
      { role: 'tool_result', tool_use_id: 'tu_1', content: '{"result":"data"}' },
    ];

    await sendMessage(messages, 'sys', makeConfig());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const toolResultMsg = body.messages.find(
      (m) => m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result'
    );

    expect(toolResultMsg).toBeDefined();
    expect(toolResultMsg.content[0].tool_use_id).toBe('tu_1');
    expect(toolResultMsg.content[0].content).toBe('{"result":"data"}');
  });
});

describe('OpenAI provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openaiConfig = makeConfig({ aiModel: 'gpt-4' });

  it('parses text response correctly', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'OpenAI says hi' } }] });

    const result = await sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig);

    expect(result).toEqual({ type: 'text', content: 'OpenAI says hi' });
  });

  it('parses tool_calls response correctly', async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call_123',
                function: { name: 'create_time_entry', arguments: '{"issue_id":42,"hours":1}' },
              },
            ],
          },
        },
      ],
    });

    const result = await sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig);

    expect(result).toEqual({
      type: 'tool_use',
      name: 'create_time_entry',
      input: { issue_id: 42, hours: 1 },
      id: 'call_123',
      text: null,
    });
  });

  it('throws error_invalid_key on 401', async () => {
    mockFetchErrorResponse(401);

    await expect(
      sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig)
    ).rejects.toThrow('chatbot.error_invalid_key');
  });

  it('throws error_rate_limit on 429 after exhausting retries', async () => {
    vi.useFakeTimers();
    mockFetchErrorResponse(429, null, 3);
    const p = sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig);
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(10000);
    await expect(p).rejects.toThrow('chatbot.error_rate_limit');
    vi.useRealTimers();
  });

  it('throws error_generic on other errors', async () => {
    mockFetchErrorResponse(500);

    await expect(
      sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig)
    ).rejects.toThrow('chatbot.error_generic');
  });

  it('throws error_proxy on network error after exhausting retries', async () => {
    vi.useFakeTimers();
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const p = sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig);
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(10000);
    await expect(p).rejects.toThrow('chatbot.error_proxy');
    vi.useRealTimers();
  });

  it('maps tool_result to role tool with tool_call_id', async () => {
    mockFetchResponse({ choices: [{ message: { content: 'done' } }] });

    const messages = [
      { role: 'user', content: 'do something' },
      { role: 'tool_result', tool_use_id: 'call_456', content: '{"result":"ok"}' },
    ];

    await sendMessage(messages, 'sys', openaiConfig);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // First message is system prompt, then user, then tool
    const toolMsg = body.messages.find((m) => m.role === 'tool');

    expect(toolMsg).toBeDefined();
    expect(toolMsg.tool_call_id).toBe('call_456');
    expect(toolMsg.content).toBe('{"result":"ok"}');
  });
});

describe('sanitizeMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes orphaned tool_use without matching tool_result', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });

    const messages = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_1', name: 'query', input: {} }] },
      // No tool_result follows — orphaned
      { role: 'user', content: 'try again' },
    ];

    await sendMessage(messages, 'sys', makeConfig());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // The orphaned assistant tool_use message should be removed
    const assistantToolUse = body.messages.find(
      (m) => m.role === 'assistant' && Array.isArray(m.content) && m.content[0]?.type === 'tool_use'
    );
    expect(assistantToolUse).toBeUndefined();
  });

  it('keeps tool_use when followed by tool_result', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });

    const messages = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_1', name: 'query', input: {} }] },
      { role: 'tool_result', tool_use_id: 'tu_1', content: 'data' },
    ];

    await sendMessage(messages, 'sys', makeConfig());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const assistantToolUse = body.messages.find(
      (m) => m.role === 'assistant' && Array.isArray(m.content) && m.content[0]?.type === 'tool_use'
    );
    expect(assistantToolUse).toBeDefined();
  });

  it('passes through normal messages unchanged', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });

    const messages = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'world' },
      { role: 'user', content: 'again' },
    ];

    await sendMessage(messages, 'sys', makeConfig());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // Claude: messages are mapped directly (no system in messages array)
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0]).toEqual({ role: 'user', content: 'hello' });
    expect(body.messages[1]).toEqual({ role: 'assistant', content: 'world' });
    expect(body.messages[2]).toEqual({ role: 'user', content: 'again' });
  });
});

describe('retry behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries Claude on 429 and succeeds on third attempt', async () => {
    mockFetchErrorResponse(429, null, 2);
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });

    const p = sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig());
    await vi.advanceTimersByTimeAsync(10000);
    const result = await p;

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ type: 'text', content: 'ok' });
  });

  it('retries Claude on 503 and succeeds on second attempt', async () => {
    mockFetchErrorResponse(503, null, 1);
    mockFetchResponse({ content: [{ type: 'text', text: 'recovered' }] });

    const p = sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig());
    await vi.advanceTimersByTimeAsync(10000);
    const result = await p;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ type: 'text', content: 'recovered' });
  });

  it('respects Retry-After header from AI provider', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: (h) => (h === 'Retry-After' ? '3' : null) },
        json: async () => {
          throw new Error();
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ content: [{ type: 'text', text: 'done' }] }),
      });

    const p = sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig());
    await vi.advanceTimersByTimeAsync(10000);
    const result = await p;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ type: 'text', content: 'done' });
  });

  it('retries OpenAI on 429 and succeeds', async () => {
    mockFetchErrorResponse(429, null, 2);
    mockFetchResponse({ choices: [{ message: { content: 'hello' } }] });

    const p = sendMessage(
      [{ role: 'user', content: 'hi' }],
      'sys',
      makeConfig({ aiModel: 'gpt-4' })
    );
    await vi.advanceTimersByTimeAsync(10000);
    const result = await p;

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ type: 'text', content: 'hello' });
  });

  it('does not retry Claude on 401', async () => {
    mockFetchErrorResponse(401, null, 1);

    const p = sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig());
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(10000);
    await expect(p).rejects.toThrow('chatbot.error_invalid_key');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

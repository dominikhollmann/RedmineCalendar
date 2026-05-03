import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/i18n.js', () => ({ t: vi.fn((key) => key), locale: 'en' }));
vi.mock('../../js/chatbot-tools.js', () => ({ getToolSchemas: vi.fn(() => []) }));

import { sendMessage } from '../../js/chatbot-api.js';

// --- Helpers ---

function makeConfig(overrides = {}) {
  return {
    aiApiKey: 'test-key',
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

function mockFetchErrorResponse(status, body = null) {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: body ? async () => body : async () => { throw new Error('no json'); },
  });
}

beforeEach(() => {
  global.fetch = vi.fn();
});

// --- Tests ---

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when aiApiKey is empty', async () => {
    await expect(sendMessage([], 'system', makeConfig({ aiApiKey: '' })))
      .rejects.toThrow('chatbot.error_no_key');
  });

  it('routes to Claude when model starts with claude', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'hello' }] });

    await sendMessage([{ role: 'user', content: 'hi' }], 'sys', makeConfig({ aiModel: 'claude-3-sonnet' }));

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
        { type: 'tool_use', name: 'query_time_entries', input: { from: '2026-04-20', to: '2026-04-20' }, id: 'tool_abc' },
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

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig()))
      .rejects.toThrow('chatbot.error_invalid_key');
  });

  it('throws error_rate_limit on 429', async () => {
    mockFetchErrorResponse(429);

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig()))
      .rejects.toThrow('chatbot.error_rate_limit');
  });

  it('throws AI error with message body on other errors', async () => {
    mockFetchErrorResponse(500, { error: { message: 'Internal failure' } });

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig()))
      .rejects.toThrow('AI error: Internal failure');
  });

  it('throws error_generic when error body has no message', async () => {
    mockFetchErrorResponse(500);

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig()))
      .rejects.toThrow('chatbot.error_generic');
  });

  it('throws error_proxy on network error', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', makeConfig()))
      .rejects.toThrow('chatbot.error_proxy');
  });

  it('transforms tool_result messages to user role with content array', async () => {
    mockFetchResponse({ content: [{ type: 'text', text: 'ok' }] });

    const messages = [
      { role: 'user', content: 'do something' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_1', name: 'query_time_entries', input: {} }] },
      { role: 'tool_result', tool_use_id: 'tu_1', content: '{"result":"data"}' },
    ];

    await sendMessage(messages, 'sys', makeConfig());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const toolResultMsg = body.messages.find(m => m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result');

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
      choices: [{
        message: {
          tool_calls: [{
            id: 'call_123',
            function: { name: 'create_time_entry', arguments: '{"issue_id":42,"hours":1}' },
          }],
        },
      }],
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

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig))
      .rejects.toThrow('chatbot.error_invalid_key');
  });

  it('throws error_rate_limit on 429', async () => {
    mockFetchErrorResponse(429);

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig))
      .rejects.toThrow('chatbot.error_rate_limit');
  });

  it('throws error_generic on other errors', async () => {
    mockFetchErrorResponse(500);

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig))
      .rejects.toThrow('chatbot.error_generic');
  });

  it('throws error_proxy on network error', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(sendMessage([{ role: 'user', content: 'q' }], 'sys', openaiConfig))
      .rejects.toThrow('chatbot.error_proxy');
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
    const toolMsg = body.messages.find(m => m.role === 'tool');

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
      m => m.role === 'assistant' && Array.isArray(m.content) && m.content[0]?.type === 'tool_use'
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
      m => m.role === 'assistant' && Array.isArray(m.content) && m.content[0]?.type === 'tool_use'
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

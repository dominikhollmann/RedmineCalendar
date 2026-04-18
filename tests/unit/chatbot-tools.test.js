import { describe, it, expect } from 'vitest';
import { getToolSchemas } from '../../js/chatbot-tools.js';

describe('chatbot-tools', () => {
  it('returns Claude tool schemas with correct names', () => {
    const tools = getToolSchemas('claude');
    expect(tools).toHaveLength(4);
    const names = tools.map(t => t.name);
    expect(names).toContain('query_time_entries');
    expect(names).toContain('create_time_entry');
    expect(names).toContain('edit_time_entry');
    expect(names).toContain('delete_time_entry');
  });

  it('returns OpenAI tool schemas with function wrapper', () => {
    const tools = getToolSchemas('openai');
    expect(tools).toHaveLength(4);
    expect(tools[0].type).toBe('function');
    expect(tools[0].function.name).toBe('query_time_entries');
  });

  it('Claude schemas have required input_schema fields', () => {
    const tools = getToolSchemas('claude');
    const query = tools.find(t => t.name === 'query_time_entries');
    expect(query.input_schema.required).toContain('from');
    expect(query.input_schema.required).toContain('to');
  });
});

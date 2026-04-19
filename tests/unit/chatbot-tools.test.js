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

  it('create_time_entry requires start_time', () => {
    const tools = getToolSchemas('claude');
    const create = tools.find(t => t.name === 'create_time_entry');
    expect(create.input_schema.required).toContain('start_time');
  });

  it('edit_time_entry accepts date + issue_id as alternative to entry_id', () => {
    const tools = getToolSchemas('claude');
    const edit = tools.find(t => t.name === 'edit_time_entry');
    expect(edit.input_schema.properties).toHaveProperty('entry_id');
    expect(edit.input_schema.properties).toHaveProperty('date');
    expect(edit.input_schema.properties).toHaveProperty('issue_id');
  });

  it('delete_time_entry accepts date + issue_id as alternative to entry_id', () => {
    const tools = getToolSchemas('claude');
    const del = tools.find(t => t.name === 'delete_time_entry');
    expect(del.input_schema.properties).toHaveProperty('entry_id');
    expect(del.input_schema.properties).toHaveProperty('date');
    expect(del.input_schema.properties).toHaveProperty('issue_id');
  });

  it('OpenAI schemas mirror Claude schemas', () => {
    const claude = getToolSchemas('claude');
    const openai = getToolSchemas('openai');
    expect(openai).toHaveLength(claude.length);
    openai.forEach((tool, i) => {
      expect(tool.function.name).toBe(claude[i].name);
      expect(tool.function.parameters).toEqual(claude[i].input_schema);
    });
  });
});

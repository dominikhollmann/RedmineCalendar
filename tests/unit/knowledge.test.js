import { describe, it, expect } from 'vitest';
import { selectRelevantFiles } from '../../js/knowledge.js';

describe('selectRelevantFiles', () => {
  it('returns calendar.js for copy/paste question', () => {
    const files = selectRelevantFiles('How do I copy a time entry?');
    expect(files).toContain('js/calendar.js');
  });

  it('returns arbzg.js for ArbZG question', () => {
    const files = selectRelevantFiles('What is the daily limit for working time?');
    expect(files).toContain('js/arbzg.js');
  });

  it('returns settings.js for credential question', () => {
    const files = selectRelevantFiles('How do I change my API key?');
    expect(files).toContain('js/settings.js');
  });

  it('returns time-entry-form.js for form question', () => {
    const files = selectRelevantFiles('How do I create a new entry?');
    expect(files).toContain('js/time-entry-form.js');
  });

  it('returns empty for unrelated question with no keywords', () => {
    const files = selectRelevantFiles('What is the weather today?');
    expect(files).toHaveLength(0);
  });

  it('considers conversation history', () => {
    const history = [
      { role: 'user', content: 'Tell me about ArbZG' },
      { role: 'assistant', content: 'ArbZG is...' },
    ];
    const files = selectRelevantFiles('What are the limits?', history);
    expect(files).toContain('js/arbzg.js');
  });

  it('returns chatbot-tools.js for AI tool question', () => {
    const files = selectRelevantFiles('How does the chatbot work?');
    expect(files).toContain('js/chatbot-tools.js');
  });
});

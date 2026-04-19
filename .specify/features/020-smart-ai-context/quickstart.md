# Quickstart & Acceptance Tests: Smart AI Context Loading

## Acceptance Tests

- [ ] Ask "How do I copy a time entry?" — verify response is correct AND check console for prompt size (should be <15KB, not 50KB+)
- [ ] Ask "What is the ArbZG daily limit?" — verify only arbzg-related context included
- [ ] Ask the AI to create a time entry — verify tool calling works without full source
- [ ] Ask a broad question "What features does this app have?" — verify comprehensive answer from docs alone
- [ ] Ask a follow-up about a specific feature — verify relevant context is added
- [ ] Ask a technical question "How does the crypto module work?" — verify source code IS included for that module

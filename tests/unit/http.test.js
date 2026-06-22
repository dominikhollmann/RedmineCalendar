import { describe, it, expect } from 'vitest';
import { httpsOrigin, RETRY_STATUSES, RETRY_COUNT, RETRY_BASE_MS } from '../../js/http.js';

describe('httpsOrigin', () => {
  it('returns the https origin of a valid URL', () => {
    expect(httpsOrigin('https://example.com/proxy/path?q=1')).toBe('https://example.com/');
    expect(httpsOrigin('http://host:8080/x')).toBe('https://host:8080/');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(httpsOrigin('not a url')).toBe('not a url');
    expect(httpsOrigin('')).toBe('');
  });
});

describe('retry constants', () => {
  it('retries on 429 and 503 only', () => {
    expect(RETRY_STATUSES.has(429)).toBe(true);
    expect(RETRY_STATUSES.has(503)).toBe(true);
    expect(RETRY_STATUSES.has(500)).toBe(false);
  });

  it('exposes the shared retry count and base backoff', () => {
    expect(RETRY_COUNT).toBe(2);
    expect(RETRY_BASE_MS).toBe(1000);
  });
});

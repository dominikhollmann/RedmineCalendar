import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bandFor } from '../../scripts/sqi.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// FR-015: the SQI composite gate was raised from ≥ 60 to ≥ 80. scripts/sqi.mjs
// exits `composite >= GREEN_MIN ? 0 : 1` and bandFor() reads the same GREEN_MIN
// constant — so the band boundary IS the merge gate. Verify both the boundary
// labels and the real process exit code.
describe('sqi composite gate (FR-015) — bandFor threshold', () => {
  it('labels >= 80 as GREEN (the merge gate)', () => {
    expect(bandFor(80).label).toBe('GREEN');
    expect(bandFor(95).label).toBe('GREEN');
    expect(bandFor(100).label).toBe('GREEN');
  });

  it('labels 50-79 as YELLOW — below the gate, would exit non-zero', () => {
    expect(bandFor(79.99).label).toBe('YELLOW');
    expect(bandFor(60).label).toBe('YELLOW'); // the OLD GREEN threshold is now YELLOW
    expect(bandFor(50).label).toBe('YELLOW');
  });

  it('labels 10-49 as RED', () => {
    expect(bandFor(49).label).toBe('RED');
    expect(bandFor(10).label).toBe('RED');
  });

  it('labels < 10 as BLACK', () => {
    expect(bandFor(9).label).toBe('BLACK');
    expect(bandFor(0).label).toBe('BLACK');
  });
});

describe('sqi composite gate — process exit code', () => {
  it('exits 1 with GREEN composite but failing ACD per-metric gate (ACD 7.95, score 41 < 80)', () => {
    const res = spawnSync('node', ['scripts/sqi.mjs'], { cwd: repoRoot, encoding: 'utf8' });
    // Composite is GREEN (≥80) but the ACD per-metric gate fails — exit 1 is the forcing function.
    // Remove this comment and flip to exit 0 once the calendar.js / planning-view.js dependency
    // fan-out is refactored to bring ACD ≤ 6. Tracked in GitHub issue #194.
    expect(res.status).toBe(1);
    expect(res.stdout).toMatch(/\[GREEN\]/);
    expect(res.stderr).toMatch(/ACD/);
  }, 90000);
});

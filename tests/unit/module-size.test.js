import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { effectiveLoc } from '../../scripts/sqi.mjs';

// Hard module-size gate (FR: one cross-language size policy).
// Soft tier (500) lives in the SQI `moduleSize` band; this is the HARD tier:
// any js/scripts/css source file over 600 EFFECTIVE lines (blank lines and
// comments excluded — same counter the SQI band uses via effectiveLoc) fails CI.
const HARD_MAX = 600;
const DIRS = ['js', 'scripts', 'css'];
const SOURCE_EXT = /\.(js|mjs|css)$/;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function collectSourceFiles() {
  const files = [];
  for (const sub of DIRS) {
    let entries;
    try {
      entries = readdirSync(resolve(root, sub), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !SOURCE_EXT.test(entry.name) || entry.name === 'style.css') continue;
      const loc = effectiveLoc(readFileSync(resolve(root, sub, entry.name), 'utf8'));
      files.push({ path: `${sub}/${entry.name}`, loc });
    }
  }
  return files;
}

describe('module-size hard gate (≤ 600 effective lines, js + scripts + css)', () => {
  const files = collectSourceFiles();

  it('finds source files to measure', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.path} (${file.loc} LOC) is within the ${HARD_MAX}-line hard limit`, () => {
      expect(file.loc).toBeLessThanOrEqual(HARD_MAX);
    });
  }
});

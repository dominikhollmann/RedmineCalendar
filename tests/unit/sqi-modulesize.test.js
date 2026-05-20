import { describe, it, expect } from 'vitest';
import { moduleSizeScore } from '../../scripts/sqi.mjs';

// FR-012: the moduleSize band must make a file at 2× the 500-LOC threshold
// score materially worse than one just over it — the old violation-count-only
// band scored any single violation at 80 regardless of how oversized the file
// was. moduleSizeScore is the worst-file-overage scorer × violation multiplier.
describe('sqi moduleSizeScore (FR-012)', () => {
  it('scores 100 when no file is over the 500-LOC threshold', () => {
    expect(moduleSizeScore(0, 0)).toBe(100);
  });

  it('scores 100 for a single file exactly at the threshold (1.0× overage)', () => {
    expect(moduleSizeScore(1, 500)).toBe(100);
  });

  it('scores 20 for a single file at 2× the threshold', () => {
    expect(moduleSizeScore(1, 1000)).toBe(20);
  });

  it('interpolates between band anchors — 1.2× → 80, 1.5× → 50', () => {
    expect(moduleSizeScore(1, 600)).toBe(80);
    expect(moduleSizeScore(1, 750)).toBe(50);
  });

  it('applies the 0.8 multiplier for 2-3 violations', () => {
    expect(moduleSizeScore(2, 1000)).toBe(16); // 20 × 0.8
    expect(moduleSizeScore(3, 1000)).toBe(16);
  });

  it('applies the 0.5 multiplier for 4 or more violations', () => {
    expect(moduleSizeScore(4, 1000)).toBe(10); // 20 × 0.5
    expect(moduleSizeScore(8, 1000)).toBe(10);
  });

  it('clamps at the 3× floor (score 0)', () => {
    expect(moduleSizeScore(1, 1500)).toBe(0);
    expect(moduleSizeScore(1, 5000)).toBe(0);
  });
});

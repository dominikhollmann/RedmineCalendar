// ── Time-entry anomaly detection ──────────────────────────────────
// Pure computation module — no DOM, no fetch, no Date.now, no localStorage.
// Reasons come from the `t()` function passed in.
//
// Public API:
//   detectAnomalies(entries, { breakTicket, holidayTicket }, t) → Map<entryId, AnomalyTag>
//   veryShortEntry(entry, t)                                     → string | null
//   overlappingEntries(dayGroup, t)                              → Map<entryId, string[]>

/**
 * @typedef {Object} AnomalyTag
 * @property {('very-short-entry'|'overlapping-entries')[]} ruleIds
 * @property {string[]} reasons
 */

/**
 * Predicate: returns a localized reason if the entry's duration is <= 0.1h
 * (and > 0 — zero-duration entries are the synthetic break-ticket pattern
 * and excluded by the aggregator, not the predicate). Returns null otherwise
 * or when hours is not a finite number.
 *
 * @param {{ hours: number }} entry
 * @param {(key: string, vars?: Record<string, any>) => string} t
 * @returns {string | null}
 */
export function veryShortEntry(entry, t) {
  const hours = Number(entry?.hours);
  if (!Number.isFinite(hours)) return null;
  if (hours <= 0) return null;
  if (hours > 0.1) return null;
  return t('anomaly.veryShort.reason', { hours: Math.round(hours * 100) / 100 });
}

/**
 * Pairwise scan: for every pair of entries in a day-group whose time ranges
 * strictly intersect, both entries get a reason string referencing the
 * other entry's start–end. Back-to-back ranges (one ends exactly when the
 * next begins) are NOT overlap.
 *
 * Callers MUST exclude break-ticket entries from `dayGroup` before calling.
 *
 * @param {Array<{ id: string|number, startTime: string, hours: number }>} dayGroup
 * @param {(key: string, vars?: Record<string, any>) => string} t
 * @returns {Map<string, string[]>}
 */
export function overlappingEntries(dayGroup, t) {
  const result = new Map();
  if (!Array.isArray(dayGroup) || dayGroup.length < 2) return result;

  const ranges = dayGroup
    .map((e) => {
      const [h, m] = String(e.startTime ?? '')
        .split(':')
        .map(Number);
      const hours = Number(e.hours);
      if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(hours)) return null;
      const startMin = h * 60 + m;
      const endMin = startMin + Math.round(hours * 60);
      return { entry: e, startMin, endMin };
    })
    .filter(
      /** @param {any} x @returns {x is { entry: any, startMin: number, endMin: number }} */ (x) =>
        x !== null
    );

  const fmt = (min) => {
    const wrapped = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(wrapped / 60);
    const m = wrapped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const addReason = (id, reason) => {
    const key = String(id);
    const existing = result.get(key);
    if (existing) existing.push(reason);
    else result.set(key, [reason]);
  };

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.startMin < b.endMin && b.startMin < a.endMin) {
        addReason(
          a.entry.id,
          t('anomaly.overlap.reason', { start: fmt(b.startMin), end: fmt(b.endMin) })
        );
        addReason(
          b.entry.id,
          t('anomaly.overlap.reason', { start: fmt(a.startMin), end: fmt(a.endMin) })
        );
      }
    }
  }
  return result;
}

/**
 * Aggregator. Evaluates both rules over the visible-week entries and returns
 * a Map keyed by entry id. Entries that match no rule are absent from the Map.
 *
 * Break-ticket entries are excluded from both rules' inputs. Holiday-ticket
 * entries participate normally (no special exclusion).
 *
 * @param {Array<{ id: string|number, hours: number, startTime: string, date: string, issueId: number|string }>} entries
 * @param {{ breakTicket?: number|null, holidayTicket?: number|null }} cfg
 * @param {(key: string, vars?: Record<string, any>) => string} t
 * @returns {Map<string, AnomalyTag>}
 */
export function detectAnomalies(entries, cfg, t) {
  /** @type {Map<string, AnomalyTag>} */
  const out = new Map();
  if (!Array.isArray(entries) || entries.length === 0) return out;

  const breakTicketId =
    cfg?.breakTicket != null && Number.isFinite(Number(cfg.breakTicket))
      ? Number(cfg.breakTicket)
      : null;

  const candidates = entries.filter((e) => {
    if (!e || e.id == null) return false;
    if (breakTicketId != null && Number(e.issueId) === breakTicketId) return false;
    return true;
  });

  const addTag = (id, ruleId, reason) => {
    const key = String(id);
    const tag = out.get(key) ?? { ruleIds: [], reasons: [] };
    tag.ruleIds.push(ruleId);
    tag.reasons.push(reason);
    out.set(key, tag);
  };

  // Rule 1: very-short-entry (per-entry)
  for (const entry of candidates) {
    const reason = veryShortEntry(entry, t);
    if (reason != null) addTag(entry.id, 'very-short-entry', reason);
  }

  // Rule 2: overlapping-entries (per day group)
  /** @type {Map<string, typeof candidates>} */
  const byDay = new Map();
  for (const entry of candidates) {
    const day = entry.date;
    if (!day) continue;
    const arr = byDay.get(day);
    if (arr) arr.push(entry);
    else byDay.set(day, [entry]);
  }
  for (const group of byDay.values()) {
    const overlaps = overlappingEntries(group, t);
    for (const [id, reasons] of overlaps) {
      for (const reason of reasons) {
        addTag(id, 'overlapping-entries', reason);
      }
    }
  }

  return out;
}

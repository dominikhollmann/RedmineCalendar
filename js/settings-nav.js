// ── Settings section navigation (Feature 054 / US1) ───────────────
// Builds the section nav (desktop rail ↔ mobile chip-bar), wires click-to-
// scroll and scroll-spy, and keeps the active mobile chip centered. DOM glue
// — covered by Playwright (tests/ui/settings-redesign.spec.js). Behavior per
// research R10 (manual chip scrollLeft, threshold-based scroll-spy).

import { t } from './i18n.js';

const MOBILE_BP = 640;

/**
 * @param {Array<{id: string, labelKey: string}>} sections
 * @param {HTMLElement} navEl   the nav container (rail/chip-bar)
 * @returns {void}
 */
export function initSettingsNav(sections, navEl) {
  if (!navEl) return;

  const isMobile = () => window.innerWidth < MOBILE_BP;

  /** @type {Map<string, HTMLAnchorElement>} */
  const links = new Map();
  navEl.textContent = '';
  for (const s of sections) {
    const a = document.createElement('a');
    a.className = 'settings-nav-item';
    a.href = `#${s.id}`;
    a.dataset.section = s.id;
    a.textContent = t(s.labelKey);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSection(s.id);
    });
    navEl.appendChild(a);
    links.set(s.id, a);
  }

  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const offset = isMobile() ? 104 : 96;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    setActive(id);
  }

  function setActive(id) {
    for (const [sid, a] of links) {
      const on = sid === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    if (isMobile()) centerChip(id);
  }

  function centerChip(id) {
    const a = links.get(id);
    if (!a) return;
    // Manual horizontal scroll of the chip container (research R10): never
    // scrollIntoView (scrolls the page) and never behavior:'smooth' here.
    const left = a.offsetLeft - navEl.clientWidth / 2 + a.offsetWidth / 2;
    navEl.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }

  function onScroll() {
    const threshold = window.scrollY + (isMobile() ? 120 : 140);
    let current = sections[0]?.id;
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el && el.offsetTop <= threshold) current = s.id;
    }
    if (current) setActive(current);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

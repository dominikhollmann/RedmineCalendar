// ESLint v9 flat config for RedmineCalendar
// Vanilla ES2022 modules, browser-targeted; tests use Vitest (unit) and Playwright (UI).
//
// Rule philosophy: keep the set lean. Only enable rules whose violations would be
// real bugs or i18n gaps. Formatting is delegated to Prettier (eslint-config-prettier
// disables stylistic rules at the end of the chain).
//
// NOTE: We deliberately do NOT add a generic "no capitalized English error message"
// rule. Selectors that try to catch `throw new Error('Something failed')` are too
// broad — they over-flag legitimate developer-facing invariants (assertions, internal
// guards) and under-flag the actual user-visible cases (which often live in template
// strings, toast helpers, or aria-label assignments). The targeted i18n rule below
// catches the concrete UAT regression pattern (`Issue #${id}` fallback subjects);
// the rest is left to code review and the localization audit checklist.

import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  // Ignore generated / vendored output
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'version.json',
    ],
  },

  // Application code — browser ES2022 modules
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // CDN-loaded vendor globals (declared in index.html script tags, not imported)
        FullCalendar: 'readonly',
        DOMPurify: 'readonly',
        marked: 'readonly',
        msal: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      ...js.configs.recommended.rules,
      // ignoreReadBeforeAssign: true permits `let x; … if (x) …; x = init();` —
      // common when a value is initialized partway through module setup but
      // needs to be referenced (often guarded) by helpers defined earlier.
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      // null:'ignore' permits the `x != null` / `x == null` idiom (catches both
      // null and undefined in one expression); everything else must use === / !==.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // SQI metrics surfaced as warnings (composite scorer in scripts/sqi.mjs reads
      // the eslint --format json output to compute Klassengröße / Methodenlänge /
      // Komplexität). Kept as warnings on purpose: per-metric strict gates live in
      // scripts/sqi.mjs (composite ≥ 60), so a single oversized helper does not
      // fail CI hard. Tune thresholds as the codebase tightens.
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', { max: 15 }],

      // i18n guard — catches the UAT-exposed regression pattern where user-visible
      // fallback subjects were hardcoded as `Issue #${id}` instead of routed through
      // t('entry.fallback_subject', { id }). The selector matches any template
      // literal whose first cooked chunk starts with "Issue #".
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TemplateLiteral:has(TemplateElement[value.cooked=/^Issue #/])',
          message:
            "Use t('entry.fallback_subject', { id }) instead of hardcoded 'Issue #' templates. All user-visible strings must go through js/i18n.js.",
        },
      ],
    },
  },

  // Vitest unit tests — node + vitest globals
  {
    files: ['tests/unit/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        // Vitest globals (describe/it/expect/etc.) — vitest config has globals: true
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // max-lines / max-lines-per-function are production-code maintainability
      // signals (used by SQI). Test files are organizational containers — long
      // describe blocks and data-table helpers are normal and don't carry the
      // same maintenance risk, so these rules are off for tests. Complexity
      // stays on (relaxed) because a high-complexity test usually indicates
      // hidden control flow that should be split.
      complexity: ['warn', { max: 20 }],
    },
  },

  // Playwright UI tests — node runner, but page.evaluate() callbacks reference
  // browser globals (window, TouchEvent, document, etc.) — include both.
  // Same rationale as unit tests: file/function-length rules off, complexity on.
  {
    files: ['tests/ui/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      complexity: ['warn', { max: 20 }],
    },
  },

  // Node-only scripts (dev server, coverage merger, etc.)
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // MUST be last: disable all stylistic rules that conflict with Prettier
  prettier,
];

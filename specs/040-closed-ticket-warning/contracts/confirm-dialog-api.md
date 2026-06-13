# Contract: `showConfirmDialog` (js/confirm-dialog.js)

**Module**: `js/confirm-dialog.js` (new)
**Consumers**: `js/time-entry-form.js`, `js/calendar.js`, `js/planning-view.js`

## Function signature

```js
/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.confirmLabel]
 * @param {string} [opts.cancelLabel]
 * @param {() => void} opts.onConfirm
 * @param {() => void} [opts.onCancel]
 */
export function showConfirmDialog(opts) { ... }
```

## Behaviour contract

- Opens `#confirm-dialog` overlay (removes `hidden` class).
- Sets `#confirm-dialog-title` text to `opts.title`.
- Sets `#confirm-dialog-message` text to `opts.message`.
- Sets `#confirm-dialog-ok` text to `opts.confirmLabel ?? t('confirm')`.
- Sets `#confirm-dialog-cancel` text to `opts.cancelLabel ?? t('cancel')`.
- On `#confirm-dialog-ok` click: calls `opts.onConfirm()`, closes overlay.
- On `#confirm-dialog-cancel` click or overlay backdrop click: calls `opts.onCancel?.()`, closes overlay.
- Traps focus inside the dialog while open (keyboard accessibility).
- Only one dialog is shown at a time; a second call while one is open replaces it.

## HTML element (index.html — document root)

```html
<div id="confirm-dialog" class="confirm-overlay hidden" role="dialog" aria-modal="true"
     aria-labelledby="confirm-dialog-title">
  <div class="confirm-card">
    <h3 id="confirm-dialog-title"></h3>
    <p id="confirm-dialog-message"></p>
    <div class="confirm-actions">
      <button id="confirm-dialog-cancel" class="btn-secondary"></button>
      <button id="confirm-dialog-ok" class="btn-primary"></button>
    </div>
  </div>
</div>
```

## CSS

Reuses existing `.confirm-overlay` and `.confirm-card` rules from `css/time-entry.css`. No new CSS rules needed.

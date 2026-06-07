# Contract: config.json Schema Extension

## New field: `feedbackEmail`

```json
{
  "feedbackEmail": "dev-team@example.com"
}
```

| Property        | Type     | Required | Default    | Validation                                                                                 |
| --------------- | -------- | -------- | ---------- | ------------------------------------------------------------------------------------------ |
| `feedbackEmail` | `string` | No       | _(absent)_ | Must be a valid email address string. When absent or empty, the feedback button is hidden. |

### Behaviour when absent

The feedback button element is **not rendered** (or rendered with `hidden` attribute) in both `index.html` and `settings.html`. No error or placeholder is shown to the user.

### Behaviour when present

The feedback button is rendered. On submission, `feedbackEmail` is used as the `toRecipients` address in the Graph API call (Office 365 path) or as the `mailto:` recipient (fallback path).

### Reading the value

```js
import { getCentralConfigSync } from './config-store.js';

const cfg = getCentralConfigSync();
const recipientEmail = cfg?.feedbackEmail ?? null;
```

The config is loaded once at app startup by `loadCentralConfig()`. The feedback module reads it synchronously via `getCentralConfigSync()` after startup completes, consistent with how other admin-gated features (`isOutlookConfigured()`, AI chat) check their config fields.

# Research: Improve Settings Page

**Branch**: `006-improve-settings` | **Date**: 2026-04-01

## Decision Log

### 1. Redmine Server URL vs. Proxy URL

**Decision**: Add a new `redmineServerUrl` field to the cookie alongside the existing `redmineUrl` (proxy URL). The proxy URL continues to be used for all API requests. The server URL is stored for reference and is displayed in a dynamic "start proxy" command tip on the settings page, eliminating the need to edit `package.json`.

**Rationale**: The app is a static SPA that cannot start OS processes. It cannot run `lcp` on behalf of the user. The only thing it can do is show the correct command. Storing the real URL in settings and reflecting it in the command tip achieves the user goal (no `package.json` editing) without architectural changes.

**Alternatives considered**:
- Replace proxy URL with real URL and skip proxy: rejected — CORS blocks direct browser-to-Redmine requests without server-side CORS headers; proxy remains necessary.
- Remove proxy URL field and hardcode `localhost:8010`: rejected — users may run the proxy on a different port.

---

### 2. Storing All Credentials Across Auth Modes

**Decision**: The cookie stores `apiKey`, `username`, and `password` fields regardless of which `authType` is active. On save, the currently-inactive-mode credentials are read from the DOM (hidden fields) and written to the cookie unchanged, preserving previously entered values.

**Rationale**: The spec requires all stored credentials to survive mode switches. The simplest implementation reads hidden field values (pre-filled from cookie on page load) before writing the new cookie, so no value is lost.

**Alternatives considered**:
- Separate cookies per mode: rejected — adds complexity; one cookie is the existing pattern.
- localStorage for inactive creds: rejected — mixing storage mechanisms for no benefit; the same-origin cookie already works.

---

### 3. Anonymous Mode Implementation

**Decision**: Add `authType: 'anonymous'` as a valid cookie value. `readConfig()` returns a valid config object for anonymous mode (no credential validation). `request()` sends no `Authorization` or `X-Redmine-API-Key` header when `authType === 'anonymous'`. Runtime 401 responses in anonymous mode redirect to `settings.html?expired=1` (same as now) so the user is informed the server requires authentication.

**Rationale**: Anonymous mode is a first-class auth choice. The app must not break when `cfg.authType === 'anonymous'` — it simply omits auth headers. A 401 at runtime still means "you need to authenticate", so the existing redirect remains appropriate.

**Alternatives considered**:
- Show inline error on 401 instead of redirect: rejected — that would change existing behaviour for all auth modes; out of scope.

---

### 4. Auth Verification Failure — Stay on Settings

**Decision**: On submit with `apikey` or `basic` auth, the current code already calls `getCurrentUser()` and shows an error on failure. The current code ALSO writes the config cookie BEFORE verifying — we will change the order: verify first, write cookie only on success (or 403).

**Rationale**: The current implementation saves the (potentially bad) config before verifying. If the user closes the page after a failed verification, the bad config is saved. The fix is: attempt verification with a temporary config object, and only persist it on success (or 403 "permission denied but server reachable" case).

**Alternatives considered**:
- Delete cookie on verification failure: rejected — if the user had a previous working config and makes a typo, deleting it loses their working config. Better to never write until verified.

---

### 5. `readConfig()` Validity Check for Anonymous Mode

**Decision**: Update `readConfig()` to return a valid config object when `authType === 'anonymous'` (only `redmineUrl` required). Remove the hard requirement for `apiKey` / `username+password` when mode is anonymous.

**Rationale**: Current code returns `null` for configs without credentials, which would redirect anonymous users to settings on every page load. Anonymous is a deliberate choice, not a missing config.

**No NEEDS CLARIFICATION items remain.**

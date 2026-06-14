# Feasibility Analysis — PC State Detection for the Planning View

**Issue**: [#177 — Planning View connector: Windows events (login / logout / screen lock)](https://github.com/dominikhollmann/RedmineCalendar/issues/177)
**Parent**: [#172 — Feature 038: Planning View](https://github.com/dominikhollmann/RedmineCalendar/issues/172) (connector deferred from v1)
**Status**: Pre-spec research / decision record
**Date**: 2026-06-14

> This is a **pre-spec feasibility study**, not a specification. It compares the
> available approaches and records the chosen direction so it can seed the
> `research.md` of the eventual `/speckit-plan` step. The formal spec (user
> stories, functional requirements, acceptance criteria) for the chosen approach
> is produced separately via `/speckit-specify`.

---

## 1. Goal

Show, on a per-day timeline in the Planning View, a ground-truth record of the
user's **PC state** so they can spot unlogged time blocks (time at the machine
that has no corresponding Redmine booking or Outlook appointment).

Target states:

- **In use** — at the computer, unlocked, active
- **Locked** — screen locked / away
- **Off / standby** — powered off or asleep

The original #177 framing assumed Windows Event Log markers (login / logout /
lock). This study evaluates that and four alternatives, and recommends a
different data source that better fits the project's deployment and privacy
constraints.

## 2. Hard constraints (used to rank options)

1. **Deployment model.** RedmineCalendar is a static SPA — "users only need a
   browser, no install, no repo access, no build step." Anything requiring a
   per-machine install is a significant departure.
2. **Work-laptop reality.** Users are on managed corporate laptops **without
   admin rights**, frequently with AppLocker / WDAC / Constrained Language Mode
   and software-install restrictions.
3. **Privacy — the decisive principle.** This feature sits one inch from
   employee-surveillance territory. **The collector must run in the user's own
   context and write to user-owned storage — never admin/company-side.** The
   user must be the sole data controller, able to pause and delete the data at
   will. This rule alone disqualifies every admin-side data source (Entra
   sign-in logs, Purview/Unified Audit Log, SharePoint access audit).
4. **Cross-platform is a bonus**, not a requirement — but Windows-only narrows
   the audience.

## 3. The core technical insight

**"Off / standby" is unobservable from any process running *on* the machine.**
When the PC sleeps or shuts down, nothing local runs to record it. Browser APIs
and local agents can only *infer* off-time from a gap in their own data, and a
gap is ambiguous (PC off? browser closed? lid shut? tab suspended?).

The only ways to get a true off/standby timeline are:

- an **OS-level source** that the OS itself writes retroactively (the Windows
  System log), **or**
- an **off-device observer** that samples the user's state from the cloud while
  the machine is off (a Microsoft 365 cloud poller).

This insight is what ultimately separates the viable options from the dead ends.

## 4. Options evaluated

### Option A — Idle Detection API (pure browser)

`IdleDetector` reports `userState` (active/idle) and `screenState`
(locked/unlocked).

- ✅ Zero install, fits the browser-only model.
- ❌ **Chrome/Edge only** — Firefox and Safari refused to implement it citing
  surveillance concerns; it will never be cross-browser.
- ❌ Requires a permission prompt + secure context.
- ❌ **Live-only, no history**, and **cannot capture off/standby** (browser
  isn't running). Only records while the tab is open.

**Verdict:** Can show locked/active live, but misses the highest-value signal
(off/standby) and has no history. Rejected.

### Option B — Local agent reading Windows state

A user-session tray app exposing events on `localhost`, consumed by the SPA
(mirrors the existing dev-server CORS-proxy pattern).

Windows splits the data across two logs with **different permission models**:

| Signal | Log | Standard user (no admin)? |
|---|---|---|
| Sleep / wake / shutdown / boot (**off/standby**) | **System** (Kernel-Power 41/42/107/1/12/13) | ✅ Readable |
| Logon / logoff, **lock 4800 / unlock 4801** | **Security** | ❌ Requires admin / Event Log Readers / "Manage auditing and security log" |

Without admin, the Security log is unreadable — but lock/unlock can still be
captured **live** at user level via `WTSRegisterSessionNotification` →
`WM_WTSSESSION_CHANGE` (`WTS_SESSION_LOCK`/`UNLOCK`), which the agent persists
itself. Redesigned agent = System log (power history, no admin) + live session
notifications (lock/unlock).

- ✅ **Only source giving true OS-level history including off/standby.**
- ✅ Clean three-state mapping.
- ❌ **Per-machine install** — breaks the browser-only model.
- ❌ **Windows-only** by definition.
- ⚠️ Even without admin, the real blocker is corporate policy (AppLocker / WDAC /
  Constrained Language Mode / MDM) that may block running any custom code.

**Verdict:** Technically the most accurate, but the heaviest deployment and the
most policy-fragile. Kept as the **documented fallback** for anyone who needs
true OS-level off/standby.

### Option C — Teams presence, live-polled from the browser

`GET /me/presence` via the existing MSAL/Graph stack.

- ✅ Zero install, cross-platform, no admin, reuses existing integration.
- ❌ **No history** — Graph presence is live-only and explicitly *not audited*.
- ❌ Same as A: only records while the tab is open → no off/standby history.
- ❌ Presence is a noisy proxy (meetings, manual overrides).

**Verdict:** Same fatal flaw as A (no history, no off). Rejected as a standalone.

### Option D — Teams presence + Graph change-notification subscription (backend)

Subscribe to presence changes via webhook.

- ✅ History possible; cross-platform.
- ❌ Requires a **publicly reachable backend endpoint** the static SPA does not
  have; `Presence.Read.All` (often admin-consented); 1-hour subscription renewals.

**Verdict:** Needs infrastructure the project lacks. Superseded by Option E,
which achieves the same outcome without a bespoke backend.

### Option E — Power Automate cloud flow → SharePoint (CHOSEN)

A **user-owned scheduled cloud flow** polls the user's own Teams presence every
~5 minutes and appends it to a SharePoint list in the user's own site/OneDrive.
The SPA reads that list via Graph (existing MSAL stack) and renders a presence
band in the Planning View.

**Why it's the breakthrough:** a scheduled cloud flow runs in Microsoft's cloud
under the user's own account and **continues to run even when the computer is
off**. The observer is *off-device*, so when the laptop is off the flow still
fires and records `Offline` — finally capturing off-time history without any
local install. This is the property that A and C structurally cannot have.

- ✅ **History**, including off-time (recorded as `Offline`).
- ✅ Zero install, cross-platform, no admin.
- ✅ Standard connectors (Office 365 Users + SharePoint) — works on seeded
  M365 E3/E5 licensing; runs under the user's own request limits.
- ✅✅ **Perfect fit for the privacy principle** — the flow, the connection, and
  the SharePoint list all belong to the user; nothing touches IT/admin systems;
  fully self-service and self-deletable.
- ⚠️ Presence is a **proxy**, not clean OS states (see caveats).

**Verdict: chosen.** Only no-install option that yields a real historical
timeline including off-time, and the strongest possible expression of the
user-owned-privacy principle.

## 5. Decision

**Adopt Option E** (Power Automate → SharePoint presence timeline) as the #177
connector. **Document Option B** (redesigned local agent) as the fallback for
users who specifically need true OS-level off/standby distinctions.

### Architecture

```
[Cloud flow — user-owned]
  Recurrence: every ~5 min
    → Office 365 Users "Get presence" (own user id)   ← standard connector
    → SharePoint "Create item": { timestampUtc, availability, activity }
        ↓
[SharePoint list in the user's own site / OneDrive]
        ↓
[RedmineCalendar SPA] reads the list via Graph (existing MSAL token)
        → renders a presence band in the Planning View
```

### State mapping (presence → displayed band)

| Displayed | Teams presence (`availability`) |
|---|---|
| In use | Available / Busy *(may include meetings)* |
| Locked / away | Away / BeRightBack |
| Off / standby | Offline *(also = Teams closed / signed out)* |

## 6. Caveats & open questions (for the spec/clarify phase)

1. **Presence is a proxy, not OS state.** Cannot cleanly separate *locked* vs
   *standby* vs *off* (Away/Offline collapse them); "Busy" may be a meeting while
   away from the desk. Acceptable because the goal is spotting unlogged blocks,
   not forensic OS state — but must be stated in the UI (label the column
   "Teams presence", not "PC state").
2. **Granularity:** ~5-minute sampling (Recurrence minimum is 1 min; 5 balances
   fidelity vs. run limits). Won't catch a 2-minute lock.
3. **Tenant dependencies (user-testable):** Power Automate must be enabled for
   users; a DLP policy could block combining Office 365 Users + SharePoint
   connectors in one flow.
4. **Ops hygiene:** flows can auto-disable after repeated errors or ~90 days of
   owner inactivity — needs a "is my flow still running?" affordance.
5. **Setup burden:** the flow is a per-user artifact set up outside the app. Ship
   a documented template + step-by-step (and a SharePoint list schema) rather
   than expecting users to build it from scratch.
6. **SPA consumption scope:** confirm whether reading the user's own SharePoint
   list needs `Sites.Read.All` (admin-consented in some tenants) or a narrower
   user-consentable path (e.g. a list in the user's OneDrive / personal site).
7. **Privacy guardrail in scope:** store **timestamp + availability only** — no
   message content, no titles. Re-confirm during `/speckit-clarify`.

## 7. Recommended next step before spec work

**Build the flow as a 15-minute proof of concept** to confirm the tenant allows
it before investing in spec/implementation:

1. Power Automate → **Scheduled cloud flow**, Recurrence = 5 minutes.
2. Add **Office 365 Users → Get presence of a user** (your own user id).
3. Add **SharePoint → Create item** into a test list with columns
   `TimestampUtc` (DateTime) + `Availability` (Text) + `Activity` (Text).
4. Run for a day; confirm rows accumulate, including `Offline` rows overnight
   while the laptop is off.
5. Confirm no DLP policy blocks the save.

If the PoC works → run `/speckit-specify` for the chosen approach, referencing
this document and closing #177 on merge.

## 8. References

- Windows Event Log permission model (Security log requires admin):
  <https://learn.microsoft.com/en-us/answers/questions/2197624/granting-non-admin-user-read-only-access-to-window>
- User-level session lock/unlock without admin:
  <https://learn.microsoft.com/en-us/windows/win32/termserv/wm-wtssession-change>
- Idle Detection API: <https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API>
- Idle Detection rejected by Firefox/Safari:
  <https://alternativeto.net/news/2021/9/google-chrome-94-s-idle-detection-api-rejected-by-mozilla-and-apple-citing-user-surveillance-concerns->
- Graph presence has no history / not audited:
  <https://learn.microsoft.com/en-us/answers/questions/4372609/to-get-historic-presence-data-in-microsoft-graph-a>
- Graph presence change notifications (subscription) — `Presence.Read.All`, delegated:
  <https://devblogs.microsoft.com/microsoft365dev/get-notified-of-presence-changes-the-microsoft-graph-presence-subscription-api-is-now-available-in-public-preview/>
- Power Automate scheduled flows run in the cloud even when the computer is off:
  <https://learn.microsoft.com/en-us/power-automate/limits-and-config>
- Power Automate flow execution uses the owner's context/limits:
  <https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/faqs>

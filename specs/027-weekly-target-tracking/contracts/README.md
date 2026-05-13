# Contracts: Weekly Hours Target Tracking

This feature exposes **no external interfaces**. It is a pure-UI add-on rendering a derived value (`WeekProgress`) from data the app already loads. There are no new API calls, no new RPC methods, no new file formats, no new query strings.

The only "contract" worth recording is the JS function signature for the new pure module — which is documented in `data-model.md` (`computeWeekProgress`) and not duplicated here.

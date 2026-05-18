# `sbom.json` — schema reference

The committed `sbom.json` MUST conform to the **CycloneDX 1.6 JSON** schema. We do not maintain a local schema file — the upstream schema is the contract, and the release-pipeline schema-validation step (R7) validates against it directly.

## Authoritative schema source

- **Spec**: <https://cyclonedx.org/specification/overview/>
- **Schema (JSON)**: <https://cyclonedx.org/schema/bom-1.6.schema.json>
- **Spec text**: <https://github.com/CycloneDX/specification/blob/master/schema/bom-1.6.schema.json>

## Why no local copy

- The CycloneDX TC owns the schema and ships updates on its own cadence. Pinning a local copy creates a drift point that adds maintenance overhead without buying anything — the validator's network round-trip is negligible inside a CI release job that's already pulling Docker images.
- Pinning to version `1.6` (in the `specVersion` field of every emitted SBoM) is the version-stability anchor that matters; the schema document at that version is immutable per CycloneDX policy.

## Local validation tooling

The release pipeline (per `plan.md` R7) uses validation tooling from the CycloneDX npm package family — the exact validator script is selected at task time (`/speckit-tasks`). Default candidate: `@cyclonedx/cyclonedx-npm` itself ships a validator subcommand; if not, `@cyclonedx/bom-validate` is a single-purpose alternative. Either way, no new top-level dev dep beyond the two already declared in `plan.md`.

## Mapping from local Dependency record to CycloneDX

See [`../data-model.md`](../data-model.md) section _"File: `sbom.json` → Mapping rules"_ for the field-by-field mapping the generator applies. The mapping is straightforward — CycloneDX's data model is a near-superset of our Dependency record entity.

## What "valid SBoM" means for this feature

For the FR-007 / SC-003 schema-validation gate, "valid" means:

1. The document parses as JSON.
2. `bomFormat === "CycloneDX"` and `specVersion === "1.6"`.
3. Every required CycloneDX 1.6 field is present (the validator handles this).
4. No CycloneDX `serialNumber` is reused across versions (auto-generated UUID per invocation — no manual maintenance).

The validator step in `release.yml` (R7) exits non-zero on any of those failures, which blocks the release per FR-020.

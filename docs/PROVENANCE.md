# Provenance and release boundaries

## Source selection

The application source and locked dependencies were copied from a fixed committed version of the existing taxonomy-review app into a separate staging directory. The original working trees and all original data remained untouched. No original Git history, agent instructions, internal decision logs, generator paths into research storage or original public artifacts are included.

The original app has no project-wide LICENSE file. The owner explicitly confirmed permission to publish the Phase 3 website code with synthetic demo data. That scope does not include the separate data-acquisition or integration pipeline, original datasets, or model weights. No reuse license has been selected or granted for this project's own code.

## Deliberate candidate changes

- Removed every original runtime public artifact and all 8,211 source thumbnails.
- Added a deterministic standalone generator for invented fixtures and plain SVG diagrams.
- Added an unmistakable synthetic-data banner and changed the development/preview bind to loopback.
- Replaced original research-data contract tests, including fixed scientific counts, with contracts for the new synthetic data. Existing component, parsing, filtering and mapping behavior tests remain. These legacy unit examples and compatibility constants include real provider names, taxonomic identifiers, and research-style relative paths; their individual provenance has not been independently established as invented. They are not runtime demo data or a redistribution of the referenced datasets.
- Added a strict public-file allowlist checked before generation and build, and a warning beside CSV export about spreadsheet formula interpretation. Unexpected assets are rejected, never silently deleted.
- Added an integration test that loads the generated fixtures and traverses valid, invalid and mapping sections.

## Dependencies

Dependencies are referenced by the existing lockfile but not bundled in the source archive. The metadata inventory records both lockfile license declarations and installed-package license fields where available; missing entries are explicitly unconfirmed. It is not a complete transitive-license, binary-distribution or vulnerability audit.

The installed direct package license texts checked during preparation identify React as MIT, TanStack React Table as MIT, and Lucide as ISC with Feather-origin MIT portions. Those terms do not grant a license to this project's own code or to research datasets. A future hosted/bundled build must preserve the notices required by the exact bundled packages.

## Data and disclosure

The source candidate contains no downloaded biological images, API cache, contact metadata, model artifact, research manifest or real experiment output. The synthetic diagrams do not embed remote links, scripts, raster images or font files. No conclusion is drawn here about rights to redistribute the original datasets or any trained model.

## Remaining review

Complete real-browser visual/accessibility QA before treating this as a polished public demo. Any future grant of a reuse license, deployment, data acquisition or research-data distribution requires its own scoped decision. These checks are separate from passing unit tests.

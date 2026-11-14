# Taxonomy Curation Workbench

**A synthetic-data source showcase of a research taxonomy-review interface.**

This React/TypeScript application demonstrates how heterogeneous labels can be inspected, traced to source evidence, and mapped into stable target identifiers. It is a curated snapshot derived from the PICASSO Phase 3 review interface.

> **Source showcase, not an open-source or production release.** No reuse license is granted for this project's own code. Every bundled runtime dataset, identifier, count, review rule and diagram is invented for demonstration. Nothing displayed is a biological conclusion or a real dataset result.

## What you can explore

- **Valid tree:** expand a taxonomy-like hierarchy; filter by collection, instrument, rank, risk flag or search terms; open label details and sample diagrams.
- **Invalid labels:** inspect non-taxonomic categories and mismatch evidence, including overlap with valid-tree candidates.
- **Mapping status:** inspect example histories, draft keep/merge/drop decisions, import mapping CSVs, validate identifiers, and download a mapping CSV.

The browser export does **not** update a server, an original dataset, or a training manifest. Decisions remain a local draft until exported and deliberately integrated by a separate pipeline.

## Run locally

Use the Node version in `.nvmrc` (20.20.2) or a compatible version satisfying `package.json`, plus Python 3 for fixture generation and build-time asset checks.

```bash
npm ci --ignore-scripts
npm run generate:demo
npm test
npm run test:fixtures
npm run build
npm run dev
```

The development server binds **127.0.0.1**. It serves only static application assets and local synthetic fixtures. There is no backend, authentication, external data API, credential, or model dependency. Build artifacts and installed dependencies are excluded from the source archive.

## Synthetic fixture design

Two invented collections provide three valid candidate rows and two invalid-review groups. Stable identifiers such as `demo_taxon_a` deliberately cannot be mistaken for real WoRMS AphiaIDs. A small mapping history demonstrates merge/drop decisions without claiming scientific correctness. Sample images are original SVG geometry labeled **SYNTHETIC DIAGRAM**, not research thumbnails.

`npm run generate:demo` reads no research file and makes no network request. It writes the same JSON/CSV/SVG fixtures under `public/` and refreshes their checksum metadata. Generation rejects unexpected public files, directories and symlinks before writing; it never silently deletes them. Builds also check the exact asset list and JSON/CSV checksums. These checks prevent accidental extra-file packaging, not malicious replacement of an allowed fixture.

The original app's entire `public/` directory, including 8,211 research images, was excluded rather than scrubbed in place.

## Architecture

```text
Synthetic fixture generator
          |
          v
Static JSON / CSV / SVG
          | same-origin fetch
          v
React review interface
   | tree and evidence inspection
   | local mapping draft
   v
Browser CSV download
(no server writeback)
```

The retained source separates schema types, dataset-label presentation, CSV parsing, tree normalization/filtering and review components. Existing behavior tests are complemented by a generated-fixture contract and a route-integration test using the actual synthetic files.

## Validation and limits

See [validation](docs/VALIDATION.md), [provenance and release boundaries](docs/PROVENANCE.md), and [dependency inventory](docs/DEPENDENCY_METADATA.json).

This candidate is not the complete original data-integration workflow, a scientific benchmark or a reproduction of all taxonomy decisions. Existing provider names in source compatibility constants and legacy unit tests do not mean their datasets are included or licensed here.

CSV imports are local files but still untrusted input. The exporter preserves cell text and is not a spreadsheet-formula sanitizer. Inspect unfamiliar CSVs as text or import with spreadsheet formula interpretation disabled. Do not upload private data to a deployed copy without separately reviewing its data-handling needs.

No project code license has been assigned. Public readability, permission to redistribute original datasets and permission to reuse this code are separate questions. This source showcase must not be described as open source.

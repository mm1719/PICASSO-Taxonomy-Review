# Taxonomy Curation Workbench

**A research taxonomy-review interface with a licensed LifeWatch and MedPlanktonSet subset.**

This React/TypeScript application demonstrates how heterogeneous labels can be inspected, traced to source evidence, and mapped into stable target identifiers. It is a curated snapshot derived from the PICASSO Phase 3 review interface.

> **Limited, reviewed snapshot, not the complete research dataset.** Images retain their source CC BY 4.0 licenses. No reuse license is granted for this project's own code. Taxonomy placements and risk flags are project-reviewed decisions, not a live database lookup or an endorsement by the source providers.

## What you can explore

- **Valid tree:** expand the retained taxonomy hierarchy; filter by dataset, instrument, rank, risk flag or search terms; open label details and real thumbnails.
- **Invalid labels:** inspect non-taxonomic categories and mismatch evidence, including overlap with valid-tree candidates.
- **Mapping status:** inspect the existing LifeWatch histories, draft keep/merge/drop decisions, import mapping CSVs, validate identifiers, and download a mapping CSV. MedPlanktonSet has no formal history and is not assigned invented keep decisions.

The browser export does **not** update a server, an original dataset, or a training manifest. Decisions remain a local draft until exported and deliberately integrated by a separate pipeline.

Drafts live in memory, not browser storage. Repeated clicks on the active edit mode do not reset a draft. Returning from history to edit asks before replacing a changed draft; cancel resumes that draft. Export before reloading or leaving the mapping section.

## Public demo

[Open the public review site](https://picasso-taxonomy-review.vercel.app).

This independent Vercel project is connected only to `mm1719/PICASSO-Taxonomy-Review`, with `main` as its production branch and the repository root as its build root. It does not replace or synchronize with the original Phase 3 website or research data. No environment variables or backend services are required.

Vercel uses the settings in `vercel.json`: a locked dependency install, the full build including publication-contract and license-notice checks, and `dist` as the output. The primary URL is public; generated deployment URLs retain Vercel's default protection. See [the deployment validation record](docs/VALIDATION.md) for tested behavior and remaining limits.

## Run locally

Use the Node version in `.nvmrc` (24.22.3) or a compatible Node 24.x version, plus Python 3.11+ for build-time asset checks. The Node major is pinned to keep local checks and Vercel builds aligned.

```bash
npm ci --ignore-scripts
npm test
npm run test:fixtures
npm run build
npm run dev
```

The development server binds **127.0.0.1**. It serves only static application assets and the checked-in public subset. There is no backend, authentication, external data API, credential, or model dependency. No access to the private Phase 3 workspace is needed to build or test this repository. Build artifacts and installed dependencies are excluded from Git.

Builds generate `dist/THIRD_PARTY_LICENSES.md` from the installed bundled dependencies. JavaScript chunks reference that file, and build-time tests verify the required package versions and complete license texts. Deploy the complete `dist/` directory, including the notices; these notices do not license this project's own code.

### Browser acceptance

```bash
npx playwright install chromium --only-shell
npm run test:browser
```

This uses disposable Chromium contexts, not your regular browser profile. The default target is the independent public PICASSO site; network requests are restricted to GET/HEAD. Tests exercise real downloads/uploads, mapping round trips, rejected-import and history-replacement protection, credits, thumbnails, desktop/mobile layouts and every published asset's hash. The full thumbnail set is decoded once on desktop; mobile repeats the interactive workflows.

To test an already running local build preview, set `PICASSO_BASE_URL=http://127.0.0.1:4173`. The configuration refuses other non-loopback hosts, including the original Phase 3 site. Screenshots, CSVs and failure traces go to ignored `test-results/` (override with `PICASSO_TEST_OUTPUT`); the HTML report is in ignored `playwright-report/`. These checks do not persist mapping decisions or run the research pipeline. Mobile emulation is not physical-device or Safari/Firefox verification.

## Published subset

| Dataset | Instrument | Valid entries | Source labels with thumbnails | Thumbnails |
| --- | --- | ---: | ---: | ---: |
| LifeWatch | FlowCAM | 82 | 95 | 475 |
| MedPlanktonSet | IFCB | 137 | 139 | 608 |
| Total | | 219 | 234 | 1,083 |

The five-image limit is per **dataset + original source label**, shared across valid, invalid and AphiaID-specific views. Labels with fewer eligible examples retain fewer. The same thumbnail may appear in more than one view but is counted once. Invalid review has 14 non-taxonomic and 8 mismatch evidence groups; these tables overlap (18 unique groups).

The 219 candidate rows, 222 placements and 171 selected lineage records preserve the original reviewed content. Tree summaries are recomputed for these two datasets. Displayed source-cohort counts are not the number of bundled thumbnails, and valid/invalid evidence totals must not be added. Mapping counts use the current LifeWatch ML-ready cohort (337,032 images across 80 targets); two additional historical destination IDs have zero images and are marked **Reference only**.

1,077 thumbnails are backed by current ML-ready manifests. Six MedPlanktonSet invalid-review examples (`Copepod_eggs` and `Rhabdosphaera_clavigera`) are independently checked against read QC, EDA exclusions and exact-dedup records; they are review evidence, not new valid ML-ready rows. One stale LifeWatch thumbnail absent from the accepted manifest was excluded. No original image was cleaned or modified for this publication.

See [sources and attribution](docs/PROVENANCE.md), the in-app **Sources and licenses** panel, and the per-image [attribution CSV](public/data/image_attributions.csv). Existing JPEG thumbnails are copied unchanged; their prior resizing/encoding is disclosed.

`scripts/check_public_data.py` validates the exact asset list, every data/image hash, source-label image budgets, attribution, taxonomy coverage, aggregate counts, mapping closure and private-path exclusions. Unexpected assets and symlinks fail the build without being deleted. Hashes detect accidental drift, not malicious replacement of both payload and metadata.

Maintainers with the separately held original inputs can run `npm run build:subset -- --phase3-root /path/to/phase3 --output /path/outside/phase3/new-public`. The exporter reads only, refuses an existing output or output inside the original workspace, and records/verifies input hashes. Review its output before replacing this repository's `public/`; production builds never run the exporter. The retired synthetic generator cannot overwrite this dataset.

## Architecture

```text
Read-only subset exporter (maintainer only)
          |
          v
Checked-in JSON / CSV / JPEG + attribution
          | same-origin fetch
          v
React review interface
   | tree and evidence inspection
   | local mapping draft
   v
Browser CSV download
(no server writeback)
```

The retained source separates schema types, dataset-label presentation, CSV parsing, tree normalization/filtering and review components. Existing behavior tests are complemented by publication contracts and route/CSV integration tests using the actual public snapshot.

## Validation and limits

See [validation](docs/VALIDATION.md), [provenance and release boundaries](docs/PROVENANCE.md), and [dependency inventory](docs/DEPENDENCY_METADATA.json).

This candidate is not the complete original data-integration workflow, a scientific benchmark or a reproduction of all taxonomy decisions. Existing provider names in source compatibility constants and legacy unit tests do not mean their datasets are included or licensed here.

CSV imports are local files but still untrusted input. The exporter preserves cell text and is not a spreadsheet-formula sanitizer. Inspect unfamiliar CSVs as text or import with spreadsheet formula interpretation disabled. Do not upload private data to a deployed copy without separately reviewing its data-handling needs.

Mapping imports require `action`, `source_id`, and `target_id` columns; aliases and notes are optional. Missing or duplicate columns, unclosed quoted fields, missing/unknown/duplicate source IDs, unsupported actions, and file read failures block the import without changing the current draft. Actions accept `keep`, `merge`, or `drop` case-insensitively. A correctly headed CSV with no data rows represents an all-keep draft, matching an export with no explicit rules. Unresolved merge targets remain visible errors and block export.

Failed HTTP requests, network errors, or data parse errors show a retryable loading error instead of an indefinite loading screen.

No project code license has been assigned. Public readability, permission to redistribute original datasets and permission to reuse this code are separate questions. This source showcase must not be described as open source.

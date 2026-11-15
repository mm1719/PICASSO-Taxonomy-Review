# Provenance and release boundaries

## Source selection

The application source and locked dependencies were copied from a fixed committed version of the existing taxonomy-review app into a separate repository. The original working trees and data remain untouched. No original Git history, agent instructions, internal decision logs, credentials, full manifests or model weights are bundled.

The original app has no project-wide LICENSE file. Initial authorization covered website code and synthetic data; on 2026-11-15 the owner additionally approved a real subset of LifeWatch and MedPlanktonSet, at most five images per source label. No reuse license has been selected or granted for this project's own code. The two datasets retain their independent licenses below.

## Initial synthetic release (historical)

- Removed every original runtime public artifact and all 8,211 source thumbnails.
- Added a deterministic standalone generator for invented fixtures and plain SVG diagrams.
- Added an unmistakable synthetic-data banner and changed the development/preview bind to loopback.
- Replaced original research-data contract tests, including fixed scientific counts, with contracts for the new synthetic data. Existing component, parsing, filtering and mapping behavior tests remain. These legacy unit examples and compatibility constants include real provider names, taxonomic identifiers, and research-style relative paths; their individual provenance has not been independently established as invented. They are not runtime demo data or a redistribution of the referenced datasets.
- Added a strict public-file allowlist checked before generation and build, and a warning beside CSV export about spreadsheet formula interpretation. Unexpected assets are rejected, never silently deleted.
- Added an integration test that loads the generated fixtures and traverses valid, invalid and mapping sections.

## Dependencies

Dependencies are referenced by the existing lockfile but not bundled in the source archive. The metadata inventory records both lockfile license declarations and installed-package license fields where available; missing entries are explicitly unconfirmed. It is not a complete transitive-license, binary-distribution or vulnerability audit.

The installed direct package license texts checked during preparation identify React as MIT, TanStack React Table as MIT, and Lucide as ISC with Feather-origin MIT portions. Those terms do not grant a license to this project's own code or to research datasets. The build now emits `THIRD_PARTY_LICENSES.md` using Vite's bundled-dependency license generator and references it from each JavaScript chunk. Build tests check the exact installed versions and full license texts for React, React DOM, Scheduler, Lucide React, TanStack React Table and TanStack Table Core. The complete build output, including this notice file, must remain together when hosted or distributed.

## Data and disclosure

The synthetic runtime fixtures have now been replaced by the approved real subset. No other dataset's image cohort, full API cache, contact metadata, model artifact or training manifest is included. Provider names in legacy tests or terminology examples do not imply that their data are published here.

### Image sources

- **LifeWatch**: Wout Decrop, Rune Lagaisse, Jonas Mortelmans, Julie Muyle, Luz Amadei Martinez and Klaas Deneudt (VLIZ), *LifeWatch observatory data: phytoplankton annotated trainingset by FlowCam imaging in the Belgian Part of the North Sea*. [Zenodo record](https://zenodo.org/records/16679297), DOI `10.5281/zenodo.16679297`, published 2025-08-05. **475 thumbnails**.
- **MedPlanktonSet**: creators as listed by the deposit, Mente MS & Houliez E; Scalco E.; Roselli L.; Sarno D. (Stazione Zoologica Anton Dohrn), *MedPlanktonSet - A dataset of labeled IFCB images from the Mediterranean Sea*. [Zenodo record](https://zenodo.org/records/15471023), DOI `10.5281/zenodo.15471023`, published 2025-06-05. **608 thumbnails**.

Both official Zenodo record APIs identified **CC BY 4.0** when checked 2026-11-15. [License terms](https://creativecommons.org/licenses/by/4.0/) permit redistribution/adaptation with attribution, a license link and an indication of changes. These data terms do not license the project's own code, remove other rights, or imply endorsement.

Changes: selected from QC/EDA-eligible records; the research pipeline had resized and JPEG-encoded these review thumbnails. This exporter copies those JPEG bytes unchanged. Source labels are retained separately from project-reviewed taxonomy/risk/mapping decisions. The five-image budget is shared across routes and label aliases, keyed by dataset and original label. Each image has a source reference, DOI, quality gate and SHA-256 in [`image_attributions.csv`](../public/data/image_attributions.csv). Creator names and license links are also displayed in the website and thumbnail view.

### Taxonomy and mapping

WoRMS Editorial Board (2026). *World Register of Marine Species*. Available from [WoRMS at VLIZ](https://www.marinespecies.org), DOI `10.14284/170`. [Provider terms](https://www.marinespecies.org/about.php) were checked 2026-11-15. Only the limited, previously reviewed lineage/name/status facts for the selected subset are retained; this is not the complete WoRMS database and includes no WoRMS images. The underlying taxonomy records were not refreshed for this publication.

Retained external name/status evidence credits **AlgaeBase** (Guiry & Guiry, University of Galway), accessed through **Global Names Verifier**, and **Catalogue of Life**, with record links in the drawers. No provider descriptions, imagery or raw response caches are included or relicensed. These short factual references support historical project decisions; they are not a claim that every provider agrees or that source labels have been independently revalidated today.

Existing LifeWatch mapping histories are preserved. MedPlanktonSet has no formal mapping history and receives no invented keep decisions. Historical destinations `ntc_031` and `ntc_053` remain reference-only IDs with zero images, preserving merge closure without importing their original datasets. Retained candidate rows, leaf placements and lineage records are identical to the selected original records; ancestor and table summaries are restricted to the approved subset.

The snapshot metadata records ten read-only source-input hashes and hashes for all public artifacts. Original absolute paths are not published. Counts refer to frozen reviewed cohorts, not the 1,083 redistributed thumbnails. Invalid review evidence is not necessarily ML-ready, and overlapping review tables must not be added together.

## Remaining review

The independent Vercel deployment is connected only to `mm1719/PICASSO-Taxonomy-Review`. The [public site](https://picasso-taxonomy-review.vercel.app) does not replace or synchronize with the original Phase 3 website. Its redistribution is limited to the approved subset above. This authorization does not grant a reuse license for the project code.

Complete real-browser visual/accessibility QA before treating this as a polished public demo. Any future code-license grant or expansion beyond this dataset scope requires its own decision. These checks are separate from passing unit tests and HTTP deployment checks.

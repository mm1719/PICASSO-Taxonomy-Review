# Validation record

## Browser acceptance and fixes (2026-11-15)

The owner explicitly approved isolated Playwright/Chromium after the connected browser remained unavailable. Only this independent repository is writable for this task. Production baseline: `994b573c40e6d8f86e0f7d0f77919c3aac0f297e`, deployment `dpl_DP7d1deGtLxj9rCMUFMQgfW8sURQ` at the PICASSO canonical domain. Earlier browser-unavailable notes below remain historical checkpoints, superseded by this acceptance run.

- Added pinned, development-only Playwright 1.65.1 and a repeatable read-only browser suite. Fresh contexts do not access an existing browser profile. The target allowlist rejects the original Phase 3 host; all browser requests must use GET/HEAD. CSV imports and downloads operate only on disposable local drafts/files.
- Baseline real-browser testing reproduced a note round-trip bug: import trimmed leading/trailing whitespace. Fixed only the note field; action/source/target normalization and validation are unchanged. A focused unit regression failed before the fix and passed afterward.
- Baseline mobile screenshots showed page-header overflow and unreliable drawer/modal interactions. Narrow layouts now wrap the header/toolbars, constrain grid tracks, and stack source credits. Wide tables/tree rows still intentionally scroll within their own panels; the document itself must fit the viewport.
- Local production-build acceptance: **21 passed**, **1 intentionally skipped** duplicate asset sweep on mobile. Both desktop (1440 x 1000) and mobile emulation (390 x 844) run all interactive workflows. Chromium **159.0.8154.6**, Playwright **1.65.1**, Node **24.22.3**.
- Verified actual valid and invalid thumbnail workflows for both datasets, creator/source/CC BY 4.0 links, byte-identical attribution CSV download, all 13 latest LifeWatch merge/drop rules, filtered export completeness, file-chooser reimport, preserved whitespace/quotes/commas/newlines/Unicode, five rejected-import cases preserving the draft, cancelled/confirmed history replacement, unresolved-target export blocking, self-merge normalization and header-only CSV round trips. MedPlanktonSet remains explicitly outside formal mapping history.
- The complete public payload was verified: metadata matches the checked-in snapshot; the other **1,091 files** match SHA-256 and byte size. All **1,083 JPEG thumbnails** decode successfully in Chromium. This is an asset-integrity/renderability check, not a fresh scientific classification or visual inspection of every label.
- `npm run coverage`: **83 passed** in 10 files; statements **94.07%**, branches **81.76%**, functions **93.96%**, lines **94.36%**. Playwright files are excluded from Vitest and frontend coverage. `npm run test:fixtures`: **15 passed**. `npm run build`: passed, including **2 notice tests**. `npm audit --json`: **0 vulnerabilities**. All **297** dependency inventory entries match the lockfile/available installed license metadata.
- Baseline traces/screenshots: `/tmp/picasso-browser-baseline-20261115/`. Successful local screenshots and downloaded CSVs: `/tmp/picasso-browser-local-20261115/`. These are local evidence, not published assets or research outputs.

Limits: Chromium only, with mobile emulation rather than physical devices. Drafts remain intentionally memory-only: export before reload, closing the tab or leaving the mapping section. This work does not add cross-session storage or spreadsheet-formula sanitization. Provider link destinations/credits are checked against the approved publication snapshot; no new external taxonomy/license audit was performed. No original Phase 3 generator or research QC pipeline was run.

## Completed change: licensed dataset subset (2026-11-15)

Owner-approved scope: publish only LifeWatch and MedPlanktonSet, at most five distinct images per dataset/source label across all views, preserving reviewed lineage, risk flags and stable mapping IDs. Original Phase 3 inputs are read-only. Mapping history covers LifeWatch only; MedPlanktonSet has no formal mapping history and must not acquire invented keep decisions. Historical merge destinations outside LifeWatch may appear as zero-image reference targets, without other datasets' images or counts.

- [x] Inspect source schemas, current manifests and source licenses.
- [x] Export the filtered tree/candidates, invalid evidence, mapping and QC-gated thumbnails.
- [x] Add visible attribution, snapshot/count semantics and mapping scope.
- [x] Verify data contracts, publication guardrails, UI/CSV regression tests and build.
- [x] Push the independent repository and verify its production deployment; recheck original inputs unchanged.

Acceptance: only the two approved image sources; traceable source and thumbnail hashes; no private paths or unexpected public files; identical retained taxonomy placements/risk flags; closed mapping references; no more than five images per source label; explicit distinction between reviewed cohort counts and displayed thumbnails.

### Subset verification

- Published payload: 219 valid entries (82 LifeWatch, 137 MedPlanktonSet), 222 placements, 171 selected lineages; 1,083 JPEG thumbnails across 234 original source labels. LifeWatch has 475 thumbnails, MedPlanktonSet 608. All routes share the five-per-label budget.
- Read-only comparison against source: every retained candidate field, leaf placement and ancestor path, lineage record, and mapping-history row is unchanged. All ten source-input hashes match after export. Summary counts alone are restricted/recomputed for the selected datasets.
- Mapping: 80 LifeWatch cohort targets covering 337,032 accepted images, plus two zero-image reference-only destinations. Two historical snapshots remain closed over stable IDs. MedPlanktonSet has no formal history and no fabricated keep rows.
- Image checks: all 1,083 JPEGs fully decoded with Pillow and have no EXIF; copies are hash-identical to the selected original review thumbnails. 1,077 have current-manifest membership; six MedPlanktonSet invalid examples independently pass read QC, EDA and exact-dedup gating. One stale LifeWatch example was excluded.
- `npm run coverage`: **82 frontend tests passed in 10 files**, including actual-snapshot route/attribution checks and a real-ID CSV export/import round trip with rejected-import and changed-draft protection. Configured frontend coverage: statements **94.07% (714/759)**, branches **81.76% (650/795)**, functions **93.96% (296/315)**, lines **94.36% (620/657)**. Not a Python/root-repository coverage claim.
- `npm run test:fixtures`: **15 passed**, including shared cross-route sample budgets, immutable leaf pruning, historical-target closure, QC threshold boundaries, missing metrics, exact dedup, original-output isolation, hashes, missing/extra assets, symlinks, private paths, and rehashed semantic violations.
- `npm run build`: passed the offline publication guard, TypeScript, Vite build and **2 license-notice tests**. `npm audit --json`: **0 vulnerabilities**. `git diff --check`: passed. No dependency versions changed; only the old synthetic package name was renamed.
- React changes use existing components and one small static publication JSON import, without extra API calls, browser storage or new dependencies. Existing CSV semantics remain unchanged.
- Original root status still has only the two pre-existing EcoTaxa cache changes; the original demo submodule remains clean on its original branch. No original generator or report-writing QC command was run.

Remaining limit: the connected browser host still reports unavailable (rechecked 2026-11-15). jsdom and HTTP checks are not visual, native-download or cross-browser acceptance. An alternate browser was not installed, in accordance with the owner's earlier instruction. Taxonomy and QC decisions were reused, not rerun as a new scientific review.

### Production verification

- Product commit `17275b644b8371622b8206ba1e1bf25ef607d0bd` was pushed only to `mm1719/PICASSO-Taxonomy-Review/main`. Vercel automatically built production deployment `dpl_C9oDBGKiFx7u1jmeBNTbN1bog8uJ` from that SHA; both Vercel READY and the GitHub Vercel success status were confirmed.
- The canonical alias [picasso-taxonomy-review.vercel.app](https://picasso-taxonomy-review.vercel.app) resolves to that project/deployment. Anonymous requests to `/`, `/valid`, `/invalid` and `/mapping` return HTTP 200 with the current application shell. This is route/hosting verification, not browser rendering acceptance.
- All **1,092 public artifacts** (nine JSON/CSV files and 1,083 JPEGs), **6,293,133 bytes**, were downloaded anonymously and matched local SHA-256/size records. JPEG content types are correct. Compiled JavaScript, CSS and the third-party notice also matched the local build.
- The original Vercel project's before/after details were identical, including its production deployment `dpl_GjNSJoexbqm1omAAMvsSa2n67kHJ`. Original source-input hashes still match. Neither that site's configuration nor research files were written.
- This verification entry is a documentation-only follow-up; it does not change the verified application or public payload. The repository is returned to synchronized `main` after publication.

## Historical baseline

The sections below are dated checkpoints, not descriptions of the current runtime data. Prepared 2026-11-14 for the isolated synthetic dashboard candidate. The original research application and data were not modified.

## Completed

- `npm ci --offline --ignore-scripts --no-audit --no-fund`: installed the locked dependencies from the existing cache.
- `npm test`: **55 passed in 10 files**, including a generated-fixture contract and actual-fixture route integration.
- `npm run test:fixtures`: **6 passed** using isolated temporary directories, covering deterministic generation, exact-file checks, unexpected files/directories, symlink rejection without target modification, missing assets and changed payload hashes.
- `npm run build`: **passed**, including TypeScript checking and the Vite production build.
- `npm run coverage`: **passed**. In the configured report scope: statements 93.83% (654/697), branches 80.94% (616/761), functions 93.79% (287/306), lines 94.03% (568/604). These percentages apply only to this configured frontend report, not the original Phase 3 pipeline or the whole research project.
- Synthetic generation makes no API request and reads no research file. Its output is checked for internal references, counts, hashes and local-only diagram paths.

Tools: Node 20.20.2, npm 10.8.2, Vite 8.0.16, Vitest 4.1.8. The lockfile was not upgraded. The build reports that its browser-compatibility database is seven months old; this is a warning, not a failed build or a claim of tested browser support.

## Not completed

No browser surface was available on the connected executor for manual visual or real-browser interaction testing. The temporary loopback preview process was stopped. UI behavior was verified in jsdom tests, which do not prove visual layout, real downloads, keyboard accessibility or cross-browser behavior.

No original-dataset QC, real scientific counts, external taxonomy verification, full integration-pipeline run, deployment, dependency-vulnerability audit or complete legal/ownership audit was performed. `node_modules`, `dist`, coverage output and test caches are not part of the source artifact. The owner authorized this website-source/synthetic-data publication. No reuse license has been granted for the project code; data-acquisition and integration pipelines are outside this release.

## 2026-11-15 publication fixes

The four review findings were fixed only in the independent `PICASSO-Taxonomy-Review` checkout. The original Phase 3 repository, demo submodule and research data were not modified. The synthetic fixtures and dependency lockfile are unchanged.

- Mapping imports validate required/duplicate headers, quoted-field closure, actions and source identifiers before replacing the draft. Invalid files and read failures preserve existing work; header-only exports still round-trip as all-keep drafts.
- The active Edit draft button no longer resets work. Replacing a changed draft from history requires confirmation; cancel resumes the existing draft.
- Data loading checks HTTP status, catches request/parse failures, offers Retry and aborts requests when their effect is cleaned up. Tests cover every data endpoint, successful retry and StrictMode cleanup.
- Vite emits full bundled-package notices in `dist/THIRD_PARTY_LICENSES.md`, with references in JavaScript chunks. The build includes two artifact checks for package versions, full license text and notice references.
- `npm run coverage`: **80 tests passed in 10 files** (25 added frontend tests). Configured coverage: statements **94.08% (700/744)**, branches **81.21% (644/793)**, functions **94.19% (292/310)**, lines **94.40% (607/643)**. This runs the full frontend test suite, including CSV export/import round-trip coverage.
- `npm run test:fixtures`: **6 passed**.
- `npm run build`: **passed**, including TypeScript, synthetic asset checks, production bundling and **2 passing build-notice tests**. Negative tests reproduced the draft reset, malformed import, failed loading and missing notices before the fixes.
- `git diff --check`: passed.

The same-day pre-fix `npm audit` reported 12 affected package entries (6 high, 5 moderate, 1 low). Dependency upgrades were outside these four fixes, so those findings were outstanding at this checkpoint; the following dependency refresh resolves them. These were not a claim of 12 exploitable vulnerabilities in the static website. No real-browser surface was available when rechecked, and no live deployment or complete legal audit was performed. These fixes do not change the project's source-showcase/no-reuse-license boundary.

## 2026-11-15 dependency security refresh

Scope: only this independent repository's dependency declarations, lockfile and dependency documentation. Application code, synthetic public fixtures, Node/npm installations and the original Phase 3 repositories/data are unchanged. Direct dependencies stay within their existing major versions. No audit suppression, dependency overrides, `--force` or `--legacy-peer-deps` was used.

| Affected package | Previous locked version | Updated locked version |
| --- | --- | --- |
| `vite` | 8.0.16 | 8.1.6 |
| `vitest` | 4.1.8 | 4.1.12 |
| `@vitest/coverage-v8` | 4.1.8 | 4.1.12 |
| `@vitest/mocker` | 4.1.8 | 4.1.12 |
| `postcss` | 8.5.15 | 8.5.23 |
| `@babel/core` | 7.29.0 | 7.29.13 |
| `baseline-browser-mapping` | 2.10.27 | 2.11.37 |
| `browserslist` | 4.28.2 | 4.29.5 |
| `form-data` | 4.0.5 | 4.0.6 |
| `nanoid` | 3.3.12 | 3.3.20 |
| `postcss-selector-parser` | 6.1.2 | 6.1.6 |
| `source-map-js` | 1.2.1 | 1.2.2 |

`npm audit fix --dry-run` failed inside npm 10.8.2's peer-resolution code (`Cannot read properties of null (reading 'edgesOut')`). Explicit Vite/Vitest/coverage/PostCSS version updates followed by targeted transitive updates avoided that failure without changing the installed package manager. Vite 8.1.6 and Vitest 4.1.12 satisfy the project's Node 20 runtime constraints and the relevant [Vite advisory](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22) and [Vitest advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8) patched-version requirements.

Verification after `npm ci --ignore-scripts --no-audit --no-fund` on Node 20.20.2 / npm 10.8.2:

- `npm audit --json --package-lock-only`: **0 vulnerabilities**, down from 12 affected package entries (6 high, 5 moderate, 1 low).
- `npm audit --json` and `npm audit --omit=dev --json`: **0 vulnerabilities** in both scopes, exit code 0.
- `npm ls --all --parseable`: passed with no invalid dependency/peer tree reported.
- `npm run coverage`: **80 tests passed in 10 files**. Coverage unchanged: statements **94.08% (700/744)**, branches **81.21% (644/793)**, functions **94.19% (292/310)**, lines **94.40% (607/643)**.
- `npm run test:fixtures`: **6 passed**.
- `npm run build`: passed with Vite 8.1.6, TypeScript, synthetic asset checks and **2 passing license-artifact tests**. The stale browser-compatibility-data warning no longer appears.
- `docs/DEPENDENCY_METADATA.json` regenerated and checked against all **294** locked package entries, including resolved URLs, integrity hashes and installed versions where available. Platform-specific packages not installed locally remain marked as such; missing license declarations are not inferred.
- `git diff --check`: passed. No application source, public fixture, build configuration or Node version-file changes.

The audit result is a dated check of the npm advisory database, not proof that no undisclosed vulnerability exists. The retained `whatwg-encoding` deprecation warning is not an npm audit vulnerability; replacing jsdom solely to remove it was outside this security update. Real-browser and live-deployment verification remain unperformed.

## 2026-11-15 independent Vercel deployment preparation

The owner authorized a separate Vercel project for `mm1719/PICASSO-Taxonomy-Review`, connected to its `main` branch. The original Phase 3 project, repository and research data are outside this deployment scope.

- Pinned `engines.node` to `24.x` and `.nvmrc` to `24.22.3`. This matches the original site's configured Node major without changing that site. Vercel's [version selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) would otherwise resolve the previous unbounded minimum to a newer major.
- Made the Vite preset, `npm ci --ignore-scripts`, `npm run build`, and `dist` output explicit in `vercel.json`; retained the existing SPA rewrite.
- Downloaded Node 24.22.3 into an isolated temporary tools directory and verified its SHA-256 against the official Node release checksum. No global Node installation was changed.
- Fresh install and `npm run coverage` on Node 24.22.3 / npm 11.19.1: **80 tests passed in 10 files**. Coverage unchanged: statements **94.08%**, branches **81.21%**, functions **94.19%**, lines **94.40%**.
- `npm run test:fixtures`: **6 passed**. `npm run build`: passed, including synthetic asset checks and **2 build-notice tests**. `npm audit --json`: **0 vulnerabilities**.
- Application source, synthetic fixtures and locked dependency versions are unchanged. Only the root package's Node engine metadata changed in the lockfile.

This checkpoint is local deployment preparation, not evidence of a live site or real-browser acceptance.

## 2026-11-15 independent deployment verification

- Public URL: <https://picasso-taxonomy-review.vercel.app>.
- Vercel project: `picasso-taxonomy-review` (`prj_eRQvawqrloeeipZRep8zutyE0bwD`), in `masonys-projects`. Git connection: `mm1719/PICASSO-Taxonomy-Review`, production branch `main`, repository-root build, Node `24.x`.
- First production deployment: `dpl_21JCPdVbV7XtxUhmDcSAPsxDM4VG`, **READY**, from commit `0e1e9f27a72dabd851da3bd29cba7e3a8defa919`. Build logs confirm the intended GitHub repository, branch and commit, a clean lockfile install, synthetic-data validation, TypeScript/Vite build and both license-artifact tests. The install reported **0 vulnerabilities**.
- Anonymous HTTP checks for `/`, `/valid`, `/invalid` and `/mapping`: **200**, with SHA-256 equal to the local built index. No login, share token or protection bypass was used.
- All **16** runtime/notice files, including the seven JSON/CSV assets, five synthetic diagrams, HTML, CSS, JavaScript and license notice: **200** with exact SHA-256 equality to the local Node 24 build. JSON responses also parsed successfully.
- An initial all-file check also requested the non-runtime JavaScript source map and received **403**. The subsequent runtime-file check excluded `.map` files; this was not a missing runtime asset. Source-map access was not relaxed or bypassed. The rest of the deployment retained Vercel's default protection settings.
- The canonical domain is verified and assigned to the new project and deployment. An explicit add-domain request returned **409** because Vercel had already assigned it during deployment; read-only project-domain and alias lookups confirmed the intended ownership. No domain was moved from another project.
- The original Phase 3 Vercel project's metadata, domains, configuration timestamp and production deployment ID were byte-for-byte unchanged between the before/after API responses. Neither original repository nor research data was edited or rebuilt.

Remaining limits: the connected browser host was still unavailable when checked. Real-browser CSV file selection/download, draft prompts, visual layout, accessibility and cross-browser behavior remain unverified; their existing jsdom tests passed. No alternative browser was installed or launched. The platform's `cache-dir` npm warning and the existing `whatwg-encoding` deprecation warning did not fail the build. This is a hosted synthetic demonstration, not a research-data or code-license release.

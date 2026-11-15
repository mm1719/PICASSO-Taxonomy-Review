# Validation record

Prepared 2026-11-14 for the isolated synthetic dashboard candidate. The original research application and data were not modified.

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

The same-day pre-fix `npm audit` reported 12 affected package entries (6 high, 5 moderate, 1 low). Dependency upgrades were outside these four fixes, so those findings remain outstanding; they are not a claim of 12 exploitable vulnerabilities in the static website. No real-browser surface was available when rechecked, and no live deployment or complete legal audit was performed. These fixes do not change the project's source-showcase/no-reuse-license boundary.

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

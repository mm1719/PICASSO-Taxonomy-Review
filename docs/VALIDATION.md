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

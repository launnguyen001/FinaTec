# FinaTec — Third-Party Notices

**Project owner for original FinaTec materials:** NGUYEN NGOC LAU  
**Inventory source:** package-lock.json (npm lockfileVersion 3) on branch main  
**Inventory snapshot:** 2026-11-07  
**Purpose:** identify third-party npm packages and their license identifiers; this file does not replace upstream license texts or notices.

> IMPORTANT: The inventory below is generated from package-lock.json metadata. It is a dependency-tree snapshot, not proof that every listed package is shipped in a particular binary. Optional/platform-specific packages may not be present in every build. Conversely, native Gradle/Maven, CocoaPods, Xcode, Android SDK/NDK, system libraries, bundled source, fonts, images, and other build-time/runtime components may not be represented in this npm inventory. Before distributing an APK/IPA, generate and review a binary-level SBOM and verify the exact upstream LICENSE and NOTICE files for every shipped component.

## 1. Inventory summary

| Metric | Count |
|---|---:|
| Total package entries | 1474 |
| Entries marked production/runtime (dev=false) | 1006 |
| Entries marked development-only (dev=true) | 468 |
| Entries without a declared license field in lockfile metadata | 0 |

### License identifiers by package-entry count

| License identifier as declared by package metadata | Entries | Reference |
| (BSD-3-Clause OR GPL-2.0) | 1 | [License text / terms](https://spdx.org/licenses/BSD-3-Clause.html) |
| (MIT OR Apache-2.0) | 1 | [License text / terms](https://spdx.org/licenses/Apache-2.0.html) |
| (MIT OR CC0-1.0) | 2 | [License text / terms](https://spdx.org/licenses/MIT.html) |
| 0BSD | 1 | [License text / terms](https://opensource.org/license/0bsd/) |
| Apache-2.0 | 25 | [License text / terms](https://www.apache.org/licenses/LICENSE-2.0) |
| BlueOak-1.0.0 | 15 | [License text / terms](https://blueoakcouncil.org/license/1.0.0) |
| BSD-2-Clause | 12 | [License text / terms](https://opensource.org/license/bsd-2-clause/) |
| BSD-3-Clause | 34 | [License text / terms](https://opensource.org/license/bsd-3-clause/) |
| CC-BY-4.0 | 1 | [License text / terms](https://creativecommons.org/licenses/by/4.0/) |
| ISC | 98 | [License text / terms](https://opensource.org/license/isc-license-txt/) |
| MIT | 1268 | [License text / terms](https://opensource.org/license/mit/) |
| MIT-0 | 1 | [License text / terms](https://spdx.org/licenses/MIT-0.html) |
| MPL-2.0 | 12 | [License text / terms](https://www.mozilla.org/MPL/2.0/) |
| Python-2.0 | 1 | [License text / terms](https://www.python.org/download/releases/2.0/license/) |
| Unlicense | 2 | [License text / terms](https://unlicense.org/) |

## 2. Direct production dependencies

| Package | Resolved version | Declared license |
|---|---:|---|
| drizzle-orm | 0.45.4 | Apache-2.0 |
| expo | 58.0.22 | MIT |
| expo-asset | 58.0.19 | MIT |
| expo-background-task | 58.0.12 | MIT |
| expo-constants | 58.0.14 | MIT |
| expo-crypto | 58.0.7 | MIT |
| expo-dev-client | 58.0.18 | MIT |
| expo-file-system | 58.0.13 | MIT |
| expo-linking | 58.0.15 | MIT |
| expo-router | 58.0.29 | MIT |
| expo-secure-store | 58.0.2 | MIT |
| expo-sqlite | 58.0.15 | MIT |
| expo-status-bar | 58.0.4 | MIT |
| expo-system-ui | 58.0.7 | MIT |
| expo-task-manager | 58.0.13 | MIT |
| react | 19.3.0 | MIT |
| react-dom | 19.3.0 | MIT |
| react-native | 0.88.1 | MIT |
| react-native-safe-area-context | 5.10.1 | MIT |
| react-native-screens | 4.30.1 | MIT |
| react-native-web | 0.21.4 | MIT |

## 3. Packages requiring focused license review

These entries are not automatically incompatible with a proprietary application. They require checking the actual distributed files, exact upstream notices, and whether any source modifications or bundled files trigger additional obligations.

| Package entry | Version | Declared license | Review point |
|---|---:|---|---|
| argparse | 2.0.1 | Python-2.0 | Retain the upstream license/copyright notices and verify package distribution terms. |
| caniuse-lite | 1.0.30001820 | CC-BY-4.0 | Attribution and indication of changes may be required for adapted material; verify whether the package's relevant data/content is actually redistributed. |
| lightningcss | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-android-arm64 | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-darwin-x64 | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-freebsd-x64 | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-linux-arm-gnueabihf | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-linux-arm64-gnu | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-linux-arm64-musl | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-linux-x64-gnu | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-linux-x64-musl | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-win32-arm64-msvc | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 | MPL-2.0 file-level copyleft: if MPL-covered source files are modified and distributed, provide those covered source files and preserve MPL rights/notices. |
| node-forge | 1.4.2 | (BSD-3-Clause OR GPL-2.0) | Dual-license expression: verify which alternative applies to the exact package release and retain its corresponding notices. |

## 4. Full npm dependency inventory

Each row is a package entry from package-lock.json. The dependency path is included to distinguish nested copies and multiple versions of the same package.

### (BSD-3-Clause OR GPL-2.0) (1 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| node-forge | 1.4.2 | node_modules/node-forge | production/runtime |

### (MIT OR Apache-2.0) (1 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| fb-dotslash | 0.5.8 | node_modules/fb-dotslash | production/runtime |

### (MIT OR CC0-1.0) (2 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| ansi-escapes/node_modules/type-fest | 0.21.3 | node_modules/ansi-escapes/node_modules/type-fest | production/runtime |
| type-fest | 0.7.1 | node_modules/type-fest | production/runtime |

### 0BSD (1 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| jsc-safe-url | 0.2.4 | node_modules/jsc-safe-url | production/runtime |

### Apache-2.0 (25 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| @drizzle-team/brocli | 0.10.2 | node_modules/@drizzle-team/brocli | development |
| @eslint-community/eslint-utils/node_modules/eslint-visitor-keys | 3.4.3 | node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys | development |
| @eslint/config-array | 0.21.2 | node_modules/@eslint/config-array | development |
| @eslint/config-helpers | 0.4.2 | node_modules/@eslint/config-helpers | development |
| @eslint/core | 0.17.0 | node_modules/@eslint/core | development |
| @eslint/object-schema | 2.1.7 | node_modules/@eslint/object-schema | development |
| @eslint/plugin-kit | 0.4.1 | node_modules/@eslint/plugin-kit | development |
| @humanfs/core | 0.19.2 | node_modules/@humanfs/core | development |
| @humanfs/node | 0.16.8 | node_modules/@humanfs/node | development |
| @humanfs/types | 0.15.0 | node_modules/@humanfs/types | development |
| @humanwhocodes/module-importer | 1.0.1 | node_modules/@humanwhocodes/module-importer | development |
| @humanwhocodes/retry | 0.4.3 | node_modules/@humanwhocodes/retry | development |
| baseline-browser-mapping | 2.11.34 | node_modules/baseline-browser-mapping | production/runtime |
| detect-libc | 2.1.2 | node_modules/detect-libc | production/runtime |
| doctrine | 2.1.0 | node_modules/doctrine | development |
| drizzle-orm | 0.45.4 | node_modules/drizzle-orm | production/runtime |
| eslint-visitor-keys | 5.0.1 | node_modules/eslint-visitor-keys | development |
| eslint/node_modules/eslint-visitor-keys | 4.2.1 | node_modules/eslint/node_modules/eslint-visitor-keys | development |
| espree/node_modules/eslint-visitor-keys | 4.2.1 | node_modules/espree/node_modules/eslint-visitor-keys | development |
| exponential-backoff | 3.1.3 | node_modules/exponential-backoff | production/runtime |
| human-signals | 2.1.0 | node_modules/human-signals | production/runtime |
| typescript | 6.0.3 | node_modules/typescript | production/runtime |
| walker | 1.0.8 | node_modules/walker | production/runtime |
| xcode | 4.0.0 | node_modules/xcode | production/runtime |
| xml-name-validator | 5.0.0 | node_modules/xml-name-validator | development |

### BlueOak-1.0.0 (15 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| @jest/core/node_modules/path-scurry | 1.11.1 | node_modules/@jest/core/node_modules/path-scurry | production/runtime |
| @jest/reporters/node_modules/path-scurry | 1.11.1 | node_modules/@jest/reporters/node_modules/path-scurry | production/runtime |
| glob | 13.0.6 | node_modules/glob | production/runtime |
| jackspeak | 3.4.3 | node_modules/jackspeak | production/runtime |
| jest-config/node_modules/path-scurry | 1.11.1 | node_modules/jest-config/node_modules/path-scurry | production/runtime |
| jest-expo/node_modules/path-scurry | 1.11.1 | node_modules/jest-expo/node_modules/path-scurry | development |
| jest-runner/node_modules/path-scurry | 1.11.1 | node_modules/jest-runner/node_modules/path-scurry | production/runtime |
| jest-runtime/node_modules/path-scurry | 1.11.1 | node_modules/jest-runtime/node_modules/path-scurry | production/runtime |
| jest-snapshot/node_modules/path-scurry | 1.11.1 | node_modules/jest-snapshot/node_modules/path-scurry | production/runtime |
| minimatch | 10.2.6 | node_modules/minimatch | production/runtime |
| minipass | 7.1.3 | node_modules/minipass | production/runtime |
| package-json-from-dist | 1.0.1 | node_modules/package-json-from-dist | production/runtime |
| path-scurry | 2.0.2 | node_modules/path-scurry | production/runtime |
| path-scurry/node_modules/lru-cache | 11.5.3 | node_modules/path-scurry/node_modules/lru-cache | production/runtime |
| sax | 1.6.1 | node_modules/sax | production/runtime |

### BSD-2-Clause (12 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| entities | 6.0.1 | node_modules/entities | development |
| eslint-scope | 8.4.0 | node_modules/eslint-scope | development |
| espree | 10.4.0 | node_modules/espree | development |
| esprima | 4.0.1 | node_modules/esprima | production/runtime |
| esrecurse | 4.3.0 | node_modules/esrecurse | development |
| estraverse | 5.3.0 | node_modules/estraverse | development |
| esutils | 2.0.3 | node_modules/esutils | development |
| node-fetch/node_modules/webidl-conversions | 3.0.1 | node_modules/node-fetch/node_modules/webidl-conversions | production/runtime |
| regjsparser | 0.13.4 | node_modules/regjsparser | production/runtime |
| terser | 5.51.2 | node_modules/terser | production/runtime |
| uri-js | 4.4.1 | node_modules/uri-js | development |
| webidl-conversions | 7.0.0 | node_modules/webidl-conversions | development |

### BSD-3-Clause (34 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| @jest/core/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/@jest/core/node_modules/babel-plugin-istanbul | production/runtime |
| @jest/core/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/@jest/core/node_modules/istanbul-lib-instrument | production/runtime |
| @jest/reporters/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/@jest/reporters/node_modules/babel-plugin-istanbul | production/runtime |
| @jest/reporters/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/@jest/reporters/node_modules/istanbul-lib-instrument | production/runtime |
| @react-native/debugger-frontend | 0.88.1 | node_modules/@react-native/debugger-frontend | production/runtime |
| @sinonjs/commons | 3.0.1 | node_modules/@sinonjs/commons | production/runtime |
| @sinonjs/fake-timers | 15.4.0 | node_modules/@sinonjs/fake-timers | production/runtime |
| babel-plugin-istanbul | 6.1.1 | node_modules/babel-plugin-istanbul | development |
| esquery | 1.7.0 | node_modules/esquery | development |
| hyphenate-style-name | 1.1.0 | node_modules/hyphenate-style-name | production/runtime |
| istanbul-lib-coverage | 3.2.2 | node_modules/istanbul-lib-coverage | production/runtime |
| istanbul-lib-instrument | 5.2.1 | node_modules/istanbul-lib-instrument | development |
| istanbul-lib-report | 3.0.1 | node_modules/istanbul-lib-report | production/runtime |
| istanbul-lib-source-maps | 5.0.6 | node_modules/istanbul-lib-source-maps | production/runtime |
| istanbul-reports | 3.2.0 | node_modules/istanbul-reports | production/runtime |
| jest-config/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/jest-config/node_modules/babel-plugin-istanbul | production/runtime |
| jest-config/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/jest-config/node_modules/istanbul-lib-instrument | production/runtime |
| jest-environment-node/node_modules/@sinonjs/fake-timers | 10.3.0 | node_modules/jest-environment-node/node_modules/@sinonjs/fake-timers | development |
| jest-expo/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/jest-expo/node_modules/babel-plugin-istanbul | development |
| jest-expo/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/jest-expo/node_modules/istanbul-lib-instrument | development |
| jest-runner/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/jest-runner/node_modules/babel-plugin-istanbul | production/runtime |
| jest-runner/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/jest-runner/node_modules/istanbul-lib-instrument | production/runtime |
| jest-runtime/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/jest-runtime/node_modules/babel-plugin-istanbul | production/runtime |
| jest-runtime/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/jest-runtime/node_modules/istanbul-lib-instrument | production/runtime |
| jest-snapshot/node_modules/babel-plugin-istanbul | 8.0.0 | node_modules/jest-snapshot/node_modules/babel-plugin-istanbul | production/runtime |
| jest-snapshot/node_modules/istanbul-lib-instrument | 6.0.3 | node_modules/jest-snapshot/node_modules/istanbul-lib-instrument | production/runtime |
| makeerror | 1.0.12 | node_modules/makeerror | production/runtime |
| source-map | 0.5.7 | node_modules/source-map | production/runtime |
| source-map-js | 1.2.2 | node_modules/source-map-js | production/runtime |
| source-map-support/node_modules/source-map | 0.6.1 | node_modules/source-map-support/node_modules/source-map | production/runtime |
| sprintf-js | 1.0.3 | node_modules/sprintf-js | production/runtime |
| stacktrace-gps/node_modules/source-map | 0.5.6 | node_modules/stacktrace-gps/node_modules/source-map | development |
| tmpl | 1.0.5 | node_modules/tmpl | production/runtime |
| tough-cookie | 5.1.2 | node_modules/tough-cookie | development |

### CC-BY-4.0 (1 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| caniuse-lite | 1.0.30001820 | node_modules/caniuse-lite | production/runtime |

### ISC (98 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| @asamuzakjp/css-color/node_modules/lru-cache | 10.4.3 | node_modules/@asamuzakjp/css-color/node_modules/lru-cache | development |
| @babel/core/node_modules/semver | 6.3.1 | node_modules/@babel/core/node_modules/semver | production/runtime |
| @babel/helper-compilation-targets/node_modules/semver | 6.3.1 | node_modules/@babel/helper-compilation-targets/node_modules/semver | production/runtime |
| @babel/helper-create-class-features-plugin/node_modules/semver | 6.3.1 | node_modules/@babel/helper-create-class-features-plugin/node_modules/semver | production/runtime |
| @babel/helper-create-regexp-features-plugin/node_modules/semver | 6.3.1 | node_modules/@babel/helper-create-regexp-features-plugin/node_modules/semver | production/runtime |
| @babel/plugin-transform-runtime/node_modules/semver | 6.3.1 | node_modules/@babel/plugin-transform-runtime/node_modules/semver | production/runtime |
| @eslint/config-array/node_modules/minimatch | 3.1.5 | node_modules/@eslint/config-array/node_modules/minimatch | development |
| @eslint/eslintrc/node_modules/minimatch | 3.1.5 | node_modules/@eslint/eslintrc/node_modules/minimatch | development |
| @isaacs/cliui | 8.0.2 | node_modules/@isaacs/cliui | production/runtime |
| @isaacs/ttlcache | 1.4.1 | node_modules/@isaacs/ttlcache | production/runtime |
| @istanbuljs/load-nyc-config | 1.1.0 | node_modules/@istanbuljs/load-nyc-config | production/runtime |
| @jest/core/node_modules/glob | 10.5.0 | node_modules/@jest/core/node_modules/glob | production/runtime |
| @jest/core/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/@jest/core/node_modules/glob/node_modules/minimatch | production/runtime |
| @jest/core/node_modules/lru-cache | 10.4.3 | node_modules/@jest/core/node_modules/lru-cache | production/runtime |
| @jest/core/node_modules/signal-exit | 4.1.0 | node_modules/@jest/core/node_modules/signal-exit | production/runtime |
| @jest/core/node_modules/test-exclude | 7.0.2 | node_modules/@jest/core/node_modules/test-exclude | production/runtime |
| @jest/core/node_modules/write-file-atomic | 5.0.1 | node_modules/@jest/core/node_modules/write-file-atomic | production/runtime |
| @jest/reporters/node_modules/lru-cache | 10.4.3 | node_modules/@jest/reporters/node_modules/lru-cache | production/runtime |
| @jest/reporters/node_modules/signal-exit | 4.1.0 | node_modules/@jest/reporters/node_modules/signal-exit | production/runtime |
| @jest/reporters/node_modules/test-exclude | 7.0.2 | node_modules/@jest/reporters/node_modules/test-exclude | production/runtime |
| @jest/reporters/node_modules/test-exclude/node_modules/glob | 10.5.0 | node_modules/@jest/reporters/node_modules/test-exclude/node_modules/glob | production/runtime |
| @jest/reporters/node_modules/test-exclude/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/@jest/reporters/node_modules/test-exclude/node_modules/glob/node_modules/minimatch | production/runtime |
| @jest/reporters/node_modules/write-file-atomic | 5.0.1 | node_modules/@jest/reporters/node_modules/write-file-atomic | production/runtime |
| @ungap/structured-clone | 1.4.0 | node_modules/@ungap/structured-clone | production/runtime |
| anymatch | 3.1.3 | node_modules/anymatch | production/runtime |
| babel-plugin-polyfill-corejs2/node_modules/semver | 6.3.1 | node_modules/babel-plugin-polyfill-corejs2/node_modules/semver | production/runtime |
| cliui | 8.0.1 | node_modules/cliui | production/runtime |
| electron-to-chromium | 1.5.472 | node_modules/electron-to-chromium | production/runtime |
| eslint-import-resolver-typescript | 3.10.1 | node_modules/eslint-import-resolver-typescript | development |
| eslint-plugin-import/node_modules/minimatch | 3.1.5 | node_modules/eslint-plugin-import/node_modules/minimatch | development |
| eslint-plugin-import/node_modules/semver | 6.3.1 | node_modules/eslint-plugin-import/node_modules/semver | development |
| eslint-plugin-react/node_modules/minimatch | 3.1.5 | node_modules/eslint-plugin-react/node_modules/minimatch | development |
| eslint-plugin-react/node_modules/semver | 6.3.1 | node_modules/eslint-plugin-react/node_modules/semver | development |
| eslint/node_modules/minimatch | 3.1.5 | node_modules/eslint/node_modules/minimatch | development |
| flatted | 3.4.4 | node_modules/flatted | development |
| foreground-child | 3.3.1 | node_modules/foreground-child | production/runtime |
| foreground-child/node_modules/signal-exit | 4.1.0 | node_modules/foreground-child/node_modules/signal-exit | production/runtime |
| fs.realpath | 1.0.0 | node_modules/fs.realpath | development |
| get-caller-file | 2.0.5 | node_modules/get-caller-file | production/runtime |
| glob-parent | 6.0.2 | node_modules/glob-parent | development |
| graceful-fs | 4.2.11 | node_modules/graceful-fs | production/runtime |
| hosted-git-info | 7.0.2 | node_modules/hosted-git-info | production/runtime |
| hosted-git-info/node_modules/lru-cache | 10.4.3 | node_modules/hosted-git-info/node_modules/lru-cache | production/runtime |
| inflight | 1.0.6 | node_modules/inflight | development |
| inherits | 2.0.4 | node_modules/inherits | production/runtime |
| isexe | 2.0.0 | node_modules/isexe | production/runtime |
| istanbul-lib-instrument/node_modules/semver | 6.3.1 | node_modules/istanbul-lib-instrument/node_modules/semver | development |
| jest-config/node_modules/lru-cache | 10.4.3 | node_modules/jest-config/node_modules/lru-cache | production/runtime |
| jest-config/node_modules/signal-exit | 4.1.0 | node_modules/jest-config/node_modules/signal-exit | production/runtime |
| jest-config/node_modules/test-exclude | 7.0.2 | node_modules/jest-config/node_modules/test-exclude | production/runtime |
| jest-config/node_modules/test-exclude/node_modules/glob | 10.5.0 | node_modules/jest-config/node_modules/test-exclude/node_modules/glob | production/runtime |
| jest-config/node_modules/test-exclude/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/jest-config/node_modules/test-exclude/node_modules/glob/node_modules/minimatch | production/runtime |
| jest-config/node_modules/write-file-atomic | 5.0.1 | node_modules/jest-config/node_modules/write-file-atomic | production/runtime |
| jest-expo/node_modules/glob | 10.5.0 | node_modules/jest-expo/node_modules/glob | development |
| jest-expo/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/jest-expo/node_modules/glob/node_modules/minimatch | development |
| jest-expo/node_modules/lru-cache | 10.4.3 | node_modules/jest-expo/node_modules/lru-cache | development |
| jest-expo/node_modules/signal-exit | 4.1.0 | node_modules/jest-expo/node_modules/signal-exit | development |
| jest-expo/node_modules/test-exclude | 7.0.2 | node_modules/jest-expo/node_modules/test-exclude | development |
| jest-expo/node_modules/write-file-atomic | 5.0.1 | node_modules/jest-expo/node_modules/write-file-atomic | development |
| jest-runner/node_modules/glob | 10.5.0 | node_modules/jest-runner/node_modules/glob | production/runtime |
| jest-runner/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/jest-runner/node_modules/glob/node_modules/minimatch | production/runtime |
| jest-runner/node_modules/lru-cache | 10.4.3 | node_modules/jest-runner/node_modules/lru-cache | production/runtime |
| jest-runner/node_modules/signal-exit | 4.1.0 | node_modules/jest-runner/node_modules/signal-exit | production/runtime |
| jest-runner/node_modules/test-exclude | 7.0.2 | node_modules/jest-runner/node_modules/test-exclude | production/runtime |
| jest-runner/node_modules/write-file-atomic | 5.0.1 | node_modules/jest-runner/node_modules/write-file-atomic | production/runtime |
| jest-runtime/node_modules/lru-cache | 10.4.3 | node_modules/jest-runtime/node_modules/lru-cache | production/runtime |
| jest-runtime/node_modules/signal-exit | 4.1.0 | node_modules/jest-runtime/node_modules/signal-exit | production/runtime |
| jest-runtime/node_modules/test-exclude | 7.0.2 | node_modules/jest-runtime/node_modules/test-exclude | production/runtime |
| jest-runtime/node_modules/test-exclude/node_modules/glob | 10.5.0 | node_modules/jest-runtime/node_modules/test-exclude/node_modules/glob | production/runtime |
| jest-runtime/node_modules/test-exclude/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/jest-runtime/node_modules/test-exclude/node_modules/glob/node_modules/minimatch | production/runtime |
| jest-runtime/node_modules/write-file-atomic | 5.0.1 | node_modules/jest-runtime/node_modules/write-file-atomic | production/runtime |
| jest-snapshot/node_modules/glob | 10.5.0 | node_modules/jest-snapshot/node_modules/glob | production/runtime |
| jest-snapshot/node_modules/glob/node_modules/minimatch | 9.0.9 | node_modules/jest-snapshot/node_modules/glob/node_modules/minimatch | production/runtime |
| jest-snapshot/node_modules/lru-cache | 10.4.3 | node_modules/jest-snapshot/node_modules/lru-cache | production/runtime |
| jest-snapshot/node_modules/signal-exit | 4.1.0 | node_modules/jest-snapshot/node_modules/signal-exit | production/runtime |
| jest-snapshot/node_modules/test-exclude | 7.0.2 | node_modules/jest-snapshot/node_modules/test-exclude | production/runtime |
| jest-snapshot/node_modules/write-file-atomic | 5.0.1 | node_modules/jest-snapshot/node_modules/write-file-atomic | production/runtime |
| lru-cache | 5.1.1 | node_modules/lru-cache | production/runtime |
| node-exports-info/node_modules/semver | 6.3.1 | node_modules/node-exports-info/node_modules/semver | development |
| npm-package-arg | 11.0.3 | node_modules/npm-package-arg | production/runtime |
| once | 1.4.0 | node_modules/once | development |
| picocolors | 1.1.1 | node_modules/picocolors | production/runtime |
| proc-log | 4.2.0 | node_modules/proc-log | production/runtime |
| saxes | 6.0.0 | node_modules/saxes | development |
| semver | 7.8.5 | node_modules/semver | production/runtime |
| setprototypeof | 1.2.0 | node_modules/setprototypeof | production/runtime |
| signal-exit | 3.0.7 | node_modules/signal-exit | production/runtime |
| test-exclude | 6.0.0 | node_modules/test-exclude | development |
| test-exclude/node_modules/glob | 7.2.3 | node_modules/test-exclude/node_modules/glob | development |
| test-exclude/node_modules/minimatch | 3.1.5 | node_modules/test-exclude/node_modules/minimatch | development |
| v8-to-istanbul | 9.3.0 | node_modules/v8-to-istanbul | production/runtime |
| validate-npm-package-name | 5.0.1 | node_modules/validate-npm-package-name | production/runtime |
| which | 2.0.2 | node_modules/which | production/runtime |
| wrappy | 1.0.2 | node_modules/wrappy | development |
| write-file-atomic | 4.0.2 | node_modules/write-file-atomic | development |
| y18n | 5.0.8 | node_modules/y18n | production/runtime |
| yallist | 3.1.1 | node_modules/yallist | production/runtime |
| yargs-parser | 21.1.1 | node_modules/yargs-parser | production/runtime |

### MIT (1268 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| @asamuzakjp/css-color | 3.2.0 | node_modules/@asamuzakjp/css-color | development |
| @babel/code-frame | 7.29.7 | node_modules/@babel/code-frame | production/runtime |
| @babel/compat-data | 7.29.7 | node_modules/@babel/compat-data | production/runtime |
| @babel/core | 7.29.7 | node_modules/@babel/core | production/runtime |
| @babel/generator | 7.29.12 | node_modules/@babel/generator | production/runtime |
| @babel/helper-annotate-as-pure | 7.29.7 | node_modules/@babel/helper-annotate-as-pure | production/runtime |
| @babel/helper-compilation-targets | 7.29.7 | node_modules/@babel/helper-compilation-targets | production/runtime |
| @babel/helper-create-class-features-plugin | 7.29.12 | node_modules/@babel/helper-create-class-features-plugin | production/runtime |
| @babel/helper-create-regexp-features-plugin | 7.29.10 | node_modules/@babel/helper-create-regexp-features-plugin | production/runtime |
| @babel/helper-define-polyfill-provider | 0.6.8 | node_modules/@babel/helper-define-polyfill-provider | production/runtime |
| @babel/helper-globals | 7.29.7 | node_modules/@babel/helper-globals | production/runtime |
| @babel/helper-member-expression-to-functions | 7.29.7 | node_modules/@babel/helper-member-expression-to-functions | production/runtime |
| @babel/helper-module-imports | 7.29.7 | node_modules/@babel/helper-module-imports | production/runtime |
| @babel/helper-module-transforms | 7.29.7 | node_modules/@babel/helper-module-transforms | production/runtime |
| @babel/helper-optimise-call-expression | 7.29.7 | node_modules/@babel/helper-optimise-call-expression | production/runtime |
| @babel/helper-plugin-utils | 7.29.7 | node_modules/@babel/helper-plugin-utils | production/runtime |
| @babel/helper-remap-async-to-generator | 7.29.7 | node_modules/@babel/helper-remap-async-to-generator | production/runtime |
| @babel/helper-replace-supers | 7.29.7 | node_modules/@babel/helper-replace-supers | production/runtime |
| @babel/helper-skip-transparent-expression-wrappers | 7.29.7 | node_modules/@babel/helper-skip-transparent-expression-wrappers | production/runtime |
| @babel/helper-string-parser | 7.29.11 | node_modules/@babel/helper-string-parser | production/runtime |
| @babel/helper-validator-identifier | 7.29.7 | node_modules/@babel/helper-validator-identifier | production/runtime |
| @babel/helper-validator-option | 7.29.7 | node_modules/@babel/helper-validator-option | production/runtime |
| @babel/helper-wrap-function | 7.29.7 | node_modules/@babel/helper-wrap-function | production/runtime |
| @babel/helpers | 7.29.10 | node_modules/@babel/helpers | production/runtime |
| @babel/parser | 7.29.12 | node_modules/@babel/parser | production/runtime |
| @babel/plugin-proposal-decorators | 7.29.7 | node_modules/@babel/plugin-proposal-decorators | production/runtime |
| @babel/plugin-proposal-export-default-from | 7.29.7 | node_modules/@babel/plugin-proposal-export-default-from | production/runtime |
| @babel/plugin-syntax-async-generators | 7.8.4 | node_modules/@babel/plugin-syntax-async-generators | production/runtime |
| @babel/plugin-syntax-bigint | 7.8.3 | node_modules/@babel/plugin-syntax-bigint | production/runtime |
| @babel/plugin-syntax-class-properties | 7.12.13 | node_modules/@babel/plugin-syntax-class-properties | production/runtime |
| @babel/plugin-syntax-class-static-block | 7.14.5 | node_modules/@babel/plugin-syntax-class-static-block | production/runtime |
| @babel/plugin-syntax-decorators | 7.29.7 | node_modules/@babel/plugin-syntax-decorators | production/runtime |
| @babel/plugin-syntax-dynamic-import | 7.8.3 | node_modules/@babel/plugin-syntax-dynamic-import | production/runtime |
| @babel/plugin-syntax-export-default-from | 7.29.7 | node_modules/@babel/plugin-syntax-export-default-from | production/runtime |
| @babel/plugin-syntax-flow | 7.29.7 | node_modules/@babel/plugin-syntax-flow | production/runtime |
| @babel/plugin-syntax-import-attributes | 7.29.7 | node_modules/@babel/plugin-syntax-import-attributes | production/runtime |
| @babel/plugin-syntax-import-meta | 7.10.4 | node_modules/@babel/plugin-syntax-import-meta | production/runtime |
| @babel/plugin-syntax-json-strings | 7.8.3 | node_modules/@babel/plugin-syntax-json-strings | production/runtime |
| @babel/plugin-syntax-jsx | 7.29.7 | node_modules/@babel/plugin-syntax-jsx | production/runtime |
| @babel/plugin-syntax-logical-assignment-operators | 7.10.4 | node_modules/@babel/plugin-syntax-logical-assignment-operators | production/runtime |
| @babel/plugin-syntax-nullish-coalescing-operator | 7.8.3 | node_modules/@babel/plugin-syntax-nullish-coalescing-operator | production/runtime |
| @babel/plugin-syntax-numeric-separator | 7.10.4 | node_modules/@babel/plugin-syntax-numeric-separator | production/runtime |
| @babel/plugin-syntax-object-rest-spread | 7.8.3 | node_modules/@babel/plugin-syntax-object-rest-spread | production/runtime |
| @babel/plugin-syntax-optional-catch-binding | 7.8.3 | node_modules/@babel/plugin-syntax-optional-catch-binding | production/runtime |
| @babel/plugin-syntax-optional-chaining | 7.8.3 | node_modules/@babel/plugin-syntax-optional-chaining | production/runtime |
| @babel/plugin-syntax-private-property-in-object | 7.14.5 | node_modules/@babel/plugin-syntax-private-property-in-object | production/runtime |
| @babel/plugin-syntax-top-level-await | 7.14.5 | node_modules/@babel/plugin-syntax-top-level-await | production/runtime |
| @babel/plugin-syntax-typescript | 7.29.7 | node_modules/@babel/plugin-syntax-typescript | production/runtime |
| @babel/plugin-transform-arrow-functions | 7.29.7 | node_modules/@babel/plugin-transform-arrow-functions | production/runtime |
| @babel/plugin-transform-async-generator-functions | 7.29.7 | node_modules/@babel/plugin-transform-async-generator-functions | production/runtime |
| @babel/plugin-transform-async-to-generator | 7.29.7 | node_modules/@babel/plugin-transform-async-to-generator | production/runtime |
| @babel/plugin-transform-block-scoping | 7.29.12 | node_modules/@babel/plugin-transform-block-scoping | production/runtime |
| @babel/plugin-transform-class-properties | 7.29.7 | node_modules/@babel/plugin-transform-class-properties | production/runtime |
| @babel/plugin-transform-class-static-block | 7.29.7 | node_modules/@babel/plugin-transform-class-static-block | production/runtime |
| @babel/plugin-transform-classes | 7.29.11 | node_modules/@babel/plugin-transform-classes | production/runtime |
| @babel/plugin-transform-destructuring | 7.29.7 | node_modules/@babel/plugin-transform-destructuring | production/runtime |
| @babel/plugin-transform-export-namespace-from | 7.29.7 | node_modules/@babel/plugin-transform-export-namespace-from | production/runtime |
| @babel/plugin-transform-flow-strip-types | 7.29.7 | node_modules/@babel/plugin-transform-flow-strip-types | production/runtime |
| @babel/plugin-transform-for-of | 7.29.7 | node_modules/@babel/plugin-transform-for-of | production/runtime |
| @babel/plugin-transform-logical-assignment-operators | 7.29.7 | node_modules/@babel/plugin-transform-logical-assignment-operators | production/runtime |
| @babel/plugin-transform-modules-commonjs | 7.29.7 | node_modules/@babel/plugin-transform-modules-commonjs | production/runtime |
| @babel/plugin-transform-named-capturing-groups-regex | 7.29.7 | node_modules/@babel/plugin-transform-named-capturing-groups-regex | production/runtime |
| @babel/plugin-transform-nullish-coalescing-operator | 7.29.7 | node_modules/@babel/plugin-transform-nullish-coalescing-operator | production/runtime |
| @babel/plugin-transform-object-rest-spread | 7.29.7 | node_modules/@babel/plugin-transform-object-rest-spread | production/runtime |
| @babel/plugin-transform-optional-catch-binding | 7.29.7 | node_modules/@babel/plugin-transform-optional-catch-binding | production/runtime |
| @babel/plugin-transform-optional-chaining | 7.29.7 | node_modules/@babel/plugin-transform-optional-chaining | production/runtime |
| @babel/plugin-transform-parameters | 7.29.7 | node_modules/@babel/plugin-transform-parameters | production/runtime |
| @babel/plugin-transform-private-methods | 7.29.7 | node_modules/@babel/plugin-transform-private-methods | production/runtime |
| @babel/plugin-transform-private-property-in-object | 7.29.7 | node_modules/@babel/plugin-transform-private-property-in-object | production/runtime |
| @babel/plugin-transform-react-display-name | 7.29.7 | node_modules/@babel/plugin-transform-react-display-name | production/runtime |
| @babel/plugin-transform-react-jsx | 7.29.7 | node_modules/@babel/plugin-transform-react-jsx | production/runtime |
| @babel/plugin-transform-react-jsx-development | 7.29.7 | node_modules/@babel/plugin-transform-react-jsx-development | production/runtime |
| @babel/plugin-transform-react-jsx-self | 7.29.7 | node_modules/@babel/plugin-transform-react-jsx-self | production/runtime |
| @babel/plugin-transform-react-jsx-source | 7.29.7 | node_modules/@babel/plugin-transform-react-jsx-source | production/runtime |
| @babel/plugin-transform-react-pure-annotations | 7.29.7 | node_modules/@babel/plugin-transform-react-pure-annotations | production/runtime |
| @babel/plugin-transform-regenerator | 7.29.8 | node_modules/@babel/plugin-transform-regenerator | production/runtime |
| @babel/plugin-transform-runtime | 7.29.7 | node_modules/@babel/plugin-transform-runtime | production/runtime |
| @babel/plugin-transform-shorthand-properties | 7.29.7 | node_modules/@babel/plugin-transform-shorthand-properties | production/runtime |
| @babel/plugin-transform-template-literals | 7.29.7 | node_modules/@babel/plugin-transform-template-literals | production/runtime |
| @babel/plugin-transform-typescript | 7.29.9 | node_modules/@babel/plugin-transform-typescript | production/runtime |
| @babel/plugin-transform-unicode-regex | 7.29.7 | node_modules/@babel/plugin-transform-unicode-regex | production/runtime |
| @babel/preset-typescript | 7.29.7 | node_modules/@babel/preset-typescript | production/runtime |
| @babel/runtime | 7.29.10 | node_modules/@babel/runtime | production/runtime |
| @babel/template | 7.29.7 | node_modules/@babel/template | production/runtime |
| @babel/traverse | 7.29.12 | node_modules/@babel/traverse | production/runtime |
| @babel/types | 7.29.11 | node_modules/@babel/types | production/runtime |
| @bcoe/v8-coverage | 0.2.3 | node_modules/@bcoe/v8-coverage | production/runtime |
| @csstools/css-calc | 2.1.4 | node_modules/@csstools/css-calc | development |
| @csstools/css-color-parser | 3.1.0 | node_modules/@csstools/css-color-parser | development |
| @csstools/css-parser-algorithms | 3.0.5 | node_modules/@csstools/css-parser-algorithms | development |
| @csstools/css-tokenizer | 3.0.4 | node_modules/@csstools/css-tokenizer | development |
| @esbuild-kit/core-utils | 3.3.2 | node_modules/@esbuild-kit/core-utils | development |
| @esbuild-kit/core-utils/node_modules/@esbuild/android-arm | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/android-arm | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/android-arm64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/android-arm64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/android-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/android-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/darwin-arm64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/darwin-arm64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/darwin-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/darwin-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/freebsd-arm64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/freebsd-arm64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/freebsd-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/freebsd-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-arm | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-arm | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-arm64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-arm64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-ia32 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-ia32 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-loong64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-loong64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-mips64el | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-mips64el | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-ppc64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-ppc64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-riscv64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-riscv64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-s390x | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-s390x | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/linux-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/linux-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/netbsd-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/netbsd-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/openbsd-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/openbsd-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/sunos-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/sunos-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/win32-arm64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/win32-arm64 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/win32-ia32 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/win32-ia32 | development, optional |
| @esbuild-kit/core-utils/node_modules/@esbuild/win32-x64 | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/win32-x64 | development, optional |
| @esbuild-kit/core-utils/node_modules/esbuild | 0.18.20 | node_modules/@esbuild-kit/core-utils/node_modules/esbuild | development |
| @esbuild-kit/esm-loader | 2.6.5 | node_modules/@esbuild-kit/esm-loader | development |
| @esbuild/aix-ppc64 | 0.25.12 | node_modules/@esbuild/aix-ppc64 | development, optional |
| @esbuild/android-arm | 0.25.12 | node_modules/@esbuild/android-arm | development, optional |
| @esbuild/android-arm64 | 0.25.12 | node_modules/@esbuild/android-arm64 | development, optional |
| @esbuild/android-x64 | 0.25.12 | node_modules/@esbuild/android-x64 | development, optional |
| @esbuild/darwin-arm64 | 0.25.12 | node_modules/@esbuild/darwin-arm64 | development, optional |
| @esbuild/darwin-x64 | 0.25.12 | node_modules/@esbuild/darwin-x64 | development, optional |
| @esbuild/freebsd-arm64 | 0.25.12 | node_modules/@esbuild/freebsd-arm64 | development, optional |
| @esbuild/freebsd-x64 | 0.25.12 | node_modules/@esbuild/freebsd-x64 | development, optional |
| @esbuild/linux-arm | 0.25.12 | node_modules/@esbuild/linux-arm | development, optional |
| @esbuild/linux-arm64 | 0.25.12 | node_modules/@esbuild/linux-arm64 | development, optional |
| @esbuild/linux-ia32 | 0.25.12 | node_modules/@esbuild/linux-ia32 | development, optional |
| @esbuild/linux-loong64 | 0.25.12 | node_modules/@esbuild/linux-loong64 | development, optional |
| @esbuild/linux-mips64el | 0.25.12 | node_modules/@esbuild/linux-mips64el | development, optional |
| @esbuild/linux-ppc64 | 0.25.12 | node_modules/@esbuild/linux-ppc64 | development, optional |
| @esbuild/linux-riscv64 | 0.25.12 | node_modules/@esbuild/linux-riscv64 | development, optional |
| @esbuild/linux-s390x | 0.25.12 | node_modules/@esbuild/linux-s390x | development, optional |
| @esbuild/linux-x64 | 0.25.12 | node_modules/@esbuild/linux-x64 | development, optional |
| @esbuild/netbsd-arm64 | 0.25.12 | node_modules/@esbuild/netbsd-arm64 | development, optional |
| @esbuild/netbsd-x64 | 0.25.12 | node_modules/@esbuild/netbsd-x64 | development, optional |
| @esbuild/openbsd-arm64 | 0.25.12 | node_modules/@esbuild/openbsd-arm64 | development, optional |
| @esbuild/openbsd-x64 | 0.25.12 | node_modules/@esbuild/openbsd-x64 | development, optional |
| @esbuild/openharmony-arm64 | 0.25.12 | node_modules/@esbuild/openharmony-arm64 | development, optional |
| @esbuild/sunos-x64 | 0.25.12 | node_modules/@esbuild/sunos-x64 | development, optional |
| @esbuild/win32-arm64 | 0.25.12 | node_modules/@esbuild/win32-arm64 | development, optional |
| @esbuild/win32-ia32 | 0.25.12 | node_modules/@esbuild/win32-ia32 | development, optional |
| @esbuild/win32-x64 | 0.25.12 | node_modules/@esbuild/win32-x64 | development, optional |
| @eslint-community/eslint-utils | 4.10.1 | node_modules/@eslint-community/eslint-utils | development |
| @eslint-community/regexpp | 4.12.2 | node_modules/@eslint-community/regexpp | development |
| @eslint/config-array/node_modules/balanced-match | 1.0.2 | node_modules/@eslint/config-array/node_modules/balanced-match | development |
| @eslint/config-array/node_modules/brace-expansion | 1.1.21 | node_modules/@eslint/config-array/node_modules/brace-expansion | development |
| @eslint/eslintrc | 3.3.7 | node_modules/@eslint/eslintrc | development |
| @eslint/eslintrc/node_modules/balanced-match | 1.0.2 | node_modules/@eslint/eslintrc/node_modules/balanced-match | development |
| @eslint/eslintrc/node_modules/brace-expansion | 1.1.21 | node_modules/@eslint/eslintrc/node_modules/brace-expansion | development |
| @eslint/eslintrc/node_modules/globals | 14.0.0 | node_modules/@eslint/eslintrc/node_modules/globals | development |
| @eslint/js | 9.39.5 | node_modules/@eslint/js | development |
| @expo/code-signing-certificates | 0.0.7 | node_modules/@expo/code-signing-certificates | production/runtime |
| @expo/config | 58.0.10 | node_modules/@expo/config | production/runtime |
| @expo/config-plugins | 58.0.11 | node_modules/@expo/config-plugins | production/runtime |
| @expo/config-types | 58.0.3 | node_modules/@expo/config-types | production/runtime |
| @expo/devcert | 1.2.2 | node_modules/@expo/devcert | production/runtime |
| @expo/devcert/node_modules/debug | 3.2.7 | node_modules/@expo/devcert/node_modules/debug | production/runtime |
| @expo/dom-webview | 58.0.2 | node_modules/@expo/dom-webview | production/runtime |
| @expo/env | 2.5.3 | node_modules/@expo/env | production/runtime |
| @expo/fingerprint | 0.21.8 | node_modules/@expo/fingerprint | production/runtime |
| @expo/image-utils | 0.12.6 | node_modules/@expo/image-utils | production/runtime |
| @expo/inline-modules | 0.2.8 | node_modules/@expo/inline-modules | production/runtime |
| @expo/json-file | 11.2.1 | node_modules/@expo/json-file | production/runtime |
| @expo/local-build-cache-provider | 58.0.10 | node_modules/@expo/local-build-cache-provider | production/runtime |
| @expo/log-box | 58.0.14 | node_modules/@expo/log-box | production/runtime |
| @expo/log-box-utils | 58.0.2 | node_modules/@expo/log-box-utils | production/runtime |
| @expo/metro | 58.0.0 | node_modules/@expo/metro | production/runtime |
| @expo/metro-file-map | 58.0.5 | node_modules/@expo/metro-file-map | production/runtime |
| @expo/modules-macros-linux-arm64 | 0.27.1 | node_modules/@expo/modules-macros-linux-arm64 | production/runtime, optional |
| @expo/modules-macros-linux-x64 | 0.27.1 | node_modules/@expo/modules-macros-linux-x64 | production/runtime, optional |
| @expo/modules-macros-win32-arm64 | 0.27.1 | node_modules/@expo/modules-macros-win32-arm64 | production/runtime, optional |
| @expo/modules-macros-win32-x64 | 0.27.1 | node_modules/@expo/modules-macros-win32-x64 | production/runtime, optional |
| @expo/osascript | 2.8.1 | node_modules/@expo/osascript | production/runtime |
| @expo/package-manager | 1.14.2 | node_modules/@expo/package-manager | production/runtime |
| @expo/platforms | 58.0.1 | node_modules/@expo/platforms | production/runtime |
| @expo/plist | 0.10.1 | node_modules/@expo/plist | production/runtime |
| @expo/prebuild-config | 58.0.18 | node_modules/@expo/prebuild-config | production/runtime |
| @expo/require-utils | 58.0.5 | node_modules/@expo/require-utils | production/runtime |
| @expo/schema-utils | 58.0.3 | node_modules/@expo/schema-utils | production/runtime |
| @expo/sdk-runtime-versions | 1.0.1 | node_modules/@expo/sdk-runtime-versions | production/runtime |
| @expo/spawn-async | 1.8.0 | node_modules/@expo/spawn-async | production/runtime |
| @expo/sudo-prompt | 9.3.2 | node_modules/@expo/sudo-prompt | production/runtime |
| @expo/xcpretty | 4.4.7 | node_modules/@expo/xcpretty | production/runtime |
| @isaacs/cliui/node_modules/ansi-regex | 6.5.0 | node_modules/@isaacs/cliui/node_modules/ansi-regex | production/runtime |
| @isaacs/cliui/node_modules/ansi-styles | 6.2.3 | node_modules/@isaacs/cliui/node_modules/ansi-styles | production/runtime |
| @isaacs/cliui/node_modules/emoji-regex | 9.2.2 | node_modules/@isaacs/cliui/node_modules/emoji-regex | production/runtime |
| @isaacs/cliui/node_modules/string-width | 5.1.2 | node_modules/@isaacs/cliui/node_modules/string-width | production/runtime |
| @isaacs/cliui/node_modules/strip-ansi | 7.2.0 | node_modules/@isaacs/cliui/node_modules/strip-ansi | production/runtime |
| @isaacs/cliui/node_modules/wrap-ansi | 8.1.0 | node_modules/@isaacs/cliui/node_modules/wrap-ansi | production/runtime |
| @istanbuljs/load-nyc-config/node_modules/argparse | 1.0.10 | node_modules/@istanbuljs/load-nyc-config/node_modules/argparse | production/runtime |
| @istanbuljs/load-nyc-config/node_modules/camelcase | 5.3.1 | node_modules/@istanbuljs/load-nyc-config/node_modules/camelcase | production/runtime |
| @istanbuljs/load-nyc-config/node_modules/js-yaml | 3.15.2 | node_modules/@istanbuljs/load-nyc-config/node_modules/js-yaml | production/runtime |
| @istanbuljs/schema | 0.1.6 | node_modules/@istanbuljs/schema | production/runtime |
| @jest/console | 30.5.2 | node_modules/@jest/console | production/runtime |
| @jest/console/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/console/node_modules/@jest/schemas | production/runtime |
| @jest/console/node_modules/@jest/types | 30.5.1 | node_modules/@jest/console/node_modules/@jest/types | production/runtime |
| @jest/console/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/console/node_modules/@sinclair/typebox | production/runtime |
| @jest/console/node_modules/ci-info | 4.4.0 | node_modules/@jest/console/node_modules/ci-info | production/runtime |
| @jest/console/node_modules/jest-util | 30.5.1 | node_modules/@jest/console/node_modules/jest-util | production/runtime |
| @jest/console/node_modules/picomatch | 4.0.7 | node_modules/@jest/console/node_modules/picomatch | production/runtime |
| @jest/core | 30.5.2 | node_modules/@jest/core | production/runtime |
| @jest/core/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/core/node_modules/@jest/schemas | production/runtime |
| @jest/core/node_modules/@jest/transform | 30.5.2 | node_modules/@jest/core/node_modules/@jest/transform | production/runtime |
| @jest/core/node_modules/@jest/types | 30.5.1 | node_modules/@jest/core/node_modules/@jest/types | production/runtime |
| @jest/core/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/core/node_modules/@sinclair/typebox | production/runtime |
| @jest/core/node_modules/ansi-styles | 5.2.0 | node_modules/@jest/core/node_modules/ansi-styles | production/runtime |
| @jest/core/node_modules/balanced-match | 1.0.2 | node_modules/@jest/core/node_modules/balanced-match | production/runtime |
| @jest/core/node_modules/brace-expansion | 2.1.7 | node_modules/@jest/core/node_modules/brace-expansion | production/runtime |
| @jest/core/node_modules/ci-info | 4.4.0 | node_modules/@jest/core/node_modules/ci-info | production/runtime |
| @jest/core/node_modules/fdir | 6.5.0 | node_modules/@jest/core/node_modules/fdir | production/runtime |
| @jest/core/node_modules/jest-haste-map | 30.5.1 | node_modules/@jest/core/node_modules/jest-haste-map | production/runtime |
| @jest/core/node_modules/jest-regex-util | 30.5.0 | node_modules/@jest/core/node_modules/jest-regex-util | production/runtime |
| @jest/core/node_modules/jest-util | 30.5.1 | node_modules/@jest/core/node_modules/jest-util | production/runtime |
| @jest/core/node_modules/jest-validate | 30.5.1 | node_modules/@jest/core/node_modules/jest-validate | production/runtime |
| @jest/core/node_modules/jest-worker | 30.5.1 | node_modules/@jest/core/node_modules/jest-worker | production/runtime |
| @jest/core/node_modules/picomatch | 4.0.7 | node_modules/@jest/core/node_modules/picomatch | production/runtime |
| @jest/core/node_modules/pretty-format | 30.5.1 | node_modules/@jest/core/node_modules/pretty-format | production/runtime |
| @jest/core/node_modules/supports-color | 8.1.1 | node_modules/@jest/core/node_modules/supports-color | production/runtime |
| @jest/create-cache-key-function | 29.7.0 | node_modules/@jest/create-cache-key-function | development |
| @jest/diff-sequences | 30.5.0 | node_modules/@jest/diff-sequences | production/runtime |
| @jest/environment | 30.5.2 | node_modules/@jest/environment | production/runtime |
| @jest/environment-jsdom-abstract | 30.5.2 | node_modules/@jest/environment-jsdom-abstract | development |
| @jest/environment-jsdom-abstract/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/environment-jsdom-abstract/node_modules/@jest/schemas | development |
| @jest/environment-jsdom-abstract/node_modules/@jest/types | 30.5.1 | node_modules/@jest/environment-jsdom-abstract/node_modules/@jest/types | development |
| @jest/environment-jsdom-abstract/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/environment-jsdom-abstract/node_modules/@sinclair/typebox | development |
| @jest/environment-jsdom-abstract/node_modules/ci-info | 4.4.0 | node_modules/@jest/environment-jsdom-abstract/node_modules/ci-info | development |
| @jest/environment-jsdom-abstract/node_modules/jest-util | 30.5.1 | node_modules/@jest/environment-jsdom-abstract/node_modules/jest-util | development |
| @jest/environment-jsdom-abstract/node_modules/picomatch | 4.0.7 | node_modules/@jest/environment-jsdom-abstract/node_modules/picomatch | development |
| @jest/environment/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/environment/node_modules/@jest/schemas | production/runtime |
| @jest/environment/node_modules/@jest/types | 30.5.1 | node_modules/@jest/environment/node_modules/@jest/types | production/runtime |
| @jest/environment/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/environment/node_modules/@sinclair/typebox | production/runtime |
| @jest/expect | 30.5.2 | node_modules/@jest/expect | production/runtime |
| @jest/expect-utils | 30.5.2 | node_modules/@jest/expect-utils | production/runtime |
| @jest/fake-timers | 30.5.2 | node_modules/@jest/fake-timers | production/runtime |
| @jest/fake-timers/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/fake-timers/node_modules/@jest/schemas | production/runtime |
| @jest/fake-timers/node_modules/@jest/types | 30.5.1 | node_modules/@jest/fake-timers/node_modules/@jest/types | production/runtime |
| @jest/fake-timers/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/fake-timers/node_modules/@sinclair/typebox | production/runtime |
| @jest/fake-timers/node_modules/ci-info | 4.4.0 | node_modules/@jest/fake-timers/node_modules/ci-info | production/runtime |
| @jest/fake-timers/node_modules/jest-util | 30.5.1 | node_modules/@jest/fake-timers/node_modules/jest-util | production/runtime |
| @jest/fake-timers/node_modules/picomatch | 4.0.7 | node_modules/@jest/fake-timers/node_modules/picomatch | production/runtime |
| @jest/get-type | 30.5.0 | node_modules/@jest/get-type | production/runtime |
| @jest/globals | 30.5.2 | node_modules/@jest/globals | production/runtime |
| @jest/globals/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/globals/node_modules/@jest/schemas | production/runtime |
| @jest/globals/node_modules/@jest/types | 30.5.1 | node_modules/@jest/globals/node_modules/@jest/types | production/runtime |
| @jest/globals/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/globals/node_modules/@sinclair/typebox | production/runtime |
| @jest/pattern | 30.5.0 | node_modules/@jest/pattern | production/runtime |
| @jest/pattern/node_modules/jest-regex-util | 30.5.0 | node_modules/@jest/pattern/node_modules/jest-regex-util | production/runtime |
| @jest/react-is-18 | 18.3.1 | node_modules/@jest/react-is-18 | production/runtime |
| @jest/react-is-19 | 19.3.1 | node_modules/@jest/react-is-19 | production/runtime |
| @jest/reporters | 30.5.2 | node_modules/@jest/reporters | production/runtime |
| @jest/reporters/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/reporters/node_modules/@jest/schemas | production/runtime |
| @jest/reporters/node_modules/@jest/transform | 30.5.2 | node_modules/@jest/reporters/node_modules/@jest/transform | production/runtime |
| @jest/reporters/node_modules/@jest/types | 30.5.1 | node_modules/@jest/reporters/node_modules/@jest/types | production/runtime |
| @jest/reporters/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/reporters/node_modules/@sinclair/typebox | production/runtime |
| @jest/reporters/node_modules/balanced-match | 1.0.2 | node_modules/@jest/reporters/node_modules/balanced-match | production/runtime |
| @jest/reporters/node_modules/brace-expansion | 2.1.7 | node_modules/@jest/reporters/node_modules/brace-expansion | production/runtime |
| @jest/reporters/node_modules/ci-info | 4.4.0 | node_modules/@jest/reporters/node_modules/ci-info | production/runtime |
| @jest/reporters/node_modules/fdir | 6.5.0 | node_modules/@jest/reporters/node_modules/fdir | production/runtime |
| @jest/reporters/node_modules/jest-haste-map | 30.5.1 | node_modules/@jest/reporters/node_modules/jest-haste-map | production/runtime |
| @jest/reporters/node_modules/jest-regex-util | 30.5.0 | node_modules/@jest/reporters/node_modules/jest-regex-util | production/runtime |
| @jest/reporters/node_modules/jest-util | 30.5.1 | node_modules/@jest/reporters/node_modules/jest-util | production/runtime |
| @jest/reporters/node_modules/jest-worker | 30.5.1 | node_modules/@jest/reporters/node_modules/jest-worker | production/runtime |
| @jest/reporters/node_modules/picomatch | 4.0.7 | node_modules/@jest/reporters/node_modules/picomatch | production/runtime |
| @jest/reporters/node_modules/supports-color | 8.1.1 | node_modules/@jest/reporters/node_modules/supports-color | production/runtime |
| @jest/schemas | 29.6.3 | node_modules/@jest/schemas | production/runtime |
| @jest/snapshot-utils | 30.5.1 | node_modules/@jest/snapshot-utils | production/runtime |
| @jest/snapshot-utils/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/snapshot-utils/node_modules/@jest/schemas | production/runtime |
| @jest/snapshot-utils/node_modules/@jest/types | 30.5.1 | node_modules/@jest/snapshot-utils/node_modules/@jest/types | production/runtime |
| @jest/snapshot-utils/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/snapshot-utils/node_modules/@sinclair/typebox | production/runtime |
| @jest/source-map | 30.5.2 | node_modules/@jest/source-map | production/runtime |
| @jest/test-result | 30.5.2 | node_modules/@jest/test-result | production/runtime |
| @jest/test-result/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/test-result/node_modules/@jest/schemas | production/runtime |
| @jest/test-result/node_modules/@jest/types | 30.5.1 | node_modules/@jest/test-result/node_modules/@jest/types | production/runtime |
| @jest/test-result/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/test-result/node_modules/@sinclair/typebox | production/runtime |
| @jest/test-sequencer | 30.5.2 | node_modules/@jest/test-sequencer | production/runtime |
| @jest/test-sequencer/node_modules/@jest/schemas | 30.5.0 | node_modules/@jest/test-sequencer/node_modules/@jest/schemas | production/runtime |
| @jest/test-sequencer/node_modules/@jest/types | 30.5.1 | node_modules/@jest/test-sequencer/node_modules/@jest/types | production/runtime |
| @jest/test-sequencer/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@jest/test-sequencer/node_modules/@sinclair/typebox | production/runtime |
| @jest/test-sequencer/node_modules/ci-info | 4.4.0 | node_modules/@jest/test-sequencer/node_modules/ci-info | production/runtime |
| @jest/test-sequencer/node_modules/fdir | 6.5.0 | node_modules/@jest/test-sequencer/node_modules/fdir | production/runtime |
| @jest/test-sequencer/node_modules/jest-haste-map | 30.5.1 | node_modules/@jest/test-sequencer/node_modules/jest-haste-map | production/runtime |
| @jest/test-sequencer/node_modules/jest-regex-util | 30.5.0 | node_modules/@jest/test-sequencer/node_modules/jest-regex-util | production/runtime |
| @jest/test-sequencer/node_modules/jest-util | 30.5.1 | node_modules/@jest/test-sequencer/node_modules/jest-util | production/runtime |
| @jest/test-sequencer/node_modules/jest-worker | 30.5.1 | node_modules/@jest/test-sequencer/node_modules/jest-worker | production/runtime |
| @jest/test-sequencer/node_modules/picomatch | 4.0.7 | node_modules/@jest/test-sequencer/node_modules/picomatch | production/runtime |
| @jest/test-sequencer/node_modules/supports-color | 8.1.1 | node_modules/@jest/test-sequencer/node_modules/supports-color | production/runtime |
| @jest/transform | 29.7.0 | node_modules/@jest/transform | development |
| @jest/types | 29.6.3 | node_modules/@jest/types | production/runtime |
| @jridgewell/gen-mapping | 0.3.13 | node_modules/@jridgewell/gen-mapping | production/runtime |
| @jridgewell/remapping | 2.3.5 | node_modules/@jridgewell/remapping | production/runtime |
| @jridgewell/resolve-uri | 3.1.2 | node_modules/@jridgewell/resolve-uri | production/runtime |
| @jridgewell/source-map | 0.3.11 | node_modules/@jridgewell/source-map | production/runtime |
| @jridgewell/sourcemap-codec | 1.6.0 | node_modules/@jridgewell/sourcemap-codec | production/runtime |
| @jridgewell/trace-mapping | 0.3.31 | node_modules/@jridgewell/trace-mapping | production/runtime |
| @nolyfill/is-core-module | 1.0.39 | node_modules/@nolyfill/is-core-module | development |
| @noxcturnal/noxcturnal-darwin-arm64 | 0.1.11 | node_modules/@noxcturnal/noxcturnal-darwin-arm64 | production/runtime, optional |
| @noxcturnal/noxcturnal-darwin-x64 | 0.1.11 | node_modules/@noxcturnal/noxcturnal-darwin-x64 | production/runtime, optional |
| @noxcturnal/noxcturnal-linux-arm64-gnu | 0.1.11 | node_modules/@noxcturnal/noxcturnal-linux-arm64-gnu | production/runtime, optional |
| @noxcturnal/noxcturnal-linux-arm64-musl | 0.1.11 | node_modules/@noxcturnal/noxcturnal-linux-arm64-musl | production/runtime, optional |
| @noxcturnal/noxcturnal-linux-x64-gnu | 0.1.11 | node_modules/@noxcturnal/noxcturnal-linux-x64-gnu | production/runtime, optional |
| @noxcturnal/noxcturnal-linux-x64-musl | 0.1.11 | node_modules/@noxcturnal/noxcturnal-linux-x64-musl | production/runtime, optional |
| @noxcturnal/noxcturnal-win32-arm64-msvc | 0.1.11 | node_modules/@noxcturnal/noxcturnal-win32-arm64-msvc | production/runtime, optional |
| @noxcturnal/noxcturnal-win32-x64-msvc | 0.1.11 | node_modules/@noxcturnal/noxcturnal-win32-x64-msvc | production/runtime, optional |
| @oxc-project/types | 0.154.0 | node_modules/@oxc-project/types | production/runtime |
| @parcel/watcher | 2.6.0 | node_modules/@parcel/watcher | production/runtime |
| @parcel/watcher-android-arm64 | 2.6.0 | node_modules/@parcel/watcher-android-arm64 | development, optional |
| @parcel/watcher-darwin-arm64 | 2.6.0 | node_modules/@parcel/watcher-darwin-arm64 | development, optional |
| @parcel/watcher-darwin-x64 | 2.6.0 | node_modules/@parcel/watcher-darwin-x64 | development, optional |
| @parcel/watcher-freebsd-x64 | 2.6.0 | node_modules/@parcel/watcher-freebsd-x64 | development, optional |
| @parcel/watcher-linux-arm-glibc | 2.6.0 | node_modules/@parcel/watcher-linux-arm-glibc | development, optional |
| @parcel/watcher-linux-arm-musl | 2.6.0 | node_modules/@parcel/watcher-linux-arm-musl | development, optional |
| @parcel/watcher-linux-arm64-glibc | 2.6.0 | node_modules/@parcel/watcher-linux-arm64-glibc | development, optional |
| @parcel/watcher-linux-arm64-musl | 2.6.0 | node_modules/@parcel/watcher-linux-arm64-musl | development, optional |
| @parcel/watcher-linux-x64-glibc | 2.6.0 | node_modules/@parcel/watcher-linux-x64-glibc | development, optional |
| @parcel/watcher-linux-x64-musl | 2.6.0 | node_modules/@parcel/watcher-linux-x64-musl | development, optional |
| @parcel/watcher-win32-arm64 | 2.6.0 | node_modules/@parcel/watcher-win32-arm64 | development, optional |
| @parcel/watcher-win32-x64 | 2.6.0 | node_modules/@parcel/watcher-win32-x64 | development, optional |
| @parcel/watcher/node_modules/picomatch | 4.0.7 | node_modules/@parcel/watcher/node_modules/picomatch | production/runtime |
| @pkgjs/parseargs | 0.11.0 | node_modules/@pkgjs/parseargs | development, optional |
| @pkgr/core | 0.3.6 | node_modules/@pkgr/core | production/runtime |
| @radix-ui/primitive | 1.2.0 | node_modules/@radix-ui/primitive | production/runtime |
| @radix-ui/react-collection | 1.2.0 | node_modules/@radix-ui/react-collection | production/runtime |
| @radix-ui/react-compose-refs | 1.1.5 | node_modules/@radix-ui/react-compose-refs | production/runtime |
| @radix-ui/react-context | 1.3.0 | node_modules/@radix-ui/react-context | production/runtime |
| @radix-ui/react-direction | 1.2.0 | node_modules/@radix-ui/react-direction | production/runtime |
| @radix-ui/react-id | 1.1.4 | node_modules/@radix-ui/react-id | production/runtime |
| @radix-ui/react-presence | 1.1.11 | node_modules/@radix-ui/react-presence | production/runtime |
| @radix-ui/react-primitive | 2.2.0 | node_modules/@radix-ui/react-primitive | production/runtime |
| @radix-ui/react-roving-focus | 1.2.1 | node_modules/@radix-ui/react-roving-focus | production/runtime |
| @radix-ui/react-slot | 1.5.0 | node_modules/@radix-ui/react-slot | production/runtime |
| @radix-ui/react-use-callback-ref | 1.1.5 | node_modules/@radix-ui/react-use-callback-ref | production/runtime |
| @radix-ui/react-use-controllable-state | 1.3.0 | node_modules/@radix-ui/react-use-controllable-state | production/runtime |
| @radix-ui/react-use-effect-event | 0.0.5 | node_modules/@radix-ui/react-use-effect-event | production/runtime |
| @radix-ui/react-use-is-hydrated | 0.1.3 | node_modules/@radix-ui/react-use-is-hydrated | production/runtime |
| @radix-ui/react-use-layout-effect | 1.1.4 | node_modules/@radix-ui/react-use-layout-effect | production/runtime |
| @react-native-masked-view/masked-view | 0.3.2 | node_modules/@react-native-masked-view/masked-view | production/runtime |
| @react-native/asset-utils | 0.88.1 | node_modules/@react-native/asset-utils | production/runtime |
| @react-native/babel-plugin-codegen | 0.88.1 | node_modules/@react-native/babel-plugin-codegen | production/runtime |
| @react-native/babel-preset | 0.88.1 | node_modules/@react-native/babel-preset | production/runtime |
| @react-native/babel-preset/node_modules/flow-estree | 0.327.0 | node_modules/@react-native/babel-preset/node_modules/flow-estree | production/runtime |
| @react-native/babel-preset/node_modules/flow-parser | 0.327.0 | node_modules/@react-native/babel-preset/node_modules/flow-parser | production/runtime |
| @react-native/codegen | 0.88.1 | node_modules/@react-native/codegen | production/runtime |
| @react-native/codegen/node_modules/flow-estree | 0.327.0 | node_modules/@react-native/codegen/node_modules/flow-estree | production/runtime |
| @react-native/codegen/node_modules/flow-parser | 0.327.0 | node_modules/@react-native/codegen/node_modules/flow-parser | production/runtime |
| @react-native/community-cli-plugin | 0.88.1 | node_modules/@react-native/community-cli-plugin | production/runtime |
| @react-native/community-cli-plugin/node_modules/commander | 12.1.0 | node_modules/@react-native/community-cli-plugin/node_modules/commander | production/runtime |
| @react-native/debugger-shell | 0.88.1 | node_modules/@react-native/debugger-shell | production/runtime |
| @react-native/dev-middleware | 0.88.1 | node_modules/@react-native/dev-middleware | production/runtime |
| @react-native/gradle-plugin | 0.88.1 | node_modules/@react-native/gradle-plugin | production/runtime |
| @react-native/jest-preset | 0.88.1 | node_modules/@react-native/jest-preset | development |
| @react-native/js-polyfills | 0.88.1 | node_modules/@react-native/js-polyfills | production/runtime |
| @react-native/metro-babel-transformer | 0.88.1 | node_modules/@react-native/metro-babel-transformer | production/runtime |
| @react-native/metro-babel-transformer/node_modules/flow-estree | 0.327.0 | node_modules/@react-native/metro-babel-transformer/node_modules/flow-estree | production/runtime |
| @react-native/metro-babel-transformer/node_modules/flow-parser | 0.327.0 | node_modules/@react-native/metro-babel-transformer/node_modules/flow-parser | production/runtime |
| @react-native/metro-config | 0.88.1 | node_modules/@react-native/metro-config | production/runtime |
| @react-native/normalize-colors | 0.88.1 | node_modules/@react-native/normalize-colors | production/runtime |
| @react-native/virtualized-lists | 0.88.1 | node_modules/@react-native/virtualized-lists | production/runtime |
| @rtsao/scc | 1.1.0 | node_modules/@rtsao/scc | development |
| @sinclair/typebox | 0.27.12 | node_modules/@sinclair/typebox | production/runtime |
| @testing-library/react-native | 14.1.0 | node_modules/@testing-library/react-native | production/runtime |
| @testing-library/react-native/node_modules/@jest/schemas | 30.5.0 | node_modules/@testing-library/react-native/node_modules/@jest/schemas | production/runtime |
| @testing-library/react-native/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@testing-library/react-native/node_modules/@sinclair/typebox | production/runtime |
| @testing-library/react-native/node_modules/ansi-styles | 5.2.0 | node_modules/@testing-library/react-native/node_modules/ansi-styles | production/runtime |
| @testing-library/react-native/node_modules/pretty-format | 30.5.1 | node_modules/@testing-library/react-native/node_modules/pretty-format | production/runtime |
| @types/babel__core | 7.20.5 | node_modules/@types/babel__core | production/runtime |
| @types/babel__generator | 7.27.0 | node_modules/@types/babel__generator | production/runtime |
| @types/babel__template | 7.4.4 | node_modules/@types/babel__template | production/runtime |
| @types/babel__traverse | 7.28.0 | node_modules/@types/babel__traverse | production/runtime |
| @types/estree | 1.0.10 | node_modules/@types/estree | development |
| @types/graceful-fs | 4.1.9 | node_modules/@types/graceful-fs | development |
| @types/istanbul-lib-coverage | 2.0.6 | node_modules/@types/istanbul-lib-coverage | production/runtime |
| @types/istanbul-lib-report | 3.0.3 | node_modules/@types/istanbul-lib-report | production/runtime |
| @types/istanbul-reports | 3.0.4 | node_modules/@types/istanbul-reports | production/runtime |
| @types/jest | 30.0.0 | node_modules/@types/jest | development |
| @types/jest/node_modules/@jest/schemas | 30.5.0 | node_modules/@types/jest/node_modules/@jest/schemas | development |
| @types/jest/node_modules/@sinclair/typebox | 0.34.52 | node_modules/@types/jest/node_modules/@sinclair/typebox | development |
| @types/jest/node_modules/ansi-styles | 5.2.0 | node_modules/@types/jest/node_modules/ansi-styles | development |
| @types/jest/node_modules/pretty-format | 30.5.1 | node_modules/@types/jest/node_modules/pretty-format | development |
| @types/jsdom | 21.1.7 | node_modules/@types/jsdom | development |
| @types/json-schema | 7.0.15 | node_modules/@types/json-schema | development |
| @types/json5 | 0.0.29 | node_modules/@types/json5 | development |
| @types/node | 26.6.6 | node_modules/@types/node | production/runtime |
| @types/react | 19.3.0 | node_modules/@types/react | production/runtime |
| @types/react-reconciler | 0.33.1 | node_modules/@types/react-reconciler | production/runtime |
| @types/react-test-renderer | 19.3.0 | node_modules/@types/react-test-renderer | production/runtime |
| @types/stack-utils | 2.0.3 | node_modules/@types/stack-utils | production/runtime |
| @types/tough-cookie | 4.0.5 | node_modules/@types/tough-cookie | development |
| @types/yargs | 17.0.35 | node_modules/@types/yargs | production/runtime |
| @types/yargs-parser | 21.0.3 | node_modules/@types/yargs-parser | production/runtime |
| @typescript-eslint/eslint-plugin | 8.72.1 | node_modules/@typescript-eslint/eslint-plugin | development |
| @typescript-eslint/eslint-plugin/node_modules/ignore | 7.0.14 | node_modules/@typescript-eslint/eslint-plugin/node_modules/ignore | development |
| @typescript-eslint/parser | 8.72.1 | node_modules/@typescript-eslint/parser | development |
| @typescript-eslint/project-service | 8.72.1 | node_modules/@typescript-eslint/project-service | development |
| @typescript-eslint/scope-manager | 8.72.1 | node_modules/@typescript-eslint/scope-manager | development |
| @typescript-eslint/tsconfig-utils | 8.72.1 | node_modules/@typescript-eslint/tsconfig-utils | development |
| @typescript-eslint/type-utils | 8.72.1 | node_modules/@typescript-eslint/type-utils | development |
| @typescript-eslint/types | 8.72.1 | node_modules/@typescript-eslint/types | development |
| @typescript-eslint/typescript-estree | 8.72.1 | node_modules/@typescript-eslint/typescript-estree | development |
| @typescript-eslint/utils | 8.72.1 | node_modules/@typescript-eslint/utils | development |
| @typescript-eslint/visitor-keys | 8.72.1 | node_modules/@typescript-eslint/visitor-keys | development |
| @unrs/resolver-binding-android-arm-eabi | 1.13.0 | node_modules/@unrs/resolver-binding-android-arm-eabi | development, optional |
| @unrs/resolver-binding-android-arm64 | 1.13.0 | node_modules/@unrs/resolver-binding-android-arm64 | development, optional |
| @unrs/resolver-binding-darwin-arm64 | 1.13.0 | node_modules/@unrs/resolver-binding-darwin-arm64 | development, optional |
| @unrs/resolver-binding-darwin-x64 | 1.13.0 | node_modules/@unrs/resolver-binding-darwin-x64 | development, optional |
| @unrs/resolver-binding-freebsd-x64 | 1.13.0 | node_modules/@unrs/resolver-binding-freebsd-x64 | development, optional |
| @unrs/resolver-binding-linux-arm-gnueabihf | 1.13.0 | node_modules/@unrs/resolver-binding-linux-arm-gnueabihf | development, optional |
| @unrs/resolver-binding-linux-arm-musleabihf | 1.13.0 | node_modules/@unrs/resolver-binding-linux-arm-musleabihf | development, optional |
| @unrs/resolver-binding-linux-arm64-gnu | 1.13.0 | node_modules/@unrs/resolver-binding-linux-arm64-gnu | development, optional |
| @unrs/resolver-binding-linux-arm64-musl | 1.13.0 | node_modules/@unrs/resolver-binding-linux-arm64-musl | development, optional |
| @unrs/resolver-binding-linux-loong64-gnu | 1.13.0 | node_modules/@unrs/resolver-binding-linux-loong64-gnu | development, optional |
| @unrs/resolver-binding-linux-loong64-musl | 1.13.0 | node_modules/@unrs/resolver-binding-linux-loong64-musl | development, optional |
| @unrs/resolver-binding-linux-ppc64-gnu | 1.13.0 | node_modules/@unrs/resolver-binding-linux-ppc64-gnu | development, optional |
| @unrs/resolver-binding-linux-riscv64-gnu | 1.13.0 | node_modules/@unrs/resolver-binding-linux-riscv64-gnu | development, optional |
| @unrs/resolver-binding-linux-riscv64-musl | 1.13.0 | node_modules/@unrs/resolver-binding-linux-riscv64-musl | development, optional |
| @unrs/resolver-binding-linux-s390x-gnu | 1.13.0 | node_modules/@unrs/resolver-binding-linux-s390x-gnu | development, optional |
| @unrs/resolver-binding-linux-x64-gnu | 1.13.0 | node_modules/@unrs/resolver-binding-linux-x64-gnu | development, optional |
| @unrs/resolver-binding-linux-x64-musl | 1.13.0 | node_modules/@unrs/resolver-binding-linux-x64-musl | development, optional |
| @unrs/resolver-binding-openharmony-arm64 | 1.13.0 | node_modules/@unrs/resolver-binding-openharmony-arm64 | development, optional |
| @unrs/resolver-binding-win32-arm64-msvc | 1.13.0 | node_modules/@unrs/resolver-binding-win32-arm64-msvc | development, optional |
| @unrs/resolver-binding-win32-ia32-msvc | 1.13.0 | node_modules/@unrs/resolver-binding-win32-ia32-msvc | development, optional |
| @unrs/resolver-binding-win32-x64-msvc | 1.13.0 | node_modules/@unrs/resolver-binding-win32-x64-msvc | development, optional |
| @xmldom/xmldom | 0.8.15 | node_modules/@xmldom/xmldom | production/runtime |
| 2g | 1.0.1 | node_modules/2g | production/runtime |
| accepts | 2.0.0 | node_modules/accepts | production/runtime |
| acorn | 8.19.0 | node_modules/acorn | production/runtime |
| acorn-jsx | 5.3.2 | node_modules/acorn-jsx | development |
| agent-base | 7.1.4 | node_modules/agent-base | production/runtime |
| agent-cli-detector | 0.1.7 | node_modules/agent-cli-detector | production/runtime |
| ajv | 6.15.0 | node_modules/ajv | development |
| anser | 1.4.10 | node_modules/anser | production/runtime |
| ansi-escapes | 4.3.2 | node_modules/ansi-escapes | production/runtime |
| ansi-regex | 5.0.1 | node_modules/ansi-regex | production/runtime |
| ansi-styles | 4.3.0 | node_modules/ansi-styles | production/runtime |
| arg | 5.0.2 | node_modules/arg | production/runtime |
| array-buffer-byte-length | 1.0.2 | node_modules/array-buffer-byte-length | development |
| array-includes | 3.2.0 | node_modules/array-includes | development |
| array.prototype.findlast | 1.2.5 | node_modules/array.prototype.findlast | development |
| array.prototype.findlastindex | 1.2.6 | node_modules/array.prototype.findlastindex | development |
| array.prototype.flat | 1.3.3 | node_modules/array.prototype.flat | development |
| array.prototype.flatmap | 1.3.3 | node_modules/array.prototype.flatmap | development |
| array.prototype.tosorted | 1.1.4 | node_modules/array.prototype.tosorted | development |
| arraybuffer.prototype.slice | 1.0.4 | node_modules/arraybuffer.prototype.slice | development |
| asap | 2.0.6 | node_modules/asap | production/runtime |
| async-function | 1.0.0 | node_modules/async-function | development |
| available-typed-arrays | 1.0.7 | node_modules/available-typed-arrays | development |
| await-lock | 2.2.2 | node_modules/await-lock | production/runtime |
| babel-jest | 29.7.0 | node_modules/babel-jest | development |
| babel-plugin-jest-hoist | 29.6.3 | node_modules/babel-plugin-jest-hoist | development |
| babel-plugin-polyfill-corejs2 | 0.4.17 | node_modules/babel-plugin-polyfill-corejs2 | production/runtime |
| babel-plugin-polyfill-corejs3 | 0.13.0 | node_modules/babel-plugin-polyfill-corejs3 | production/runtime |
| babel-plugin-polyfill-regenerator | 0.6.8 | node_modules/babel-plugin-polyfill-regenerator | production/runtime |
| babel-plugin-react-compiler | 1.0.0 | node_modules/babel-plugin-react-compiler | production/runtime |
| babel-plugin-react-native-web | 0.21.4 | node_modules/babel-plugin-react-native-web | production/runtime |
| babel-plugin-syntax-hermes-parser | 0.36.1 | node_modules/babel-plugin-syntax-hermes-parser | production/runtime |
| babel-plugin-transform-flow-enums | 0.0.2 | node_modules/babel-plugin-transform-flow-enums | production/runtime |
| babel-preset-current-node-syntax | 1.2.0 | node_modules/babel-preset-current-node-syntax | production/runtime |
| babel-preset-jest | 29.6.3 | node_modules/babel-preset-jest | development |
| balanced-match | 4.0.4 | node_modules/balanced-match | production/runtime |
| base64-js | 1.5.1 | node_modules/base64-js | production/runtime |
| bplist-creator | 0.1.0 | node_modules/bplist-creator | production/runtime |
| bplist-parser | 0.3.1 | node_modules/bplist-parser | production/runtime |
| brace-expansion | 5.0.12 | node_modules/brace-expansion | production/runtime |
| braces | 3.0.3 | node_modules/braces | production/runtime |
| browserslist | 4.29.5 | node_modules/browserslist | production/runtime |
| bser | 2.1.2 | node_modules/bser | production/runtime |
| buffer-from | 1.1.2 | node_modules/buffer-from | production/runtime |
| bytes | 3.1.2 | node_modules/bytes | production/runtime |
| call-bind | 1.0.9 | node_modules/call-bind | development |
| call-bind-apply-helpers | 1.0.2 | node_modules/call-bind-apply-helpers | development |
| call-bound | 1.0.4 | node_modules/call-bound | development |
| callsites | 3.1.0 | node_modules/callsites | production/runtime |
| camelcase | 6.3.0 | node_modules/camelcase | production/runtime |
| chalk | 4.1.2 | node_modules/chalk | production/runtime |
| char-regex | 1.0.2 | node_modules/char-regex | production/runtime |
| ci-info | 3.9.0 | node_modules/ci-info | production/runtime |
| cjs-module-lexer | 2.3.0 | node_modules/cjs-module-lexer | production/runtime |
| cli-cursor | 2.1.0 | node_modules/cli-cursor | production/runtime |
| cli-spinners | 2.9.2 | node_modules/cli-spinners | production/runtime |
| client-only | 0.0.1 | node_modules/client-only | production/runtime |
| clone | 1.0.4 | node_modules/clone | production/runtime |
| co | 4.6.0 | node_modules/co | production/runtime |
| collect-v8-coverage | 1.0.3 | node_modules/collect-v8-coverage | production/runtime |
| color | 4.2.3 | node_modules/color | production/runtime |
| color-convert | 2.0.1 | node_modules/color-convert | production/runtime |
| color-name | 1.1.4 | node_modules/color-name | production/runtime |
| color-string | 1.9.1 | node_modules/color-string | production/runtime |
| commander | 7.2.0 | node_modules/commander | production/runtime |
| compressible | 2.0.18 | node_modules/compressible | production/runtime |
| compression | 1.8.2 | node_modules/compression | production/runtime |
| compression/node_modules/debug | 2.6.9 | node_modules/compression/node_modules/debug | production/runtime |
| compression/node_modules/ms | 2.0.0 | node_modules/compression/node_modules/ms | production/runtime |
| compression/node_modules/negotiator | 0.6.4 | node_modules/compression/node_modules/negotiator | production/runtime |
| concat-map | 0.0.1 | node_modules/concat-map | development |
| connect | 3.7.0 | node_modules/connect | production/runtime |
| connect/node_modules/debug | 2.6.9 | node_modules/connect/node_modules/debug | production/runtime |
| connect/node_modules/ms | 2.0.0 | node_modules/connect/node_modules/ms | production/runtime |
| content-type | 2.1.0 | node_modules/content-type | production/runtime |
| convert-source-map | 2.0.0 | node_modules/convert-source-map | production/runtime |
| core-js-compat | 3.51.0 | node_modules/core-js-compat | production/runtime |
| cross-fetch | 3.2.0 | node_modules/cross-fetch | production/runtime |
| cross-spawn | 7.0.6 | node_modules/cross-spawn | production/runtime |
| css-in-js-utils | 3.1.0 | node_modules/css-in-js-utils | production/runtime |
| cssstyle | 4.6.0 | node_modules/cssstyle | development |
| csstype | 3.2.3 | node_modules/csstype | production/runtime |
| data-urls | 5.0.0 | node_modules/data-urls | development |
| data-view-buffer | 1.0.2 | node_modules/data-view-buffer | development |
| data-view-byte-length | 1.0.2 | node_modules/data-view-byte-length | development |
| data-view-byte-offset | 1.0.1 | node_modules/data-view-byte-offset | development |
| debug | 4.4.3 | node_modules/debug | production/runtime |
| decimal.js | 10.6.0 | node_modules/decimal.js | development |
| dedent | 1.7.2 | node_modules/dedent | production/runtime |
| deep-is | 0.1.4 | node_modules/deep-is | development |
| deepmerge | 4.3.1 | node_modules/deepmerge | production/runtime |
| defaults | 1.0.4 | node_modules/defaults | production/runtime |
| define-data-property | 1.1.4 | node_modules/define-data-property | development |
| define-lazy-prop | 2.0.0 | node_modules/define-lazy-prop | production/runtime |
| define-properties | 1.2.1 | node_modules/define-properties | development |
| depd | 2.0.0 | node_modules/depd | production/runtime |
| destroy | 1.2.0 | node_modules/destroy | production/runtime |
| detect-newline | 3.1.0 | node_modules/detect-newline | production/runtime |
| dnssd-advertise | 1.1.6 | node_modules/dnssd-advertise | production/runtime |
| drizzle-kit | 0.31.11 | node_modules/drizzle-kit | development |
| dunder-proto | 1.0.1 | node_modules/dunder-proto | development |
| eastasianwidth | 0.2.0 | node_modules/eastasianwidth | production/runtime |
| ee-first | 1.1.1 | node_modules/ee-first | production/runtime |
| emittery | 0.13.1 | node_modules/emittery | production/runtime |
| emoji-regex | 8.0.0 | node_modules/emoji-regex | production/runtime |
| encodeurl | 1.0.2 | node_modules/encodeurl | production/runtime |
| environment | 1.1.0 | node_modules/environment | development |
| error-ex | 1.3.4 | node_modules/error-ex | production/runtime |
| error-ex/node_modules/is-arrayish | 0.2.1 | node_modules/error-ex/node_modules/is-arrayish | production/runtime |
| error-stack-parser | 2.1.4 | node_modules/error-stack-parser | production/runtime |
| es-abstract | 1.24.2 | node_modules/es-abstract | development |
| es-abstract-get | 1.0.0 | node_modules/es-abstract-get | development |
| es-define-property | 1.0.1 | node_modules/es-define-property | development |
| es-errors | 1.3.0 | node_modules/es-errors | production/runtime |
| es-iterator-helpers | 1.4.0 | node_modules/es-iterator-helpers | development |
| es-module-lexer | 2.3.2 | node_modules/es-module-lexer | production/runtime |
| es-object-atoms | 1.1.2 | node_modules/es-object-atoms | development |
| es-set-tostringtag | 2.1.0 | node_modules/es-set-tostringtag | development |
| es-shim-unscopables | 1.1.0 | node_modules/es-shim-unscopables | development |
| es-to-primitive | 1.3.4 | node_modules/es-to-primitive | development |
| esbuild | 0.25.12 | node_modules/esbuild | development |
| escalade | 3.2.0 | node_modules/escalade | production/runtime |
| escape-html | 1.0.3 | node_modules/escape-html | production/runtime |
| escape-string-regexp | 1.0.5 | node_modules/escape-string-regexp | production/runtime |
| eslint | 9.39.5 | node_modules/eslint | development |
| eslint-config-expo | 58.0.4 | node_modules/eslint-config-expo | development |
| eslint-import-resolver-node | 0.3.10 | node_modules/eslint-import-resolver-node | development |
| eslint-import-resolver-node/node_modules/debug | 3.2.7 | node_modules/eslint-import-resolver-node/node_modules/debug | development |
| eslint-import-resolver-node/node_modules/resolve | 2.0.0-next.7 | node_modules/eslint-import-resolver-node/node_modules/resolve | development |
| eslint-module-utils | 2.14.0 | node_modules/eslint-module-utils | development |
| eslint-module-utils/node_modules/debug | 3.2.7 | node_modules/eslint-module-utils/node_modules/debug | development |
| eslint-plugin-expo | 1.2.1 | node_modules/eslint-plugin-expo | development |
| eslint-plugin-import | 2.32.0 | node_modules/eslint-plugin-import | development |
| eslint-plugin-import/node_modules/balanced-match | 1.0.2 | node_modules/eslint-plugin-import/node_modules/balanced-match | development |
| eslint-plugin-import/node_modules/brace-expansion | 1.1.21 | node_modules/eslint-plugin-import/node_modules/brace-expansion | development |
| eslint-plugin-import/node_modules/debug | 3.2.7 | node_modules/eslint-plugin-import/node_modules/debug | development |
| eslint-plugin-react | 7.37.5 | node_modules/eslint-plugin-react | development |
| eslint-plugin-react-hooks | 7.1.1 | node_modules/eslint-plugin-react-hooks | development |
| eslint-plugin-react-hooks/node_modules/hermes-estree | 0.25.1 | node_modules/eslint-plugin-react-hooks/node_modules/hermes-estree | development |
| eslint-plugin-react-hooks/node_modules/hermes-parser | 0.25.1 | node_modules/eslint-plugin-react-hooks/node_modules/hermes-parser | development |
| eslint-plugin-react/node_modules/balanced-match | 1.0.2 | node_modules/eslint-plugin-react/node_modules/balanced-match | development |
| eslint-plugin-react/node_modules/brace-expansion | 1.1.21 | node_modules/eslint-plugin-react/node_modules/brace-expansion | development |
| eslint-plugin-react/node_modules/resolve | 2.0.0-next.7 | node_modules/eslint-plugin-react/node_modules/resolve | development |
| eslint/node_modules/balanced-match | 1.0.2 | node_modules/eslint/node_modules/balanced-match | development |
| eslint/node_modules/brace-expansion | 1.1.21 | node_modules/eslint/node_modules/brace-expansion | development |
| eslint/node_modules/escape-string-regexp | 4.0.0 | node_modules/eslint/node_modules/escape-string-regexp | development |
| eslint/node_modules/find-up | 5.0.0 | node_modules/eslint/node_modules/find-up | development |
| eslint/node_modules/locate-path | 6.0.0 | node_modules/eslint/node_modules/locate-path | development |
| eslint/node_modules/p-locate | 5.0.0 | node_modules/eslint/node_modules/p-locate | development |
| etag | 1.8.1 | node_modules/etag | production/runtime |
| execa | 5.1.1 | node_modules/execa | production/runtime |
| execa/node_modules/mimic-fn | 2.1.0 | node_modules/execa/node_modules/mimic-fn | production/runtime |
| execa/node_modules/onetime | 5.1.2 | node_modules/execa/node_modules/onetime | production/runtime |
| exit-x | 0.2.2 | node_modules/exit-x | production/runtime |
| expect | 30.5.2 | node_modules/expect | production/runtime |
| expect/node_modules/@jest/schemas | 30.5.0 | node_modules/expect/node_modules/@jest/schemas | production/runtime |
| expect/node_modules/@jest/types | 30.5.1 | node_modules/expect/node_modules/@jest/types | production/runtime |
| expect/node_modules/@sinclair/typebox | 0.34.52 | node_modules/expect/node_modules/@sinclair/typebox | production/runtime |
| expect/node_modules/ci-info | 4.4.0 | node_modules/expect/node_modules/ci-info | production/runtime |
| expect/node_modules/jest-util | 30.5.1 | node_modules/expect/node_modules/jest-util | production/runtime |
| expect/node_modules/picomatch | 4.0.7 | node_modules/expect/node_modules/picomatch | production/runtime |
| expo | 58.0.22 | node_modules/expo | production/runtime |
| expo-asset | 58.0.19 | node_modules/expo-asset | production/runtime |
| expo-background-task | 58.0.12 | node_modules/expo-background-task | production/runtime |
| expo-constants | 58.0.14 | node_modules/expo-constants | production/runtime |
| expo-crypto | 58.0.7 | node_modules/expo-crypto | production/runtime |
| expo-dev-client | 58.0.18 | node_modules/expo-dev-client | production/runtime |
| expo-dev-launcher | 58.0.18 | node_modules/expo-dev-launcher | production/runtime |
| expo-dev-menu | 58.0.12 | node_modules/expo-dev-menu | production/runtime |
| expo-dev-menu-interface | 58.0.1 | node_modules/expo-dev-menu-interface | production/runtime |
| expo-file-system | 58.0.13 | node_modules/expo-file-system | production/runtime |
| expo-glass-effect | 58.0.5 | node_modules/expo-glass-effect | production/runtime |
| expo-json-utils | 58.0.1 | node_modules/expo-json-utils | production/runtime |
| expo-linking | 58.0.15 | node_modules/expo-linking | production/runtime |
| expo-manifests | 58.0.1 | node_modules/expo-manifests | production/runtime |
| expo-modules-autolinking | 58.0.16 | node_modules/expo-modules-autolinking | production/runtime |
| expo-modules-cli | 0.4.0 | node_modules/expo-modules-cli | production/runtime |
| expo-modules-core | 58.0.29 | node_modules/expo-modules-core | production/runtime |
| expo-modules-jsi | 58.0.21 | node_modules/expo-modules-jsi | production/runtime |
| expo-modules-macros | 0.27.1 | node_modules/expo-modules-macros | production/runtime |
| expo-router | 58.0.29 | node_modules/expo-router | production/runtime |
| expo-router/node_modules/@expo/metro-runtime | 58.0.16 | node_modules/expo-router/node_modules/@expo/metro-runtime | production/runtime |
| expo-router/node_modules/@radix-ui/react-tabs | 1.2.1 | node_modules/expo-router/node_modules/@radix-ui/react-tabs | production/runtime |
| expo-router/node_modules/react-is | 19.3.1 | node_modules/expo-router/node_modules/react-is | production/runtime |
| expo-secure-store | 58.0.2 | node_modules/expo-secure-store | production/runtime |
| expo-server | 58.0.6 | node_modules/expo-server | production/runtime |
| expo-sqlite | 58.0.15 | node_modules/expo-sqlite | production/runtime |
| expo-status-bar | 58.0.4 | node_modules/expo-status-bar | production/runtime |
| expo-system-ui | 58.0.7 | node_modules/expo-system-ui | production/runtime |
| expo-task-manager | 58.0.13 | node_modules/expo-task-manager | production/runtime |
| expo-updates-interface | 58.0.1 | node_modules/expo-updates-interface | production/runtime |
| expo/node_modules/@expo/cli | 58.1.18 | node_modules/expo/node_modules/@expo/cli | production/runtime |
| expo/node_modules/@expo/cli/node_modules/@expo/router-server | 58.0.20 | node_modules/expo/node_modules/@expo/cli/node_modules/@expo/router-server | production/runtime |
| expo/node_modules/@expo/devtools | 58.0.2 | node_modules/expo/node_modules/@expo/devtools | production/runtime |
| expo/node_modules/@expo/metro-config | 58.0.20 | node_modules/expo/node_modules/@expo/metro-config | production/runtime |
| expo/node_modules/@expo/ws-tunnel | 2.0.1 | node_modules/expo/node_modules/@expo/ws-tunnel | production/runtime |
| expo/node_modules/accepts | 1.3.8 | node_modules/expo/node_modules/accepts | production/runtime |
| expo/node_modules/babel-preset-expo | 58.0.23 | node_modules/expo/node_modules/babel-preset-expo | production/runtime |
| expo/node_modules/expo-font | 58.0.11 | node_modules/expo/node_modules/expo-font | production/runtime |
| expo/node_modules/expo-keep-awake | 58.0.3 | node_modules/expo/node_modules/expo-keep-awake | production/runtime |
| expo/node_modules/mime-db | 1.52.0 | node_modules/expo/node_modules/mime-db | production/runtime |
| expo/node_modules/mime-types | 2.1.35 | node_modules/expo/node_modules/mime-types | production/runtime |
| expo/node_modules/negotiator | 0.6.3 | node_modules/expo/node_modules/negotiator | production/runtime |
| expo/node_modules/picomatch | 4.0.7 | node_modules/expo/node_modules/picomatch | production/runtime |
| expo/node_modules/ws | 8.22.1 | node_modules/expo/node_modules/ws | production/runtime |
| fast-deep-equal | 3.1.3 | node_modules/fast-deep-equal | development |
| fast-json-stable-stringify | 2.1.0 | node_modules/fast-json-stable-stringify | production/runtime |
| fast-levenshtein | 2.0.6 | node_modules/fast-levenshtein | development |
| fb-watchman | 2.0.4 | node_modules/fb-watchman | production/runtime |
| fbjs | 3.0.5 | node_modules/fbjs | production/runtime |
| fbjs-css-vars | 1.0.2 | node_modules/fbjs-css-vars | production/runtime |
| fbjs/node_modules/promise | 7.3.1 | node_modules/fbjs/node_modules/promise | production/runtime |
| fetch-nodeshim | 0.4.10 | node_modules/fetch-nodeshim | production/runtime |
| file-entry-cache | 8.0.0 | node_modules/file-entry-cache | development |
| fill-range | 7.1.1 | node_modules/fill-range | production/runtime |
| finalhandler | 1.1.2 | node_modules/finalhandler | production/runtime |
| finalhandler/node_modules/debug | 2.6.9 | node_modules/finalhandler/node_modules/debug | production/runtime |
| finalhandler/node_modules/ms | 2.0.0 | node_modules/finalhandler/node_modules/ms | production/runtime |
| find-up | 4.1.0 | node_modules/find-up | production/runtime |
| flat-cache | 4.0.1 | node_modules/flat-cache | development |
| flow-enums-runtime | 0.0.6 | node_modules/flow-enums-runtime | production/runtime |
| flow-estree | 0.331.0 | node_modules/flow-estree | production/runtime |
| flow-parser | 0.331.0 | node_modules/flow-parser | production/runtime |
| for-each | 0.3.5 | node_modules/for-each | development |
| fresh | 0.5.2 | node_modules/fresh | production/runtime |
| fsevents | 2.3.3 | node_modules/fsevents | development, optional |
| function-bind | 1.1.2 | node_modules/function-bind | production/runtime |
| function.prototype.name | 1.2.0 | node_modules/function.prototype.name | development |
| functions-have-names | 1.2.3 | node_modules/functions-have-names | development |
| generator-function | 2.0.1 | node_modules/generator-function | development |
| gensync | 1.0.0-beta.2 | node_modules/gensync | production/runtime |
| get-intrinsic | 1.3.0 | node_modules/get-intrinsic | development |
| get-package-type | 0.1.0 | node_modules/get-package-type | production/runtime |
| get-proto | 1.0.1 | node_modules/get-proto | development |
| get-stream | 6.0.1 | node_modules/get-stream | production/runtime |
| get-symbol-description | 1.1.0 | node_modules/get-symbol-description | development |
| get-tsconfig | 4.14.3 | node_modules/get-tsconfig | development |
| getenv | 2.0.0 | node_modules/getenv | production/runtime |
| globals | 16.5.0 | node_modules/globals | development |
| globalthis | 1.0.4 | node_modules/globalthis | development |
| gopd | 1.2.0 | node_modules/gopd | development |
| has-bigints | 1.1.0 | node_modules/has-bigints | development |
| has-flag | 4.0.0 | node_modules/has-flag | production/runtime |
| has-property-descriptors | 1.0.2 | node_modules/has-property-descriptors | development |
| has-proto | 1.2.0 | node_modules/has-proto | development |
| has-symbols | 1.1.0 | node_modules/has-symbols | development |
| has-tostringtag | 1.0.2 | node_modules/has-tostringtag | development |
| hasown | 2.0.4 | node_modules/hasown | production/runtime |
| hermes-compiler | 260318099.0.5 | node_modules/hermes-compiler | production/runtime |
| hermes-estree | 0.36.1 | node_modules/hermes-estree | production/runtime |
| hermes-parser | 0.36.1 | node_modules/hermes-parser | production/runtime |
| html-encoding-sniffer | 4.0.0 | node_modules/html-encoding-sniffer | development |
| html-escaper | 2.0.2 | node_modules/html-escaper | production/runtime |
| http-errors | 2.0.1 | node_modules/http-errors | production/runtime |
| http-errors/node_modules/statuses | 2.0.2 | node_modules/http-errors/node_modules/statuses | production/runtime |
| http-proxy-agent | 7.0.2 | node_modules/http-proxy-agent | development |
| https-proxy-agent | 7.0.6 | node_modules/https-proxy-agent | production/runtime |
| iconv-lite | 0.6.3 | node_modules/iconv-lite | development |
| ignore | 5.3.2 | node_modules/ignore | production/runtime |
| import-fresh | 3.3.1 | node_modules/import-fresh | development |
| import-fresh/node_modules/resolve-from | 4.0.0 | node_modules/import-fresh/node_modules/resolve-from | development |
| import-local | 3.2.0 | node_modules/import-local | production/runtime |
| imurmurhash | 0.1.4 | node_modules/imurmurhash | production/runtime |
| indent-string | 4.0.0 | node_modules/indent-string | production/runtime |
| inline-style-prefixer | 7.0.1 | node_modules/inline-style-prefixer | production/runtime |
| internal-slot | 1.1.0 | node_modules/internal-slot | development |
| invariant | 2.2.4 | node_modules/invariant | production/runtime |
| is-array-buffer | 3.0.5 | node_modules/is-array-buffer | development |
| is-arrayish | 0.3.4 | node_modules/is-arrayish | production/runtime |
| is-async-function | 2.1.1 | node_modules/is-async-function | development |
| is-bigint | 1.1.0 | node_modules/is-bigint | development |
| is-boolean-object | 1.2.2 | node_modules/is-boolean-object | development |
| is-bun-module | 2.0.0 | node_modules/is-bun-module | development |
| is-callable | 1.2.7 | node_modules/is-callable | development |
| is-core-module | 2.17.0 | node_modules/is-core-module | production/runtime |
| is-data-view | 1.0.2 | node_modules/is-data-view | development |
| is-date-object | 1.1.0 | node_modules/is-date-object | development |
| is-docker | 2.2.1 | node_modules/is-docker | production/runtime |
| is-document.all | 1.0.0 | node_modules/is-document.all | development |
| is-extglob | 2.1.1 | node_modules/is-extglob | production/runtime |
| is-finalizationregistry | 1.1.1 | node_modules/is-finalizationregistry | development |
| is-fullwidth-code-point | 3.0.0 | node_modules/is-fullwidth-code-point | production/runtime |
| is-generator-fn | 2.1.0 | node_modules/is-generator-fn | production/runtime |
| is-generator-function | 1.1.2 | node_modules/is-generator-function | development |
| is-glob | 4.0.3 | node_modules/is-glob | production/runtime |
| is-map | 2.0.3 | node_modules/is-map | development |
| is-negative-zero | 2.0.3 | node_modules/is-negative-zero | development |
| is-number | 7.0.0 | node_modules/is-number | production/runtime |
| is-number-object | 1.1.1 | node_modules/is-number-object | development |
| is-potential-custom-element-name | 1.0.1 | node_modules/is-potential-custom-element-name | development |
| is-regex | 1.2.1 | node_modules/is-regex | development |
| is-set | 2.0.3 | node_modules/is-set | development |
| is-shared-array-buffer | 1.0.4 | node_modules/is-shared-array-buffer | development |
| is-stream | 2.0.1 | node_modules/is-stream | production/runtime |
| is-string | 1.1.1 | node_modules/is-string | development |
| is-symbol | 1.1.1 | node_modules/is-symbol | development |
| is-typed-array | 1.1.15 | node_modules/is-typed-array | development |
| is-weakmap | 2.0.2 | node_modules/is-weakmap | development |
| is-weakref | 1.1.1 | node_modules/is-weakref | development |
| is-weakset | 2.0.4 | node_modules/is-weakset | development |
| is-wsl | 2.2.0 | node_modules/is-wsl | production/runtime |
| isarray | 2.0.5 | node_modules/isarray | development |
| iterator.prototype | 1.1.5 | node_modules/iterator.prototype | development |
| jest | 30.5.2 | node_modules/jest | production/runtime |
| jest-changed-files | 30.5.1 | node_modules/jest-changed-files | production/runtime |
| jest-changed-files/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-changed-files/node_modules/@jest/schemas | production/runtime |
| jest-changed-files/node_modules/@jest/types | 30.5.1 | node_modules/jest-changed-files/node_modules/@jest/types | production/runtime |
| jest-changed-files/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-changed-files/node_modules/@sinclair/typebox | production/runtime |
| jest-changed-files/node_modules/ci-info | 4.4.0 | node_modules/jest-changed-files/node_modules/ci-info | production/runtime |
| jest-changed-files/node_modules/jest-util | 30.5.1 | node_modules/jest-changed-files/node_modules/jest-util | production/runtime |
| jest-changed-files/node_modules/picomatch | 4.0.7 | node_modules/jest-changed-files/node_modules/picomatch | production/runtime |
| jest-circus | 30.5.2 | node_modules/jest-circus | production/runtime |
| jest-circus/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-circus/node_modules/@jest/schemas | production/runtime |
| jest-circus/node_modules/@jest/types | 30.5.1 | node_modules/jest-circus/node_modules/@jest/types | production/runtime |
| jest-circus/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-circus/node_modules/@sinclair/typebox | production/runtime |
| jest-circus/node_modules/ansi-styles | 5.2.0 | node_modules/jest-circus/node_modules/ansi-styles | production/runtime |
| jest-circus/node_modules/ci-info | 4.4.0 | node_modules/jest-circus/node_modules/ci-info | production/runtime |
| jest-circus/node_modules/jest-util | 30.5.1 | node_modules/jest-circus/node_modules/jest-util | production/runtime |
| jest-circus/node_modules/picomatch | 4.0.7 | node_modules/jest-circus/node_modules/picomatch | production/runtime |
| jest-circus/node_modules/pretty-format | 30.5.1 | node_modules/jest-circus/node_modules/pretty-format | production/runtime |
| jest-cli | 30.5.2 | node_modules/jest-cli | production/runtime |
| jest-cli/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-cli/node_modules/@jest/schemas | production/runtime |
| jest-cli/node_modules/@jest/types | 30.5.1 | node_modules/jest-cli/node_modules/@jest/types | production/runtime |
| jest-cli/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-cli/node_modules/@sinclair/typebox | production/runtime |
| jest-cli/node_modules/ansi-styles | 5.2.0 | node_modules/jest-cli/node_modules/ansi-styles | production/runtime |
| jest-cli/node_modules/ci-info | 4.4.0 | node_modules/jest-cli/node_modules/ci-info | production/runtime |
| jest-cli/node_modules/jest-util | 30.5.1 | node_modules/jest-cli/node_modules/jest-util | production/runtime |
| jest-cli/node_modules/jest-validate | 30.5.1 | node_modules/jest-cli/node_modules/jest-validate | production/runtime |
| jest-cli/node_modules/picomatch | 4.0.7 | node_modules/jest-cli/node_modules/picomatch | production/runtime |
| jest-cli/node_modules/pretty-format | 30.5.1 | node_modules/jest-cli/node_modules/pretty-format | production/runtime |
| jest-config | 30.5.2 | node_modules/jest-config | production/runtime |
| jest-config/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-config/node_modules/@jest/schemas | production/runtime |
| jest-config/node_modules/@jest/transform | 30.5.2 | node_modules/jest-config/node_modules/@jest/transform | production/runtime |
| jest-config/node_modules/@jest/types | 30.5.1 | node_modules/jest-config/node_modules/@jest/types | production/runtime |
| jest-config/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-config/node_modules/@sinclair/typebox | production/runtime |
| jest-config/node_modules/ansi-styles | 5.2.0 | node_modules/jest-config/node_modules/ansi-styles | production/runtime |
| jest-config/node_modules/babel-jest | 30.5.2 | node_modules/jest-config/node_modules/babel-jest | production/runtime |
| jest-config/node_modules/babel-jest/node_modules/babel-preset-jest | 30.5.0 | node_modules/jest-config/node_modules/babel-jest/node_modules/babel-preset-jest | production/runtime |
| jest-config/node_modules/babel-plugin-jest-hoist | 30.5.0 | node_modules/jest-config/node_modules/babel-plugin-jest-hoist | production/runtime |
| jest-config/node_modules/balanced-match | 1.0.2 | node_modules/jest-config/node_modules/balanced-match | production/runtime |
| jest-config/node_modules/brace-expansion | 2.1.7 | node_modules/jest-config/node_modules/brace-expansion | production/runtime |
| jest-config/node_modules/ci-info | 4.4.0 | node_modules/jest-config/node_modules/ci-info | production/runtime |
| jest-config/node_modules/fdir | 6.5.0 | node_modules/jest-config/node_modules/fdir | production/runtime |
| jest-config/node_modules/jest-environment-node | 30.5.2 | node_modules/jest-config/node_modules/jest-environment-node | production/runtime |
| jest-config/node_modules/jest-haste-map | 30.5.1 | node_modules/jest-config/node_modules/jest-haste-map | production/runtime |
| jest-config/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-config/node_modules/jest-regex-util | production/runtime |
| jest-config/node_modules/jest-util | 30.5.1 | node_modules/jest-config/node_modules/jest-util | production/runtime |
| jest-config/node_modules/jest-validate | 30.5.1 | node_modules/jest-config/node_modules/jest-validate | production/runtime |
| jest-config/node_modules/jest-worker | 30.5.1 | node_modules/jest-config/node_modules/jest-worker | production/runtime |
| jest-config/node_modules/picomatch | 4.0.7 | node_modules/jest-config/node_modules/picomatch | production/runtime |
| jest-config/node_modules/pretty-format | 30.5.1 | node_modules/jest-config/node_modules/pretty-format | production/runtime |
| jest-config/node_modules/supports-color | 8.1.1 | node_modules/jest-config/node_modules/supports-color | production/runtime |
| jest-diff | 30.5.2 | node_modules/jest-diff | production/runtime |
| jest-diff/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-diff/node_modules/@jest/schemas | production/runtime |
| jest-diff/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-diff/node_modules/@sinclair/typebox | production/runtime |
| jest-diff/node_modules/ansi-styles | 5.2.0 | node_modules/jest-diff/node_modules/ansi-styles | production/runtime |
| jest-diff/node_modules/pretty-format | 30.5.1 | node_modules/jest-diff/node_modules/pretty-format | production/runtime |
| jest-docblock | 30.5.0 | node_modules/jest-docblock | production/runtime |
| jest-each | 30.5.2 | node_modules/jest-each | production/runtime |
| jest-each/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-each/node_modules/@jest/schemas | production/runtime |
| jest-each/node_modules/@jest/types | 30.5.1 | node_modules/jest-each/node_modules/@jest/types | production/runtime |
| jest-each/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-each/node_modules/@sinclair/typebox | production/runtime |
| jest-each/node_modules/ansi-styles | 5.2.0 | node_modules/jest-each/node_modules/ansi-styles | production/runtime |
| jest-each/node_modules/ci-info | 4.4.0 | node_modules/jest-each/node_modules/ci-info | production/runtime |
| jest-each/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-each/node_modules/jest-regex-util | production/runtime |
| jest-each/node_modules/jest-util | 30.5.1 | node_modules/jest-each/node_modules/jest-util | production/runtime |
| jest-each/node_modules/picomatch | 4.0.7 | node_modules/jest-each/node_modules/picomatch | production/runtime |
| jest-each/node_modules/pretty-format | 30.5.1 | node_modules/jest-each/node_modules/pretty-format | production/runtime |
| jest-environment-jsdom | 30.5.2 | node_modules/jest-environment-jsdom | development |
| jest-environment-node | 29.7.0 | node_modules/jest-environment-node | development |
| jest-environment-node/node_modules/@jest/environment | 29.7.0 | node_modules/jest-environment-node/node_modules/@jest/environment | development |
| jest-environment-node/node_modules/@jest/fake-timers | 29.7.0 | node_modules/jest-environment-node/node_modules/@jest/fake-timers | development |
| jest-environment-node/node_modules/jest-message-util | 29.7.0 | node_modules/jest-environment-node/node_modules/jest-message-util | development |
| jest-environment-node/node_modules/jest-mock | 29.7.0 | node_modules/jest-environment-node/node_modules/jest-mock | development |
| jest-expo | 58.0.13 | node_modules/jest-expo | development |
| jest-expo/node_modules/@jest/create-cache-key-function | 30.5.1 | node_modules/jest-expo/node_modules/@jest/create-cache-key-function | development |
| jest-expo/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-expo/node_modules/@jest/schemas | development |
| jest-expo/node_modules/@jest/transform | 30.5.2 | node_modules/jest-expo/node_modules/@jest/transform | development |
| jest-expo/node_modules/@jest/types | 30.5.1 | node_modules/jest-expo/node_modules/@jest/types | development |
| jest-expo/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-expo/node_modules/@sinclair/typebox | development |
| jest-expo/node_modules/ansi-styles | 5.2.0 | node_modules/jest-expo/node_modules/ansi-styles | development |
| jest-expo/node_modules/babel-jest | 30.5.2 | node_modules/jest-expo/node_modules/babel-jest | development |
| jest-expo/node_modules/babel-jest/node_modules/babel-preset-jest | 30.5.0 | node_modules/jest-expo/node_modules/babel-jest/node_modules/babel-preset-jest | development |
| jest-expo/node_modules/babel-plugin-jest-hoist | 30.5.0 | node_modules/jest-expo/node_modules/babel-plugin-jest-hoist | development |
| jest-expo/node_modules/balanced-match | 1.0.2 | node_modules/jest-expo/node_modules/balanced-match | development |
| jest-expo/node_modules/brace-expansion | 2.1.7 | node_modules/jest-expo/node_modules/brace-expansion | development |
| jest-expo/node_modules/ci-info | 4.4.0 | node_modules/jest-expo/node_modules/ci-info | development |
| jest-expo/node_modules/fdir | 6.5.0 | node_modules/jest-expo/node_modules/fdir | development |
| jest-expo/node_modules/jest-environment-node | 30.5.2 | node_modules/jest-expo/node_modules/jest-environment-node | development |
| jest-expo/node_modules/jest-haste-map | 30.5.1 | node_modules/jest-expo/node_modules/jest-haste-map | development |
| jest-expo/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-expo/node_modules/jest-regex-util | development |
| jest-expo/node_modules/jest-util | 30.5.1 | node_modules/jest-expo/node_modules/jest-util | development |
| jest-expo/node_modules/jest-validate | 30.5.1 | node_modules/jest-expo/node_modules/jest-validate | development |
| jest-expo/node_modules/jest-worker | 30.5.1 | node_modules/jest-expo/node_modules/jest-worker | development |
| jest-expo/node_modules/picomatch | 4.0.7 | node_modules/jest-expo/node_modules/picomatch | development |
| jest-expo/node_modules/pretty-format | 30.5.1 | node_modules/jest-expo/node_modules/pretty-format | development |
| jest-expo/node_modules/supports-color | 8.1.1 | node_modules/jest-expo/node_modules/supports-color | development |
| jest-get-type | 29.6.3 | node_modules/jest-get-type | production/runtime |
| jest-haste-map | 29.7.0 | node_modules/jest-haste-map | development |
| jest-leak-detector | 30.5.1 | node_modules/jest-leak-detector | production/runtime |
| jest-leak-detector/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-leak-detector/node_modules/@jest/schemas | production/runtime |
| jest-leak-detector/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-leak-detector/node_modules/@sinclair/typebox | production/runtime |
| jest-leak-detector/node_modules/ansi-styles | 5.2.0 | node_modules/jest-leak-detector/node_modules/ansi-styles | production/runtime |
| jest-leak-detector/node_modules/pretty-format | 30.5.1 | node_modules/jest-leak-detector/node_modules/pretty-format | production/runtime |
| jest-matcher-utils | 30.5.2 | node_modules/jest-matcher-utils | production/runtime |
| jest-matcher-utils/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-matcher-utils/node_modules/@jest/schemas | production/runtime |
| jest-matcher-utils/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-matcher-utils/node_modules/@sinclair/typebox | production/runtime |
| jest-matcher-utils/node_modules/ansi-styles | 5.2.0 | node_modules/jest-matcher-utils/node_modules/ansi-styles | production/runtime |
| jest-matcher-utils/node_modules/pretty-format | 30.5.1 | node_modules/jest-matcher-utils/node_modules/pretty-format | production/runtime |
| jest-message-util | 30.5.1 | node_modules/jest-message-util | production/runtime |
| jest-message-util/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-message-util/node_modules/@jest/schemas | production/runtime |
| jest-message-util/node_modules/@jest/types | 30.5.1 | node_modules/jest-message-util/node_modules/@jest/types | production/runtime |
| jest-message-util/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-message-util/node_modules/@sinclair/typebox | production/runtime |
| jest-message-util/node_modules/ansi-styles | 5.2.0 | node_modules/jest-message-util/node_modules/ansi-styles | production/runtime |
| jest-message-util/node_modules/ci-info | 4.4.0 | node_modules/jest-message-util/node_modules/ci-info | production/runtime |
| jest-message-util/node_modules/jest-util | 30.5.1 | node_modules/jest-message-util/node_modules/jest-util | production/runtime |
| jest-message-util/node_modules/picomatch | 4.0.7 | node_modules/jest-message-util/node_modules/picomatch | production/runtime |
| jest-message-util/node_modules/pretty-format | 30.5.1 | node_modules/jest-message-util/node_modules/pretty-format | production/runtime |
| jest-mock | 30.5.2 | node_modules/jest-mock | production/runtime |
| jest-mock/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-mock/node_modules/@jest/schemas | production/runtime |
| jest-mock/node_modules/@jest/types | 30.5.1 | node_modules/jest-mock/node_modules/@jest/types | production/runtime |
| jest-mock/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-mock/node_modules/@sinclair/typebox | production/runtime |
| jest-mock/node_modules/ci-info | 4.4.0 | node_modules/jest-mock/node_modules/ci-info | production/runtime |
| jest-mock/node_modules/jest-util | 30.5.1 | node_modules/jest-mock/node_modules/jest-util | production/runtime |
| jest-mock/node_modules/picomatch | 4.0.7 | node_modules/jest-mock/node_modules/picomatch | production/runtime |
| jest-regex-util | 29.6.3 | node_modules/jest-regex-util | development |
| jest-resolve | 30.5.1 | node_modules/jest-resolve | production/runtime |
| jest-resolve-dependencies | 30.5.2 | node_modules/jest-resolve-dependencies | production/runtime |
| jest-resolve-dependencies/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-resolve-dependencies/node_modules/jest-regex-util | production/runtime |
| jest-resolve/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-resolve/node_modules/@jest/schemas | production/runtime |
| jest-resolve/node_modules/@jest/types | 30.5.1 | node_modules/jest-resolve/node_modules/@jest/types | production/runtime |
| jest-resolve/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-resolve/node_modules/@sinclair/typebox | production/runtime |
| jest-resolve/node_modules/ansi-styles | 5.2.0 | node_modules/jest-resolve/node_modules/ansi-styles | production/runtime |
| jest-resolve/node_modules/ci-info | 4.4.0 | node_modules/jest-resolve/node_modules/ci-info | production/runtime |
| jest-resolve/node_modules/fdir | 6.5.0 | node_modules/jest-resolve/node_modules/fdir | production/runtime |
| jest-resolve/node_modules/jest-haste-map | 30.5.1 | node_modules/jest-resolve/node_modules/jest-haste-map | production/runtime |
| jest-resolve/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-resolve/node_modules/jest-regex-util | production/runtime |
| jest-resolve/node_modules/jest-util | 30.5.1 | node_modules/jest-resolve/node_modules/jest-util | production/runtime |
| jest-resolve/node_modules/jest-validate | 30.5.1 | node_modules/jest-resolve/node_modules/jest-validate | production/runtime |
| jest-resolve/node_modules/jest-worker | 30.5.1 | node_modules/jest-resolve/node_modules/jest-worker | production/runtime |
| jest-resolve/node_modules/picomatch | 4.0.7 | node_modules/jest-resolve/node_modules/picomatch | production/runtime |
| jest-resolve/node_modules/pretty-format | 30.5.1 | node_modules/jest-resolve/node_modules/pretty-format | production/runtime |
| jest-resolve/node_modules/supports-color | 8.1.1 | node_modules/jest-resolve/node_modules/supports-color | production/runtime |
| jest-runner | 30.5.2 | node_modules/jest-runner | production/runtime |
| jest-runner/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-runner/node_modules/@jest/schemas | production/runtime |
| jest-runner/node_modules/@jest/transform | 30.5.2 | node_modules/jest-runner/node_modules/@jest/transform | production/runtime |
| jest-runner/node_modules/@jest/types | 30.5.1 | node_modules/jest-runner/node_modules/@jest/types | production/runtime |
| jest-runner/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-runner/node_modules/@sinclair/typebox | production/runtime |
| jest-runner/node_modules/ansi-styles | 5.2.0 | node_modules/jest-runner/node_modules/ansi-styles | production/runtime |
| jest-runner/node_modules/balanced-match | 1.0.2 | node_modules/jest-runner/node_modules/balanced-match | production/runtime |
| jest-runner/node_modules/brace-expansion | 2.1.7 | node_modules/jest-runner/node_modules/brace-expansion | production/runtime |
| jest-runner/node_modules/ci-info | 4.4.0 | node_modules/jest-runner/node_modules/ci-info | production/runtime |
| jest-runner/node_modules/fdir | 6.5.0 | node_modules/jest-runner/node_modules/fdir | production/runtime |
| jest-runner/node_modules/jest-environment-node | 30.5.2 | node_modules/jest-runner/node_modules/jest-environment-node | production/runtime |
| jest-runner/node_modules/jest-haste-map | 30.5.1 | node_modules/jest-runner/node_modules/jest-haste-map | production/runtime |
| jest-runner/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-runner/node_modules/jest-regex-util | production/runtime |
| jest-runner/node_modules/jest-util | 30.5.1 | node_modules/jest-runner/node_modules/jest-util | production/runtime |
| jest-runner/node_modules/jest-validate | 30.5.1 | node_modules/jest-runner/node_modules/jest-validate | production/runtime |
| jest-runner/node_modules/jest-worker | 30.5.1 | node_modules/jest-runner/node_modules/jest-worker | production/runtime |
| jest-runner/node_modules/picomatch | 4.0.7 | node_modules/jest-runner/node_modules/picomatch | production/runtime |
| jest-runner/node_modules/pretty-format | 30.5.1 | node_modules/jest-runner/node_modules/pretty-format | production/runtime |
| jest-runner/node_modules/supports-color | 8.1.1 | node_modules/jest-runner/node_modules/supports-color | production/runtime |
| jest-runtime | 30.5.2 | node_modules/jest-runtime | production/runtime |
| jest-runtime/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-runtime/node_modules/@jest/schemas | production/runtime |
| jest-runtime/node_modules/@jest/transform | 30.5.2 | node_modules/jest-runtime/node_modules/@jest/transform | production/runtime |
| jest-runtime/node_modules/@jest/types | 30.5.1 | node_modules/jest-runtime/node_modules/@jest/types | production/runtime |
| jest-runtime/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-runtime/node_modules/@sinclair/typebox | production/runtime |
| jest-runtime/node_modules/balanced-match | 1.0.2 | node_modules/jest-runtime/node_modules/balanced-match | production/runtime |
| jest-runtime/node_modules/brace-expansion | 2.1.7 | node_modules/jest-runtime/node_modules/brace-expansion | production/runtime |
| jest-runtime/node_modules/ci-info | 4.4.0 | node_modules/jest-runtime/node_modules/ci-info | production/runtime |
| jest-runtime/node_modules/fdir | 6.5.0 | node_modules/jest-runtime/node_modules/fdir | production/runtime |
| jest-runtime/node_modules/jest-haste-map | 30.5.1 | node_modules/jest-runtime/node_modules/jest-haste-map | production/runtime |
| jest-runtime/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-runtime/node_modules/jest-regex-util | production/runtime |
| jest-runtime/node_modules/jest-util | 30.5.1 | node_modules/jest-runtime/node_modules/jest-util | production/runtime |
| jest-runtime/node_modules/jest-worker | 30.5.1 | node_modules/jest-runtime/node_modules/jest-worker | production/runtime |
| jest-runtime/node_modules/picomatch | 4.0.7 | node_modules/jest-runtime/node_modules/picomatch | production/runtime |
| jest-runtime/node_modules/supports-color | 8.1.1 | node_modules/jest-runtime/node_modules/supports-color | production/runtime |
| jest-snapshot | 30.5.2 | node_modules/jest-snapshot | production/runtime |
| jest-snapshot/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-snapshot/node_modules/@jest/schemas | production/runtime |
| jest-snapshot/node_modules/@jest/transform | 30.5.2 | node_modules/jest-snapshot/node_modules/@jest/transform | production/runtime |
| jest-snapshot/node_modules/@jest/types | 30.5.1 | node_modules/jest-snapshot/node_modules/@jest/types | production/runtime |
| jest-snapshot/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-snapshot/node_modules/@sinclair/typebox | production/runtime |
| jest-snapshot/node_modules/ansi-styles | 5.2.0 | node_modules/jest-snapshot/node_modules/ansi-styles | production/runtime |
| jest-snapshot/node_modules/balanced-match | 1.0.2 | node_modules/jest-snapshot/node_modules/balanced-match | production/runtime |
| jest-snapshot/node_modules/brace-expansion | 2.1.7 | node_modules/jest-snapshot/node_modules/brace-expansion | production/runtime |
| jest-snapshot/node_modules/ci-info | 4.4.0 | node_modules/jest-snapshot/node_modules/ci-info | production/runtime |
| jest-snapshot/node_modules/fdir | 6.5.0 | node_modules/jest-snapshot/node_modules/fdir | production/runtime |
| jest-snapshot/node_modules/jest-haste-map | 30.5.1 | node_modules/jest-snapshot/node_modules/jest-haste-map | production/runtime |
| jest-snapshot/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-snapshot/node_modules/jest-regex-util | production/runtime |
| jest-snapshot/node_modules/jest-util | 30.5.1 | node_modules/jest-snapshot/node_modules/jest-util | production/runtime |
| jest-snapshot/node_modules/jest-worker | 30.5.1 | node_modules/jest-snapshot/node_modules/jest-worker | production/runtime |
| jest-snapshot/node_modules/picomatch | 4.0.7 | node_modules/jest-snapshot/node_modules/picomatch | production/runtime |
| jest-snapshot/node_modules/pretty-format | 30.5.1 | node_modules/jest-snapshot/node_modules/pretty-format | production/runtime |
| jest-snapshot/node_modules/supports-color | 8.1.1 | node_modules/jest-snapshot/node_modules/supports-color | production/runtime |
| jest-util | 29.7.0 | node_modules/jest-util | production/runtime |
| jest-validate | 29.7.0 | node_modules/jest-validate | production/runtime |
| jest-watch-select-projects | 2.0.0 | node_modules/jest-watch-select-projects | development |
| jest-watch-select-projects/node_modules/chalk | 3.0.0 | node_modules/jest-watch-select-projects/node_modules/chalk | development |
| jest-watch-typeahead | 3.0.1 | node_modules/jest-watch-typeahead | development |
| jest-watch-typeahead/node_modules/ansi-escapes | 7.3.0 | node_modules/jest-watch-typeahead/node_modules/ansi-escapes | development |
| jest-watch-typeahead/node_modules/ansi-regex | 6.5.0 | node_modules/jest-watch-typeahead/node_modules/ansi-regex | development |
| jest-watch-typeahead/node_modules/chalk | 5.6.2 | node_modules/jest-watch-typeahead/node_modules/chalk | development |
| jest-watch-typeahead/node_modules/jest-regex-util | 30.5.0 | node_modules/jest-watch-typeahead/node_modules/jest-regex-util | development |
| jest-watch-typeahead/node_modules/slash | 5.1.0 | node_modules/jest-watch-typeahead/node_modules/slash | development |
| jest-watch-typeahead/node_modules/string-length | 6.0.0 | node_modules/jest-watch-typeahead/node_modules/string-length | development |
| jest-watch-typeahead/node_modules/strip-ansi | 7.2.0 | node_modules/jest-watch-typeahead/node_modules/strip-ansi | development |
| jest-watcher | 30.5.2 | node_modules/jest-watcher | production/runtime |
| jest-watcher/node_modules/@jest/schemas | 30.5.0 | node_modules/jest-watcher/node_modules/@jest/schemas | production/runtime |
| jest-watcher/node_modules/@jest/types | 30.5.1 | node_modules/jest-watcher/node_modules/@jest/types | production/runtime |
| jest-watcher/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest-watcher/node_modules/@sinclair/typebox | production/runtime |
| jest-watcher/node_modules/ci-info | 4.4.0 | node_modules/jest-watcher/node_modules/ci-info | production/runtime |
| jest-watcher/node_modules/jest-util | 30.5.1 | node_modules/jest-watcher/node_modules/jest-util | production/runtime |
| jest-watcher/node_modules/picomatch | 4.0.7 | node_modules/jest-watcher/node_modules/picomatch | production/runtime |
| jest-worker | 29.7.0 | node_modules/jest-worker | production/runtime |
| jest-worker/node_modules/supports-color | 8.1.1 | node_modules/jest-worker/node_modules/supports-color | production/runtime |
| jest/node_modules/@jest/schemas | 30.5.0 | node_modules/jest/node_modules/@jest/schemas | production/runtime |
| jest/node_modules/@jest/types | 30.5.1 | node_modules/jest/node_modules/@jest/types | production/runtime |
| jest/node_modules/@sinclair/typebox | 0.34.52 | node_modules/jest/node_modules/@sinclair/typebox | production/runtime |
| jimp-compact | 0.16.1 | node_modules/jimp-compact | production/runtime |
| js-tokens | 4.0.0 | node_modules/js-tokens | production/runtime |
| js-yaml | 4.3.2 | node_modules/js-yaml | production/runtime |
| jsdom | 26.1.0 | node_modules/jsdom | development |
| jsdom/node_modules/ws | 8.22.1 | node_modules/jsdom/node_modules/ws | development |
| jsesc | 3.1.0 | node_modules/jsesc | production/runtime |
| json-buffer | 3.0.1 | node_modules/json-buffer | development |
| json-parse-even-better-errors | 2.3.1 | node_modules/json-parse-even-better-errors | production/runtime |
| json-schema-traverse | 0.4.1 | node_modules/json-schema-traverse | development |
| json-stable-stringify-without-jsonify | 1.0.1 | node_modules/json-stable-stringify-without-jsonify | development |
| json5 | 2.2.3 | node_modules/json5 | production/runtime |
| jsx-ast-utils | 3.3.5 | node_modules/jsx-ast-utils | development |
| keyv | 4.5.4 | node_modules/keyv | development |
| kleur | 3.0.3 | node_modules/kleur | production/runtime |
| lan-network | 0.2.1 | node_modules/lan-network | production/runtime |
| leven | 3.1.0 | node_modules/leven | production/runtime |
| levn | 0.4.1 | node_modules/levn | development |
| lines-and-columns | 1.2.4 | node_modules/lines-and-columns | production/runtime |
| locate-path | 5.0.0 | node_modules/locate-path | production/runtime |
| lodash | 4.18.1 | node_modules/lodash | development |
| lodash.debounce | 4.0.8 | node_modules/lodash.debounce | production/runtime |
| lodash.merge | 4.6.2 | node_modules/lodash.merge | development |
| lodash.throttle | 4.1.1 | node_modules/lodash.throttle | production/runtime |
| log-symbols | 2.2.0 | node_modules/log-symbols | production/runtime |
| log-symbols/node_modules/ansi-styles | 3.2.1 | node_modules/log-symbols/node_modules/ansi-styles | production/runtime |
| log-symbols/node_modules/chalk | 2.4.2 | node_modules/log-symbols/node_modules/chalk | production/runtime |
| log-symbols/node_modules/color-convert | 1.9.3 | node_modules/log-symbols/node_modules/color-convert | production/runtime |
| log-symbols/node_modules/color-name | 1.1.3 | node_modules/log-symbols/node_modules/color-name | production/runtime |
| log-symbols/node_modules/has-flag | 3.0.0 | node_modules/log-symbols/node_modules/has-flag | production/runtime |
| log-symbols/node_modules/supports-color | 5.5.0 | node_modules/log-symbols/node_modules/supports-color | production/runtime |
| loose-envify | 1.4.0 | node_modules/loose-envify | production/runtime |
| make-dir | 4.0.0 | node_modules/make-dir | production/runtime |
| math-intrinsics | 1.1.0 | node_modules/math-intrinsics | development |
| memoize-one | 5.2.1 | node_modules/memoize-one | production/runtime |
| merge-stream | 2.0.0 | node_modules/merge-stream | production/runtime |
| metro | 0.87.1 | node_modules/metro | production/runtime |
| metro-babel-transformer | 0.87.1 | node_modules/metro-babel-transformer | production/runtime |
| metro-cache | 0.87.1 | node_modules/metro-cache | production/runtime |
| metro-cache-key | 0.87.1 | node_modules/metro-cache-key | production/runtime |
| metro-config | 0.87.1 | node_modules/metro-config | production/runtime |
| metro-core | 0.87.1 | node_modules/metro-core | production/runtime |
| metro-file-map | 0.87.1 | node_modules/metro-file-map | production/runtime |
| metro-minify-terser | 0.87.1 | node_modules/metro-minify-terser | production/runtime |
| metro-resolver | 0.87.1 | node_modules/metro-resolver | production/runtime |
| metro-runtime | 0.87.1 | node_modules/metro-runtime | production/runtime |
| metro-source-map | 0.87.1 | node_modules/metro-source-map | production/runtime |
| metro-symbolicate | 0.87.1 | node_modules/metro-symbolicate | production/runtime |
| metro-transform-plugins | 0.87.1 | node_modules/metro-transform-plugins | production/runtime |
| metro-transform-worker | 0.87.1 | node_modules/metro-transform-worker | production/runtime |
| micromatch | 4.0.8 | node_modules/micromatch | production/runtime |
| mime | 1.6.0 | node_modules/mime | production/runtime |
| mime-db | 1.54.0 | node_modules/mime-db | production/runtime |
| mime-types | 3.0.2 | node_modules/mime-types | production/runtime |
| mimic-fn | 1.2.0 | node_modules/mimic-fn | production/runtime |
| min-indent | 1.0.1 | node_modules/min-indent | production/runtime |
| minimist | 1.2.8 | node_modules/minimist | development |
| ms | 2.1.3 | node_modules/ms | production/runtime |
| multitars | 1.0.2 | node_modules/multitars | production/runtime |
| nanoid | 3.3.20 | node_modules/nanoid | production/runtime |
| napi-postinstall | 0.3.7 | node_modules/napi-postinstall | production/runtime |
| natural-compare | 1.4.0 | node_modules/natural-compare | production/runtime |
| negotiator | 1.1.0 | node_modules/negotiator | production/runtime |
| node-addon-api | 7.1.1 | node_modules/node-addon-api | production/runtime |
| node-exports-info | 1.6.2 | node_modules/node-exports-info | development |
| node-fetch | 2.7.0 | node_modules/node-fetch | production/runtime |
| node-fetch/node_modules/tr46 | 0.0.3 | node_modules/node-fetch/node_modules/tr46 | production/runtime |
| node-fetch/node_modules/whatwg-url | 5.0.0 | node_modules/node-fetch/node_modules/whatwg-url | production/runtime |
| node-int64 | 0.4.0 | node_modules/node-int64 | production/runtime |
| node-releases | 2.0.63 | node_modules/node-releases | production/runtime |
| normalize-path | 3.0.0 | node_modules/normalize-path | production/runtime |
| noxcturnal | 0.1.11 | node_modules/noxcturnal | production/runtime |
| npm-run-path | 4.0.1 | node_modules/npm-run-path | production/runtime |
| nullthrows | 1.1.1 | node_modules/nullthrows | production/runtime |
| nwsapi | 2.2.28 | node_modules/nwsapi | development |
| ob1 | 0.87.1 | node_modules/ob1 | production/runtime |
| object-assign | 4.1.1 | node_modules/object-assign | production/runtime |
| object-inspect | 1.13.4 | node_modules/object-inspect | development |
| object-keys | 1.1.1 | node_modules/object-keys | development |
| object.assign | 4.1.7 | node_modules/object.assign | development |
| object.entries | 1.1.9 | node_modules/object.entries | development |
| object.fromentries | 2.0.8 | node_modules/object.fromentries | development |
| object.groupby | 1.0.3 | node_modules/object.groupby | development |
| object.values | 1.2.1 | node_modules/object.values | development |
| on-finished | 2.3.0 | node_modules/on-finished | production/runtime |
| on-headers | 1.1.0 | node_modules/on-headers | production/runtime |
| onetime | 2.0.1 | node_modules/onetime | production/runtime |
| open | 8.4.2 | node_modules/open | production/runtime |
| optionator | 0.9.4 | node_modules/optionator | development |
| ora | 3.4.0 | node_modules/ora | production/runtime |
| ora/node_modules/ansi-regex | 4.1.1 | node_modules/ora/node_modules/ansi-regex | production/runtime |
| ora/node_modules/ansi-styles | 3.2.1 | node_modules/ora/node_modules/ansi-styles | production/runtime |
| ora/node_modules/chalk | 2.4.2 | node_modules/ora/node_modules/chalk | production/runtime |
| ora/node_modules/color-convert | 1.9.3 | node_modules/ora/node_modules/color-convert | production/runtime |
| ora/node_modules/color-name | 1.1.3 | node_modules/ora/node_modules/color-name | production/runtime |
| ora/node_modules/has-flag | 3.0.0 | node_modules/ora/node_modules/has-flag | production/runtime |
| ora/node_modules/strip-ansi | 5.2.0 | node_modules/ora/node_modules/strip-ansi | production/runtime |
| ora/node_modules/supports-color | 5.5.0 | node_modules/ora/node_modules/supports-color | production/runtime |
| own-keys | 1.0.2 | node_modules/own-keys | development |
| p-limit | 3.1.0 | node_modules/p-limit | production/runtime |
| p-locate | 4.1.0 | node_modules/p-locate | production/runtime |
| p-locate/node_modules/p-limit | 2.3.0 | node_modules/p-locate/node_modules/p-limit | production/runtime |
| p-try | 2.2.0 | node_modules/p-try | production/runtime |
| parent-module | 1.0.1 | node_modules/parent-module | development |
| parse-json | 5.2.0 | node_modules/parse-json | production/runtime |
| parse-png | 2.1.0 | node_modules/parse-png | production/runtime |
| parse5 | 7.3.0 | node_modules/parse5 | development |
| parseurl | 1.3.3 | node_modules/parseurl | production/runtime |
| path-exists | 4.0.0 | node_modules/path-exists | production/runtime |
| path-is-absolute | 1.0.1 | node_modules/path-is-absolute | development |
| path-key | 3.1.1 | node_modules/path-key | production/runtime |
| path-parse | 1.0.7 | node_modules/path-parse | production/runtime |
| picomatch | 2.3.2 | node_modules/picomatch | production/runtime |
| pirates | 4.0.7 | node_modules/pirates | production/runtime |
| pkg-dir | 4.2.0 | node_modules/pkg-dir | production/runtime |
| plist | 3.1.1 | node_modules/plist | production/runtime |
| plist/node_modules/@xmldom/xmldom | 0.9.12 | node_modules/plist/node_modules/@xmldom/xmldom | production/runtime |
| pngjs | 3.4.0 | node_modules/pngjs | production/runtime |
| possible-typed-array-names | 1.1.0 | node_modules/possible-typed-array-names | development |
| postcss | 8.5.32 | node_modules/postcss | production/runtime |
| postcss-value-parser | 4.2.0 | node_modules/postcss-value-parser | production/runtime |
| prelude-ls | 1.2.1 | node_modules/prelude-ls | development |
| prettier | 3.9.10 | node_modules/prettier | development |
| pretty-format | 29.7.0 | node_modules/pretty-format | production/runtime |
| pretty-format/node_modules/ansi-styles | 5.2.0 | node_modules/pretty-format/node_modules/ansi-styles | production/runtime |
| progress | 2.0.3 | node_modules/progress | production/runtime |
| promise | 8.3.0 | node_modules/promise | production/runtime |
| prompts | 2.4.2 | node_modules/prompts | production/runtime |
| prop-types | 15.8.1 | node_modules/prop-types | development |
| prop-types/node_modules/react-is | 16.13.1 | node_modules/prop-types/node_modules/react-is | development |
| punycode | 2.3.1 | node_modules/punycode | development |
| pure-rand | 7.0.1 | node_modules/pure-rand | production/runtime |
| range-parser | 1.2.1 | node_modules/range-parser | production/runtime |
| react | 19.3.0 | node_modules/react | production/runtime |
| react-devtools-core | 6.1.5 | node_modules/react-devtools-core | production/runtime |
| react-dom | 19.3.0 | node_modules/react-dom | production/runtime |
| react-fast-compare | 3.2.2 | node_modules/react-fast-compare | production/runtime |
| react-freeze | 1.0.4 | node_modules/react-freeze | production/runtime |
| react-is | 18.3.1 | node_modules/react-is | production/runtime |
| react-native | 0.88.1 | node_modules/react-native | production/runtime |
| react-native-drawer-layout | 4.2.12 | node_modules/react-native-drawer-layout | production/runtime |
| react-native-gesture-handler | 3.4.0 | node_modules/react-native-gesture-handler | production/runtime |
| react-native-is-edge-to-edge | 1.3.1 | node_modules/react-native-is-edge-to-edge | production/runtime |
| react-native-reanimated | 4.7.1 | node_modules/react-native-reanimated | production/runtime |
| react-native-safe-area-context | 5.10.1 | node_modules/react-native-safe-area-context | production/runtime |
| react-native-screens | 4.30.1 | node_modules/react-native-screens | production/runtime |
| react-native-web | 0.21.4 | node_modules/react-native-web | production/runtime |
| react-native-web/node_modules/@react-native/normalize-colors | 0.74.89 | node_modules/react-native-web/node_modules/@react-native/normalize-colors | production/runtime |
| react-native-web/node_modules/memoize-one | 6.0.0 | node_modules/react-native-web/node_modules/memoize-one | production/runtime |
| react-native-worklets | 0.13.1 | node_modules/react-native-worklets | production/runtime |
| react-native/node_modules/flow-estree | 0.327.0 | node_modules/react-native/node_modules/flow-estree | production/runtime |
| react-native/node_modules/flow-parser | 0.327.0 | node_modules/react-native/node_modules/flow-parser | production/runtime |
| react-reconciler | 0.34.0 | node_modules/react-reconciler | production/runtime |
| react-refresh | 0.14.2 | node_modules/react-refresh | production/runtime |
| redent | 3.0.0 | node_modules/redent | production/runtime |
| reflect.getprototypeof | 1.0.10 | node_modules/reflect.getprototypeof | development |
| regenerate | 1.5.0 | node_modules/regenerate | production/runtime |
| regenerate-unicode-properties | 10.3.0 | node_modules/regenerate-unicode-properties | production/runtime |
| regenerator-runtime | 0.13.11 | node_modules/regenerator-runtime | production/runtime |
| regexp.prototype.flags | 1.5.4 | node_modules/regexp.prototype.flags | development |
| regexpu-core | 6.5.3 | node_modules/regexpu-core | production/runtime |
| regjsgen | 0.8.0 | node_modules/regjsgen | production/runtime |
| require-directory | 2.1.1 | node_modules/require-directory | production/runtime |
| resolve | 1.22.13 | node_modules/resolve | production/runtime |
| resolve-cwd | 3.0.0 | node_modules/resolve-cwd | production/runtime |
| resolve-from | 5.0.0 | node_modules/resolve-from | production/runtime |
| resolve-pkg-maps | 1.0.0 | node_modules/resolve-pkg-maps | development |
| resolve-workspace-root | 2.0.1 | node_modules/resolve-workspace-root | production/runtime |
| restore-cursor | 2.0.0 | node_modules/restore-cursor | production/runtime |
| rrweb-cssom | 0.8.0 | node_modules/rrweb-cssom | development |
| safe-array-concat | 1.1.4 | node_modules/safe-array-concat | development |
| safe-buffer | 5.2.1 | node_modules/safe-buffer | production/runtime |
| safe-push-apply | 1.0.0 | node_modules/safe-push-apply | development |
| safe-regex-test | 1.1.0 | node_modules/safe-regex-test | development |
| safer-buffer | 2.1.2 | node_modules/safer-buffer | development |
| sandbox-cli-detector | 0.2.0 | node_modules/sandbox-cli-detector | production/runtime |
| scheduler | 0.28.0 | node_modules/scheduler | production/runtime |
| send | 0.19.2 | node_modules/send | production/runtime |
| send/node_modules/debug | 2.6.9 | node_modules/send/node_modules/debug | production/runtime |
| send/node_modules/debug/node_modules/ms | 2.0.0 | node_modules/send/node_modules/debug/node_modules/ms | production/runtime |
| send/node_modules/encodeurl | 2.0.1 | node_modules/send/node_modules/encodeurl | production/runtime |
| send/node_modules/on-finished | 2.4.2 | node_modules/send/node_modules/on-finished | production/runtime |
| send/node_modules/statuses | 2.0.2 | node_modules/send/node_modules/statuses | production/runtime |
| serialize-error | 2.1.0 | node_modules/serialize-error | production/runtime |
| serve-static | 1.16.3 | node_modules/serve-static | production/runtime |
| serve-static/node_modules/encodeurl | 2.0.1 | node_modules/serve-static/node_modules/encodeurl | production/runtime |
| server-only | 0.0.1 | node_modules/server-only | production/runtime |
| set-function-length | 1.2.2 | node_modules/set-function-length | development |
| set-function-name | 2.0.2 | node_modules/set-function-name | development |
| set-proto | 1.0.0 | node_modules/set-proto | development |
| setimmediate | 1.0.5 | node_modules/setimmediate | production/runtime |
| sf-symbols-typescript | 2.2.0 | node_modules/sf-symbols-typescript | production/runtime |
| shebang-command | 2.0.0 | node_modules/shebang-command | production/runtime |
| shebang-regex | 3.0.0 | node_modules/shebang-regex | production/runtime |
| shell-quote | 1.12.0 | node_modules/shell-quote | production/runtime |
| side-channel | 1.1.1 | node_modules/side-channel | development |
| side-channel-list | 1.0.1 | node_modules/side-channel-list | development |
| side-channel-map | 1.0.1 | node_modules/side-channel-map | development |
| side-channel-weakmap | 1.0.2 | node_modules/side-channel-weakmap | development |
| simple-plist | 1.3.1 | node_modules/simple-plist | production/runtime |
| simple-swizzle | 0.2.4 | node_modules/simple-swizzle | production/runtime |
| sisteransi | 1.0.5 | node_modules/sisteransi | production/runtime |
| slash | 3.0.0 | node_modules/slash | production/runtime |
| slugify | 1.6.9 | node_modules/slugify | production/runtime |
| source-map-support | 0.5.21 | node_modules/source-map-support | production/runtime |
| stable-hash | 0.0.5 | node_modules/stable-hash | development |
| stack-generator | 2.0.10 | node_modules/stack-generator | development |
| stack-utils | 2.0.6 | node_modules/stack-utils | production/runtime |
| stack-utils/node_modules/escape-string-regexp | 2.0.0 | node_modules/stack-utils/node_modules/escape-string-regexp | production/runtime |
| stackframe | 1.3.4 | node_modules/stackframe | production/runtime |
| stacktrace-gps | 3.1.2 | node_modules/stacktrace-gps | development |
| stacktrace-js | 2.0.2 | node_modules/stacktrace-js | development |
| stacktrace-parser | 0.1.11 | node_modules/stacktrace-parser | production/runtime |
| standard-navigation | 0.0.5 | node_modules/standard-navigation | production/runtime |
| statuses | 1.5.0 | node_modules/statuses | production/runtime |
| stop-iteration-iterator | 1.1.0 | node_modules/stop-iteration-iterator | development |
| string-length | 4.0.2 | node_modules/string-length | production/runtime |
| string-width | 4.2.3 | node_modules/string-width | production/runtime |
| string-width-cjs | 4.2.3 | node_modules/string-width-cjs | production/runtime |
| string.prototype.matchall | 4.1.0 | node_modules/string.prototype.matchall | development |
| string.prototype.repeat | 1.0.0 | node_modules/string.prototype.repeat | development |
| string.prototype.trim | 1.2.11 | node_modules/string.prototype.trim | development |
| string.prototype.trimend | 1.0.10 | node_modules/string.prototype.trimend | development |
| string.prototype.trimstart | 1.0.8 | node_modules/string.prototype.trimstart | development |
| strip-ansi | 6.0.1 | node_modules/strip-ansi | production/runtime |
| strip-ansi-cjs | 6.0.1 | node_modules/strip-ansi-cjs | production/runtime |
| strip-bom | 4.0.0 | node_modules/strip-bom | production/runtime |
| strip-final-newline | 2.0.0 | node_modules/strip-final-newline | production/runtime |
| strip-indent | 3.0.0 | node_modules/strip-indent | production/runtime |
| strip-json-comments | 3.1.1 | node_modules/strip-json-comments | production/runtime |
| structured-headers | 0.4.1 | node_modules/structured-headers | production/runtime |
| styleq | 0.1.3 | node_modules/styleq | production/runtime |
| supports-color | 7.2.0 | node_modules/supports-color | production/runtime |
| supports-hyperlinks | 2.3.0 | node_modules/supports-hyperlinks | production/runtime |
| supports-preserve-symlinks-flag | 1.0.0 | node_modules/supports-preserve-symlinks-flag | production/runtime |
| symbol-tree | 3.2.4 | node_modules/symbol-tree | development |
| synckit | 0.11.13 | node_modules/synckit | production/runtime |
| terminal-link | 2.1.1 | node_modules/terminal-link | production/runtime |
| terser/node_modules/commander | 2.20.3 | node_modules/terser/node_modules/commander | production/runtime |
| test-exclude/node_modules/balanced-match | 1.0.2 | node_modules/test-exclude/node_modules/balanced-match | development |
| test-exclude/node_modules/brace-expansion | 1.1.21 | node_modules/test-exclude/node_modules/brace-expansion | development |
| test-renderer | 1.3.0 | node_modules/test-renderer | production/runtime |
| throat | 5.0.0 | node_modules/throat | production/runtime |
| tinyglobby | 0.2.17 | node_modules/tinyglobby | production/runtime |
| tinyglobby/node_modules/fdir | 6.5.0 | node_modules/tinyglobby/node_modules/fdir | production/runtime |
| tinyglobby/node_modules/picomatch | 4.0.7 | node_modules/tinyglobby/node_modules/picomatch | production/runtime |
| tldts | 6.1.86 | node_modules/tldts | development |
| tldts-core | 6.1.86 | node_modules/tldts-core | development |
| to-regex-range | 5.0.1 | node_modules/to-regex-range | production/runtime |
| toidentifier | 1.0.1 | node_modules/toidentifier | production/runtime |
| toqr | 0.1.1 | node_modules/toqr | production/runtime |
| tr46 | 5.1.1 | node_modules/tr46 | development |
| ts-api-utils | 2.5.0 | node_modules/ts-api-utils | development |
| tsconfig-paths | 3.15.0 | node_modules/tsconfig-paths | development |
| tsconfig-paths/node_modules/json5 | 1.0.2 | node_modules/tsconfig-paths/node_modules/json5 | development |
| tsconfig-paths/node_modules/strip-bom | 3.0.0 | node_modules/tsconfig-paths/node_modules/strip-bom | development |
| tsx | 4.23.15 | node_modules/tsx | development |
| tsx/node_modules/@esbuild/aix-ppc64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/aix-ppc64 | development, optional |
| tsx/node_modules/@esbuild/android-arm | 0.28.2 | node_modules/tsx/node_modules/@esbuild/android-arm | development, optional |
| tsx/node_modules/@esbuild/android-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/android-arm64 | development, optional |
| tsx/node_modules/@esbuild/android-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/android-x64 | development, optional |
| tsx/node_modules/@esbuild/darwin-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/darwin-arm64 | development, optional |
| tsx/node_modules/@esbuild/darwin-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/darwin-x64 | development, optional |
| tsx/node_modules/@esbuild/freebsd-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/freebsd-arm64 | development, optional |
| tsx/node_modules/@esbuild/freebsd-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/freebsd-x64 | development, optional |
| tsx/node_modules/@esbuild/linux-arm | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-arm | development, optional |
| tsx/node_modules/@esbuild/linux-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-arm64 | development, optional |
| tsx/node_modules/@esbuild/linux-ia32 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-ia32 | development, optional |
| tsx/node_modules/@esbuild/linux-loong64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-loong64 | development, optional |
| tsx/node_modules/@esbuild/linux-mips64el | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-mips64el | development, optional |
| tsx/node_modules/@esbuild/linux-ppc64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-ppc64 | development, optional |
| tsx/node_modules/@esbuild/linux-riscv64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-riscv64 | development, optional |
| tsx/node_modules/@esbuild/linux-s390x | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-s390x | development, optional |
| tsx/node_modules/@esbuild/linux-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/linux-x64 | development, optional |
| tsx/node_modules/@esbuild/netbsd-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/netbsd-arm64 | development, optional |
| tsx/node_modules/@esbuild/netbsd-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/netbsd-x64 | development, optional |
| tsx/node_modules/@esbuild/openbsd-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/openbsd-arm64 | development, optional |
| tsx/node_modules/@esbuild/openbsd-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/openbsd-x64 | development, optional |
| tsx/node_modules/@esbuild/openharmony-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/openharmony-arm64 | development, optional |
| tsx/node_modules/@esbuild/sunos-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/sunos-x64 | development, optional |
| tsx/node_modules/@esbuild/win32-arm64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/win32-arm64 | development, optional |
| tsx/node_modules/@esbuild/win32-ia32 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/win32-ia32 | development, optional |
| tsx/node_modules/@esbuild/win32-x64 | 0.28.2 | node_modules/tsx/node_modules/@esbuild/win32-x64 | development, optional |
| tsx/node_modules/esbuild | 0.28.2 | node_modules/tsx/node_modules/esbuild | development |
| type-check | 0.4.0 | node_modules/type-check | development |
| type-detect | 4.0.8 | node_modules/type-detect | production/runtime |
| typed-array-buffer | 1.0.3 | node_modules/typed-array-buffer | development |
| typed-array-byte-length | 1.0.3 | node_modules/typed-array-byte-length | development |
| typed-array-byte-offset | 1.0.5 | node_modules/typed-array-byte-offset | development |
| typed-array-length | 1.0.8 | node_modules/typed-array-length | development |
| ua-parser-js | 1.0.41 | node_modules/ua-parser-js | production/runtime |
| unbox-primitive | 1.1.0 | node_modules/unbox-primitive | development |
| undici-types | 8.9.0 | node_modules/undici-types | production/runtime |
| unicode-canonical-property-names-ecmascript | 2.0.1 | node_modules/unicode-canonical-property-names-ecmascript | production/runtime |
| unicode-match-property-ecmascript | 2.0.0 | node_modules/unicode-match-property-ecmascript | production/runtime |
| unicode-match-property-value-ecmascript | 2.2.1 | node_modules/unicode-match-property-value-ecmascript | production/runtime |
| unicode-property-aliases-ecmascript | 2.2.0 | node_modules/unicode-property-aliases-ecmascript | production/runtime |
| unimodules-app-loader | 58.0.2 | node_modules/unimodules-app-loader | production/runtime |
| unpipe | 1.0.0 | node_modules/unpipe | production/runtime |
| unrs-resolver | 1.13.0 | node_modules/unrs-resolver | production/runtime |
| update-browserslist-db | 1.3.4 | node_modules/update-browserslist-db | production/runtime |
| use-latest-callback | 0.2.6 | node_modules/use-latest-callback | production/runtime |
| utils-merge | 1.0.1 | node_modules/utils-merge | production/runtime |
| vary | 1.1.2 | node_modules/vary | production/runtime |
| vlq | 1.0.1 | node_modules/vlq | production/runtime |
| w3c-xmlserializer | 5.0.0 | node_modules/w3c-xmlserializer | development |
| warn-once | 0.1.1 | node_modules/warn-once | production/runtime |
| wcwidth | 1.0.1 | node_modules/wcwidth | production/runtime |
| whatwg-encoding | 3.1.1 | node_modules/whatwg-encoding | development |
| whatwg-fetch | 3.6.20 | node_modules/whatwg-fetch | production/runtime |
| whatwg-mimetype | 4.0.0 | node_modules/whatwg-mimetype | development |
| whatwg-url | 14.2.0 | node_modules/whatwg-url | development |
| whatwg-url-minimum | 0.2.0 | node_modules/whatwg-url-minimum | production/runtime |
| which-boxed-primitive | 1.1.1 | node_modules/which-boxed-primitive | development |
| which-builtin-type | 1.2.1 | node_modules/which-builtin-type | development |
| which-collection | 1.0.2 | node_modules/which-collection | development |
| which-typed-array | 1.1.24 | node_modules/which-typed-array | development |
| word-wrap | 1.2.5 | node_modules/word-wrap | development |
| wrap-ansi | 7.0.0 | node_modules/wrap-ansi | production/runtime |
| wrap-ansi-cjs | 7.0.0 | node_modules/wrap-ansi-cjs | production/runtime |
| ws | 7.5.13 | node_modules/ws | production/runtime |
| xml2js | 0.6.0 | node_modules/xml2js | production/runtime |
| xml2js/node_modules/xmlbuilder | 11.0.1 | node_modules/xml2js/node_modules/xmlbuilder | production/runtime |
| xmlbuilder | 15.1.1 | node_modules/xmlbuilder | production/runtime |
| xmlchars | 2.2.0 | node_modules/xmlchars | development |
| yargs | 17.7.3 | node_modules/yargs | production/runtime |
| yocto-queue | 0.1.0 | node_modules/yocto-queue | production/runtime |
| zod | 4.6.7 | node_modules/zod | development |
| zod-validation-error | 4.0.2 | node_modules/zod-validation-error | development |

### MIT-0 (1 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| @csstools/color-helpers | 5.1.0 | node_modules/@csstools/color-helpers | development |

### MPL-2.0 (12 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| lightningcss | 1.33.0 | node_modules/lightningcss | production/runtime |
| lightningcss-android-arm64 | 1.33.0 | node_modules/lightningcss-android-arm64 | production/runtime, optional |
| lightningcss-darwin-arm64 | 1.33.0 | node_modules/lightningcss-darwin-arm64 | production/runtime, optional |
| lightningcss-darwin-x64 | 1.33.0 | node_modules/lightningcss-darwin-x64 | production/runtime, optional |
| lightningcss-freebsd-x64 | 1.33.0 | node_modules/lightningcss-freebsd-x64 | production/runtime, optional |
| lightningcss-linux-arm-gnueabihf | 1.33.0 | node_modules/lightningcss-linux-arm-gnueabihf | production/runtime, optional |
| lightningcss-linux-arm64-gnu | 1.33.0 | node_modules/lightningcss-linux-arm64-gnu | production/runtime, optional |
| lightningcss-linux-arm64-musl | 1.33.0 | node_modules/lightningcss-linux-arm64-musl | production/runtime, optional |
| lightningcss-linux-x64-gnu | 1.33.0 | node_modules/lightningcss-linux-x64-gnu | production/runtime, optional |
| lightningcss-linux-x64-musl | 1.33.0 | node_modules/lightningcss-linux-x64-musl | production/runtime, optional |
| lightningcss-win32-arm64-msvc | 1.33.0 | node_modules/lightningcss-win32-arm64-msvc | production/runtime, optional |
| lightningcss-win32-x64-msvc | 1.33.0 | node_modules/lightningcss-win32-x64-msvc | production/runtime, optional |

### Python-2.0 (1 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| argparse | 2.0.1 | node_modules/argparse | production/runtime |

### Unlicense (2 entries)

| Package | Version | Dependency path | Build classification |
|---|---:|---|---|
| big-integer | 1.6.52 | node_modules/big-integer | production/runtime |
| stream-buffers | 2.2.0 | node_modules/stream-buffers | production/runtime |

## 5. SQLCipher and SQLite notices — native build verification required

The repository app configuration enables expo-sqlite with useSQLCipher set to true. Expo documentation states that SQLCipher support requires a custom native build; Expo Go does not include it. The npm package license metadata for expo-sqlite is MIT, but that alone does not satisfy the separate SQLCipher Community Edition attribution requirement.

SQLCipher Community Edition is distributed under a BSD-style license. Zetetic requires the copyright/license statements to be reproduced prominently in the application and documentation. Verify the exact SQLCipher source/version embedded by the Expo SDK/native build before release. Prior project acceptance records identified SQLCipher Community Edition 4.17.0; this inventory has not independently extracted that version from the current APK/IPA.

### SQLCipher Community Edition — attribution text

Copyright (c) 2025, ZETETIC LLC. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of ZETETIC LLC nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY ZETETIC LLC “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL ZETETIC LLC BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Official SQLCipher license information: https://www.zetetic.net/sqlcipher/license/  
Official SQLCipher Community Edition guidance: https://www.zetetic.net/sqlcipher/community/  
Expo SQLite SQLCipher configuration documentation: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/

## 6. Compliance and maintenance rules

1. Keep each dependency's original license and copyright notices; do not replace them with the FinaTec proprietary notice.
2. Preserve upstream NOTICE files where required, especially for Apache-2.0 components.
3. For MPL-2.0 components, do not apply the FinaTec proprietary notice to MPL-covered files; publish source for covered modifications when required by MPL-2.0 distribution rules.
4. For CC-BY-4.0 material, retain attribution, link to the license, and indicate changes where applicable.
5. For dual-license packages, verify the actual package release's selected licensing alternative and upstream notices.
6. Rebuild this inventory whenever package-lock.json changes and before each production release.
7. Produce a native/binary SBOM from the final Android and iOS build pipelines and reconcile it with this npm inventory.
8. Provide a user-accessible Open Source Licenses / Legal Notices screen or linked documentation in the released application, including SQLCipher attribution where used.

## 7. References

- SPDX License List: https://spdx.org/licenses/
- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0
- Apache guidance on NOTICE: https://www.apache.org/legal/apply-license
- Mozilla Public License 2.0 FAQ: https://www.mozilla.org/en-US/MPL/2.0/FAQ/
- SQLCipher license: https://www.zetetic.net/sqlcipher/license/
- Expo SQLite SDK documentation: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/

Generated from lockfile metadata. Verify against the exact source archives and binaries before public distribution.
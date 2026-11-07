# FinaTec — Intellectual Property & Software License Audit

**Audit date:** 2026-11-07  
**Repository:** launnguyen001/FinaTec  
**Branch reviewed:** main  
**Claimed individual owner for original FinaTec materials:** NGUYEN NGOC LAU  
**Status:** Preliminary repository and npm dependency audit completed; final release clearance remains open.

> Scope limitation: This is technical/legal-information support, not a formal legal opinion or a verification of title. The owner name supplied by the project owner is recorded as the intended rights holder. It has not been independently verified against identity documents, contracts, contributor records, or source-code provenance.

## 1. Executive summary

1. The repository's previous root LICENSE was an MIT license carrying a copyright notice for 650 Industries, Inc. (Expo), dated 2015-present. That notice did not identify the intended FinaTec owner and was not an appropriate proprietary license statement for original FinaTec materials.
2. The root LICENSE has now been replaced with a custom proprietary notice for original materials owned or lawfully controlled by NGUYEN NGOC LAU. The notice expressly excludes third-party components and does not purport to relicense them.
3. package-lock.json uses lockfileVersion 3 and contains 1474 package entries: 1006 marked production/runtime and 468 marked development-only. All 1474 entries have a declared license field in the lockfile metadata.
4. The npm inventory includes MIT, ISC, Apache-2.0, BSD, BlueOak, Unlicense, Python-2.0, CC-BY-4.0, MPL-2.0 and dual-license expressions. The detailed inventory is in THIRD_PARTY_NOTICES.md.
5. expo-sqlite is a direct dependency and app.json enables useSQLCipher. SQLCipher Community Edition has separate BSD-style attribution requirements. A native build-level review is still required to confirm exact bundled versions and notices.
6. This repository-level review does not establish ownership of every file or contribution. Chain of title, template provenance, AI-assisted contributions, and any third-party source copied into the repository remain verification items.

## 2. Files reviewed

| File | What it establishes |
|---|---|
| LICENSE | Existing license notice and copyright line |
| package.json | Direct runtime and development dependencies |
| package-lock.json | Resolved npm dependency tree and declared license metadata |
| app.json | Expo configuration, including expo-sqlite SQLCipher option |
| README.md | Project description and repository documentation context |

## 3. License and ownership changes made

### 3.1 Root LICENSE

The root LICENSE now states a proprietary / all-rights-reserved position for original FinaTec materials owned or lawfully controlled by NGUYEN NGOC LAU. It explicitly says that third-party software is excluded and remains subject to its own license terms.

SPDX identifier used: LicenseRef-FinaTec-Proprietary. This is a project-specific identifier, not an OSI-approved open-source license.

### 3.2 Third-party inventory

THIRD_PARTY_NOTICES.md records all 1474 package entries found in package-lock.json, grouped by the declared license identifier, including package name, resolved version, dependency path, and whether npm marks the entry as development or production/runtime. It also highlights non-permissive or attribution-sensitive entries and SQLCipher.

## 4. Findings and risk register

| ID | Finding | Risk | Required action | Status |
|---|---|---|---|---|
| IP-01 | Previous MIT file named Expo as copyright holder | High | Replace root license; do not claim Expo-owned code | Completed in repository |
| IP-02 | Individual owner identity supplied as NGUYEN NGOC LAU | High | Preserve identity and authorship evidence; confirm legal name/ownership with counsel | Owner declaration recorded; evidence not independently verified |
| IP-03 | Repository includes Expo template/framework-derived project structure | Medium | Compare initial scaffold and generated files with upstream template; keep upstream notices | Open |
| IP-04 | 1,474 npm package entries with mixed license identifiers | Medium | Maintain notices and run automated license policy checks on dependency updates | Inventory created; upstream text verification pending |
| IP-05 | 12 MPL-2.0 package entries in the lockfile, including platform-specific optional Lightning CSS packages | High | Confirm which files are shipped; do not modify/relicense MPL-covered source; provide source for covered modifications if required | Build-level verification open |
| IP-06 | node-forge metadata declares BSD-3-Clause OR GPL-2.0 | Medium | Verify the exact package archive and selected alternative; retain relevant notices | Open |
| IP-07 | caniuse-lite declares CC-BY-4.0 | Medium | Verify the relevant data is redistributed and preserve attribution where required | Open |
| IP-08 | argparse declares Python-2.0 | Low/Medium | Retain upstream copyright/license notice | Open |
| IP-09 | expo-sqlite configured with useSQLCipher=true | High | Verify actual native SQLCipher version and include Zetetic attribution in app/docs | Notice drafted; final binary verification open |
| IP-10 | npm lockfile does not enumerate all native Android/iOS dependencies and build toolchain components | High | Generate Android/iOS binary SBOMs and inspect Gradle/Maven, CocoaPods, native source, SDK/NDK and bundled artifacts | Open |
| IP-11 | Git history and file-level authorship are not fully audited | High | Review commits, authors, AI-agent contributions, imported code and external contributions | Open |
| IP-12 | No evidence reviewed for signed contributor/contractor IP assignments | High | Obtain written assignment/license agreements from every human contributor or contractor where applicable | Open |

## 5. Detailed npm dependency findings

- Total package entries: 1474.
- Production/runtime classification: 1006.
- Development classification: 468.
- Missing license metadata in lockfile: 0.
- License expressions needing focused review: MPL-2.0, CC-BY-4.0, Python-2.0, and BSD-3-Clause OR GPL-2.0.
- Direct production dependencies include Expo modules, React, React Native, Drizzle ORM and related platform packages. Drizzle ORM is declared Apache-2.0; Expo/React/React Native direct packages are declared MIT.

Important interpretation: the npm lockfile's dev flag is package-manager metadata, not a definitive statement that a package can never be included in a release artifact. Optional packages may be platform-specific. The final binary determines the shipped component set.

## 6. SQLCipher / SQLite review

app.json enables useSQLCipher through expo-sqlite. Expo documentation confirms that SQLCipher support requires a custom native build and that Expo Go does not contain SQLCipher. SQLCipher Community Edition is BSD-style licensed and Zetetic requires prominent attribution in the application and/or accompanying documentation.

Prior project acceptance evidence identified SQLCipher Community Edition 4.17.0. That version is recorded as historical project evidence only; this audit has not independently extracted the exact SQLCipher source version from the current production APK/IPA. Before release, confirm native resolved version, exact license text, and whether the app displays the required attribution.

## 7. Ownership / chain-of-title review

Copyright protection for computer programs is recognized under Vietnamese intellectual property law. However, authorship and ownership are not interchangeable: a person may be an author while economic rights may belong to another rights holder under assignment, employment, commissioned-work or other applicable arrangements.

Before asserting exclusive ownership of all FinaTec materials, retain:

1. A dated record of the original product concept, architecture, specifications, designs and source-code creation.
2. Git commit history and repository access records showing contributions and authorship.
3. Written IP assignment or license agreements for any contractor, employee, collaborator or other human contributor whose work is included.
4. A record of AI-assisted development: prompts/tasks, generated patches, human review, edits, tests and decisions. Do not assume that AI output alone establishes exclusive copyright ownership.
5. A provenance record for files derived from Expo templates, example projects, copied snippets, icons, fonts, illustrations, documentation or other external sources.
6. A trademark clearance and registration review for the FinaTec name/logo if brand exclusivity is important.

Do not represent that NGUYEN NGOC LAU owns Expo, React, React Native, Drizzle ORM, SQLCipher, SQLite, or other third-party components. The intended proprietary claim covers only original FinaTec materials for which the owner can substantiate rights.

## 8. Vietnamese legal context and limitations

Vietnam's Law on Intellectual Property recognizes computer programs as copyright-protected works. The relevant statutory framework includes Law No. 50/2005/QH11 as amended, including Law No. 07/2022/QH15 and Law No. 131/2025/QH15 (effective 2026-04-01). The 2025 amendment adds provisions addressing IP rights in objects created using AI systems; the application of those provisions and implementing rules to specific AI-assisted software contributions should be confirmed by Vietnamese IP counsel.

This audit is not a legal opinion, does not determine title, and does not guarantee enforceability of the proprietary notice in every jurisdiction. A Vietnamese IP lawyer should review the final license, chain-of-title documents, AI-assisted contribution records, and commercial distribution terms.

## 9. Release gates — required before production distribution

- [ ] Confirm the legal identity and address/contact details of the individual rights holder for formal agreements and registration documents.
- [ ] Complete a file-level provenance review, especially the initial Expo scaffold and copied/generated assets.
- [ ] Obtain written rights assignments or contributor agreements from all human contributors where necessary.
- [ ] Review AI-assisted code and creative assets under current Vietnamese law and relevant platform/provider terms.
- [ ] Generate Android and iOS SBOMs from the exact release artifacts; reconcile them against THIRD_PARTY_NOTICES.md.
- [ ] Verify the exact upstream license and NOTICE texts for every shipped dependency, including Apache-2.0 packages.
- [ ] Confirm MPL-2.0 package inclusion/modification and publish covered source when required by MPL-2.0.
- [ ] Confirm node-forge's applicable license alternative and package notices.
- [ ] Confirm CC-BY-4.0 attribution obligations for redistributed material.
- [ ] Confirm SQLCipher Community Edition version and place the required attribution in the app and/or accompanying documentation.
- [ ] Add a user-facing Open Source Licenses / Legal Notices destination in the production app.
- [ ] Prepare separate Terms of Use / EULA, Privacy Policy, and trademark strategy; the root source-code LICENSE is not an end-user agreement.

## 10. Legal references

- Vietnam Law on Intellectual Property (latest consolidated text located during this audit, 160/2026/VBHN-LQ-VPQH, dated 2026-09-29): https://thuvienphapluat.vn/van-ban/So-huu-tri-tue/Van-ban-hop-nhat-160-2026-VBHN-LQ-VPQH-Luat-So-huu-tri-tue-728317.aspx
- Law No. 131/2025/QH15 (effective 2026-04-01): https://vanban.chinhphu.vn/?docid=216511&pageid=27160
- Law No. 07/2022/QH15: https://chinhphu.vn/?classid=1&docid=206240&orggroupid=1&pageid=27160
- WIPO Lex — Vietnam IP Law: https://www.wipo.int/wipolex/
- Apache-2.0 license and notice guidance: https://www.apache.org/licenses/LICENSE-2.0 and https://www.apache.org/legal/apply-license
- MPL-2.0 FAQ: https://www.mozilla.org/en-US/MPL/2.0/FAQ/
- SQLCipher license: https://www.zetetic.net/sqlcipher/license/
- Expo SQLite SDK 58 documentation: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/

## 11. Audit conclusion

The previous root MIT notice has been removed from the repository's root licensing position and replaced by a proprietary notice scoped to original FinaTec materials owned or lawfully controlled by NGUYEN NGOC LAU. A package-level npm dependency inventory has been created. Third-party components retain their original licenses.

FinaTec is not yet cleared for a legal claim that every file is exclusively owned by the named individual or for production distribution from a third-party-license compliance perspective. The open release gates above are material and must be completed before release.
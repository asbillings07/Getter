# Unreleased website-access update

The current branch adds optional per-site and all-website access. Its 3.1.1 manifest is for unpacked testing only; choose a higher version and obtain current review, Chrome acceptance and release authorization before building a store update. PR #18’s release authorization covers only the prior usage/alignment release. The historical 3.1.1 preparation details below do not authorize this new candidate.

## Prior Getter 3.1.1 submission preparation

This package follows the owner's Chrome acceptance of the usage-percentage cards and color-alignment correction, with explicit authorization to complete independent review, merge passing PR #18 and build the Chrome Web Store ZIP. The owner selected **3.1.1** for the frequency feature and alignment patch. Uploading or submitting the store item is a separate action; preparing this package does not change the dashboard or establish publication.

## Item and release

- Existing item: [Getter](https://chromewebstore.google.com/detail/getter/nkgabfmcijbajgobbeloaobhbhpacnim), ID `nkgabfmcijbajgobbeloaobhbhpacnim`. Update this item rather than creating another listing.
- The public listing checked November 23, 2026 reports **3.0.0**, updated November 22, 2026. That public page does not establish the highest uploaded draft or review state. Inspect the authenticated dashboard before uploading; do not cancel an existing review automatically.
- Release version: **3.1.1**, as requested by the owner and consistently recorded in the manifest, package and lockfile. This is higher than the currently published version, as required for a store update.
- Owner-accepted behavior: `8330ef218095da877f9a9f0730a252339bae6309`. This includes usage percentages, most/least-used sorting and top-aligned color blocks beside wrapped labels. The release delta updates only version/documentation metadata. Compare the production build with the accepted test package to confirm that the manifest version is the only changed shipped content. Record the final independent review, CI and merge SHA in PR #18 and the release verification notes.
- Support: **support@aptelum.com**. No support email is sent as part of preparation.
- Privacy notice: [PRIVACY.md](https://github.com/asbillings07/Getter/blob/main/PRIVACY.md). Verify the merged privacy notice is publicly accessible before submission.

## Listing fields

**Name:** Getter

**Short description:** Explore colors, fonts, images, text and element styles in a popup or side panel. Created by Aptelum Labs.

**Detailed description:** Use [store-description.txt](store-description.txt) verbatim. It replaces the older listing's statement that text extraction and element-level inspection are unavailable.

**Single purpose:** Help people inspect the design and visible content of a webpage they choose, and copy or save those details through a popup or side panel.

**Category and language:** Preserve Workflow & Planning and English (United States), as displayed by the current public listing. Preserve the existing publisher, distribution, homepage and support settings unless the owner requests a change. The repository and issue tracker remain the proposed product/support destinations; do not change company domains or other store items.

## Screenshots

Prepare five **1280 × 800** PNG screenshots using the actual merged extension UI and non-sensitive demonstration data. Capture-only framing may add descriptive text beside the UI, but must not invent controls, values or behavior. The shipped ZIP must not contain capture pages or capture-only host grants.

Recommended order:

1. **Colors / popup** — the existing palette cards with usage percentages and the Most used first / Least used first control; Fonts and Images remain available alongside it.
2. **Text / side panel** — the source selector, copy/save actions and extracted text.
3. **Inspect / Layout** — compact selected-element header, dimensions, box model and layout values.
4. **Inspect / Element** — attributes and a readable long value, in dark appearance; Styles and Effects remain visible section choices.
5. **Settings** — Popup / Side panel default, appearance and the preview/display toggles.

Use the existing approved Getter icon and exact Aptelum attribution asset. Screenshot assets are separate from the extension ZIP. Do not substitute design mocks for screenshots of the accepted build. Store submission accepts a maximum of five screenshots; optional promotional assets are a separate category.

## Permissions and data disclosures

| Permission    | Purpose in Getter                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| activeTab     | Temporary access to the selected page when Getter is invoked from its toolbar action.                                                  |
| scripting     | Run bounded extraction and the on-demand element picker in the permitted document; verify document identity before using results.      |
| storage       | Save local preferences and hold short-lived, in-memory workspace transfers. No persistent inspection history or telemetry.             |
| downloads     | Start requested text, image and ZIP downloads and observe only their owned IDs while the workspace is loaded.                          |
| webNavigation | Identify the current page, enumerate its frames, pin document identities and report omitted frames. No background navigation listener. |
| sidePanel     | Offer a persistent workspace beside the webpage and host element-level Inspect.                                                        |

The website-access candidate has no required host grants, web-accessible resources or remote executable code. It declares optional `http://*/*` and `https://*/*` so Scan again can request the current site and the user can separately choose all-website access in Getter Settings. Requests use Chrome’s consent flow; access can be revoked and requested again. Relative to 3.1.1, these optional patterns are the only added permissions. No provider keys or credentials are required.

The public listing currently discloses Website content and Web history. Getter handles selected-page/frame addresses locally to identify the active document; this does not mean it collects a background browsing history. Review these declarations against the merged privacy notice and the dashboard's current definitions. Website content now also includes extracted text and selected element attributes/computed styles. Preferences are local; view transfers use browser-session memory. Chrome can retain a hidden side panel's in-memory results until navigation, rescan or view release. Hiding the panel pauses selection.

Previews contact HTTPS image hosts when enabled, including through the saved default. File-size reads and downloads require explicit requests and use bounded credential-free/referrer-free fetches with redirects rejected. Only prepared local blobs reach Chrome's downloader. Do not claim that the feature handles no website data or makes no network requests. Getter has no account system, analytics, advertising or backend receiving inspection results. Voluntary support emails are separate from extension telemetry.

Dashboard limited-use, trader and account certifications must remain truthful owner declarations. This document does not make or submit those attestations.

## Store reviewer steps

No account, payment or credentials are needed. Requires Chrome 141 or newer.

1. Open an ordinary webpage and invoke Getter from the toolbar. Explore Colors and Fonts, check the usage percentages, and toggle Most used first / Least used first. Use the info icon to read the measurement limits. Confirm that short HEX and wrapped OKLCH color blocks align at the top. Copy a color, then explore Images and optionally request a preview or download.
2. Open Text and compare Page, Main content and Selection. Find text, copy a block, copy the source and save a .txt file. Select text before opening the popup, or use the side panel and Extract selection.
3. Choose Inspect. It opens in the side panel. Click several elements, then pause selection to interact normally with the page; resume to select again.
4. Explore Styles, Layout, Effects and Element. Search within a section, show additional properties, copy a value and preview/copy CSS. Missing attributes are labeled Not set. The compact header shows the selected element name.
5. In Settings, change the preferred workspace and appearance. Reopen Getter to check persistence. Use the button beside Settings to switch once without changing the saved default.
6. Reload the page or change tabs. Old results clear. On an unapproved site, Scan again asks for that site and continues after approval. Denial leaves it unread. In Getter Settings, grant all-website access, revoke it and request it again; also verify the switch updates after Chrome changes access externally. Restricted pages show an explanation and never request host access.

Frames, closed components and certain resources are inaccessible. Scans and exports are bounded and report limits. Native Save As may close a popup; Chrome Downloads supplies the final outcome. See [architecture and QA](refresh.md#verification-and-remaining-owner-qa) for the full scope and test limitations.

## Release and submission gates

Before merge, record the exact immutable candidate, passing required `Getter checks`, resolved review threads, independent review and the owner's Chrome acceptance/merge authorization. Release metadata changes preserve the accepted UI; any material behavior change requires assessing renewed owner QA.

Before uploading, verify that the ZIP was built from merged source, contains production files at its root, matches its recorded checksum, and contains no tests, test-only grants or capture pages. Verify screenshot dimensions/content, listing copy and the public privacy/source links. Inspect the existing dashboard draft/review state and highest uploaded version before changing it. Do not cancel a pending review or alter distribution automatically.

Submission and publication require the applicable owner instruction for the concrete package and declarations. Passing tests, merging source and building a ZIP do not establish a Chrome Web Store release. After publication, verify the intended public version and install/update behavior separately.

## Protection check

GitHub's effective rules for `main` were read on November 21, 2026: pull requests, resolved review discussions and an up-to-date passing `Getter checks` result are required; branch deletion and force pushes are blocked. Formal approving review count is zero, consistent with the single-account setup. Independent source review and the owner's final human-QA merge decision remain recorded gates. Do not bypass these protections.

## Official references

The public listing and update-version requirements were rechecked November 23, 2026. Other references below were checked November 21, 2026.

- [Store images](https://developer.chrome.com/docs/webstore/images): 1280 × 800 or 640 × 400 screenshots; maximum five; demonstrate the actual experience.
- [Listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing): detailed description, screenshots and related links.
- [Updating an existing item](https://developer.chrome.com/docs/webstore/update): versioned package and update workflow.
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use): disclosures and owner certifications.

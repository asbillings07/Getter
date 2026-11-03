# Getter 2.1.0 submission preparation

Owner: @asbillings07. Tracks #8 and #11; depends on #6 and the ZIP repair in #9 / PR #10. **Candidate preparation only: human QA, merge and store submission/publication remain separate decisions.** Do not upload or submit from this checklist alone.

## Existing item and candidate

- Existing item: [Getter](https://chromewebstore.google.com/detail/getter/nkgabfmcijbajgobbeloaobhbhpacnim), ID `nkgabfmcijbajgobbeloaobhbhpacnim`.
- Public listing checked November 3, 2026: version 2.0.0, last updated June 19, 2024, offered by `abdevelops`. Preserve this item's identity; this refresh is an update, not a duplicate listing.
- Google's update service supplied the current 2.0.0 CRX (544,744 bytes; SHA-256 `876a883e87ab2c0f31fab9f42bb29b04a9530e5d1737dbf41deabaa596160b63`). Its manifest independently confirms version 2.0.0. It was downloaded/read without running it. Downloading an archive is not upgrade QA or cryptographic signature verification.
- Proposed version: **2.1.0**, consistently recorded in the manifest, package and lockfile. Authenticated dashboard inspection on November 3, 2026 confirmed both Draft and Published packages are 2.0.0, with no higher draft displayed. Recheck before uploading.
- Approved support/privacy email: **support@aptelum.com**, selected by the owner November 3, 2026. No email was sent and mailbox delivery has not been tested.
- Proposed privacy URL after merge: `https://github.com/asbillings07/Getter/blob/main/PRIVACY.md`. Verify that the final accepted notice is publicly accessible before submission. Do not point the store at a missing file or an unaccepted draft.

## Listing copy for owner review

**Name:** Getter

**Short description:** Explore colors, fonts and images on the page you choose. Created by Aptelum Labs.

**Detailed description:**

Notice the details that make a webpage work. Getter helps designers and developers explore colors, typography and images in a compact browser popup.

- Explore the page palette and copy color values.
- Inspect font families and style details, with display preferences saved on your device.
- See image dimensions, request previews or file sizes, and choose individual downloads or a bounded ZIP export.
- Review included and unavailable image counts before saving a ZIP.

Open Getter from the toolbar on the page you want to inspect. Page results stay in the popup; image requests happen only when you choose them. Browser settings, the Chrome Web Store and other restricted pages cannot be inspected. Some frames and image hosts are inaccessible, and large pages use a limited scan. Getter shows those limits rather than promising complete coverage.

Created by Aptelum Labs. Support: support@aptelum.com.

This release covers colors, fonts and images. It does not provide general text extraction or element-level CSS inspection.

**Proposed single purpose:** Help designers and developers inspect the colors, typography and images of a webpage they explicitly choose, and copy or download those details on request.

**Category:** the authenticated dashboard confirms Workflow & Planning and English (United States). It already shows Aptelum Labs as the selected publisher; no publisher setting was changed. Keep those values. Developer account changes can affect other items; review them separately. Preserve current distribution settings. Do not change the main company website/domain to obtain a listing URL. The current draft has empty homepage/support URLs, no displayed screenshots, and legacy promo video/tiles. Replace or remove outdated promotional content only as part of the accepted listing package; do not imply it depicts the new UI. Proposed homepage and support URLs are the public Getter repository and its issues page, with support@aptelum.com prominent in the description and privacy notice.

## Permissions and data disclosures

| Permission    | Justification for this candidate                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| activeTab     | Temporary access to the selected page when the person invokes Getter from its toolbar action.                                                           |
| scripting     | Run bounded, read-only style/image extraction in the selected permitted document and frames; verify document identity to reject stale results.          |
| storage       | Save local display preferences and remove specifically identified legacy Getter caches during migration. No persistent inspection history or telemetry. |
| downloads     | Start explicitly requested image/ZIP downloads and observe their owned IDs while the popup is open. No broad history search.                            |
| webNavigation | Enumerate frames in the selected tab on request, pin document identities and report omitted frames. No background navigation listener.                  |

There are no standing or optional host grants in the shipping candidate, no web-accessible resources and no remote executable code. Compared with 2.0.0, the candidate removes `tabs`, `declarativeContent`, broad `*://*/*` host access, the exposed ZIP library resource and the permissive development CSP. Do not add permissions to make QA easier.

Do not copy the old listing's blanket “will not collect or use your data” claim. Getter handles selected website content and current page/frame addresses locally even without an analytics backend. The owner must review the actual dashboard data categories and declarations against this code and the privacy notice. Proposed disclosure scope: website content (styles/image metadata) and selected-page/frame addresses used for the feature; no background browsing history, persistent inspection log, personal-account system or telemetry. Image hosts receive explicitly requested resource URLs and normal connection information; image requests omit credentials/referrers, and only prepared local files reach Chrome's downloader. Support emails are voluntarily supplied communications, separate from extension telemetry.

The November 3 authenticated Privacy screen has no data categories selected and an empty privacy-policy URL. The proposed refresh must replace that outdated disclosure: Website content clearly applies; review Web history against the limited current-page/frame URL use, with no saved history, and review voluntary support communications separately. The form’s three existing limited-use certifications were observed, not changed or newly submitted. The owner must make any required limited-use/trader/account certifications truthfully in the dashboard. This document does not make or submit those attestations.

## Store reviewer steps

No account, payment or credentials are needed. Open an ordinary webpage, invoke Getter, and inspect Colors and Fonts. Change a display preference, reopen and verify it persists. On a page with images, enable previews or request a size explicitly. Prepare a ZIP, read its included/unavailable counts, and choose Save ZIP or Discard. Native Save As may close the popup: Chrome Downloads supplies the final outcome. Restricted pages produce an explanation rather than results. HTTP images, redirecting download URLs, oversized files and hosts denying access are unavailable for download; there is no insecure fallback. Secure image previews also reject HTTP redirect targets.

Use synthetic or public non-sensitive pages for review. The new permission model needs the real toolbar gesture; navigating directly to popup.html is not equivalent. See [the complete QA checklist](refresh.md#verification-and-remaining-owner-qa).

## Submission gate

- [ ] Current source and ZIP contents/hashes frozen; package contains production files at its root and no tests, test grants, source maps, private docs or credentials.
- [ ] Required CI/browser gates and independent current-head review pass; human QA supplies its final verdict and merge authorization.
- [ ] Actual old-release upgrade, worker recovery, keyboard/light-mode and remaining navigation/lifetime scenarios are qualified; original frame-count observation is explained or has an owner-reviewed disposition.
- [ ] Secure image transport (#11): verify HTTPS-only preview connections, bounded credential-free fetches with redirects rejected, blob-only saves, and negative browser tests. Renew native QA for the changed download behavior; prior direct-download results do not qualify it.
- [ ] Final store screenshots demonstrate the accepted actual UI on non-sensitive examples (1280×800 or 640×400); existing QA images are evidence, not automatically submission-ready screenshots. Store icon is the owner-selected Evolved Getter 128×128 PNG, matching the revised toolbar and popup header; verify its appearance on light/dark backgrounds. Earlier screenshots of the smaller popup or orange/pink Getter icon do not represent this candidate.
- [ ] Confirm authenticated dashboard item, highest uploaded version, draft/review state, distribution and publisher details; avoid duplicate uploads or changes to other items.
- [ ] Final privacy notice, disclosure categories, support contact and source/support links match behavior and are accessible. Mailbox operation and legal/account attestations remain owner checks.
- [ ] Owner approves the concrete ZIP, listing, privacy declarations and submission. Prefer deferred publication so store review and publication are distinct decisions.
- [ ] After store approval and owner publication approval, verify the intended public version and install/update behavior. Only then can the main-site release dependency be satisfied.

## Protection evidence

On November 3, 2026, the owner authorized Getter to mirror Aptelum's protections. [Protect main](https://github.com/asbillings07/Getter/rules/26469517) requires PRs, resolved conversations and the GitHub Actions `Getter checks` result on an up-to-date branch, blocks force pushes/deletion and has no bypass actors. The browser tests run inside that required check. Saved and effective rules were read back. Formal GitHub approvals remain zero, matching the existing single-account setup; independent source review and the final human-QA decision remain mandatory recorded gates. Auto-merge is disabled. Recheck effective settings before relying on this dated observation.

## Official references checked November 3, 2026

- [Updating an existing item](https://developer.chrome.com/docs/webstore/update): increment the version, upload the complete ZIP, update changed listing fields and review submission/publication separately.
- [Images](https://developer.chrome.com/docs/webstore/images): store icon and screenshots; optional promotional assets are separate from actual UI screenshots.
- [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use): the proposed privacy notice includes the required affirmative compliance statement for owner review.
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy): single purpose, permissions, remote-code declarations and data-use/privacy fields.
- [User-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq): local processing still requires disclosure; handling selected website data is not the same as collecting nothing.
- [Secure transmission](https://developer.chrome.com/docs/webstore/troubleshooting#user-data-policy---secure-transmission): protect transmitted user data, including resource requests.
- [Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements): metadata and privacy claims must match actual behavior.

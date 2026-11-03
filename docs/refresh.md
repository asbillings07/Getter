# Palette refresh — issue 6

Owner selected Palette, colors/fonts/images only, and the exact attribution **Created by Aptelum Labs** on November 2, 2026. The displayed blended Aptelum mark was explicitly approved for Getter's public repository. Original master SHA-256: `e055a95caa78654fafd4aab080c91e216c262cada22d92173a5de0542ec60d80`. Its bytes and geometry are unchanged. This is an attribution asset authorization, not a general license to publish company materials. The new Palette design uses the owner-approved company attribution. No company policy adoption is part of this change.

## Implementation choices

React 18.2 and JSZip 3.10.1 are retained at exact versions. The former Webpack/Babel/plugin stack was considered for repair. For this two-entry static extension it required many packages and separate transforms; one esbuild script handles the same React JSX and background bundles with fewer moving parts. There is no framework, backend or service migration. Node 24.18.1 and the dependency lock provide a reproducible install. Development and production both prohibit remote script execution; no web server or secrets are shipped.

The popup separates DOM extraction, current-document orchestration, preferences, downloads and presentation. Scans are ephemeral in the open popup; only preferences persist. Closing the popup discards results and pending preparation. On installation/update, cleanup removes only known Getter result/cache keys and conservatively identified historical URL snapshot keys. Preferences, false options and unknown preference keys survive. The popup retries an idempotent migration on open. Background cleanup never overwrites preferences.

## Access and limits

- `activeTab` and `scripting` cover an explicit toolbar invocation. No standing or optional all-site host grants are requested. Scans do not edit page IDs, borders or other DOM content.
- `webNavigation` is retained only to enumerate frames in the selected tab on request; there is no background navigation listener or browsing log. Up to seven same-origin child frames plus the main document are inspected. Browser-provided document IDs are pinned and rechecked. Cross-origin, opaque, inaccessible and excess frames are explicitly reported as omitted; the product does not claim an exhaustive scan of all frames, pseudo-elements, shadow roots or background images.
- Main extraction stops at 4,000 nodes/100 ms; each child at 1,000 nodes/40 ms. Each result category is capped at 500 after aggregation. A five-second orchestration timeout/cancellation invalidates late results; already injected read-only work is bounded, not remotely killed.
- `storage` persists display preferences only. `downloads` starts an explicit download and observes only owned download IDs while the popup is open. Direct downloads may use the browser's cookies for the destination host. Started, completed, interrupted and unknown are separate messages. No broad download history query is made.
- Previews are opt-in. File-size reads and ZIP generation happen only on explicit requests, never during rendering. ZIP fetches omit credentials/referrer, reject redirects, and respect browser CORS/activeTab access. Hosts that reject access are skipped without requesting more privileges; individual browser downloads remain available. This is a deliberate limit, reported in the UI, rather than restored all-site access.
- ZIP: up to 40 files, 8 MiB each, 32 MiB total, one streamed fetch at a time, eight seconds per fetch, sixty seconds preparation. Preserve supported image MIME extensions; no renaming everything to JPEG. Count skipped/oversized/unavailable images and report zero-success failure. Cancellation stops new requests. ZIP assembly is bounded by the byte cap; cancellation during assembly discards the result before saving. Keep the popup open through a ZIP download; closing it releases its owned object URLs. Direct browser downloads may continue after closing. Owned URL status observation is capped at two minutes, after which completion is reported as unknown.

## Verification and remaining owner QA

`npm run check` covers extraction without host mutation, caps, preference migration, tab/navigation/document rejection, permissions, exact logo bytes and package inventory. Download tests cover failed/CORS/oversized/cancelled paths and start/completion races. Browser tests load the built extension into a fresh Chromium profile with **test-only localhost host grants** and synthetic pages, exercise real script injection, stored options, frame omission, navigation and actual ZIP downloads. This is not a claim that the shipping activeTab toolbar permission gesture has been qualified. The shipped manifest is separately checked to contain no host grants.

Before merge, independently review the immutable candidate and complete CI. Before UI acceptance, the owner should load the unpacked `dist/` in an isolated browser profile and check:

- Toolbar invocation on two distinct sites; same-URL reload, cross-origin navigation, switching tabs and repeated open/close; no cross-tab results.
- Fresh install and update from 2.0.0 with custom options; no lost preferences, no legacy snapshots, toolbar stays enabled.
- Palette layout, keyboard focus/tab sequence, system light/dark appearance, colors and alpha copy, detailed/summary fonts and settings.
- Blocked pages, empty pages, slow/large pages, denied/opaque/cross-origin frames, worker suspension and recovery, cancellation and actionable errors.
- Images, unavailable previews, file-size failures, direct downloads and bounded/partial ZIP exports; close during preparation and during an in-progress ZIP. Browser download completion must match the UI. Current popup-lifetime limitations are explicit above and must be assessed in QA.
- “Created by Aptelum Labs,” exact blended mark and real GitHub support destinations.

No store upload, extension-version release, merge, domain change or company-standard adoption is authorized by a build or passing test.

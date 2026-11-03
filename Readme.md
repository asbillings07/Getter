# Getter

**Created by Aptelum Labs.** Discover a webpage's colors, fonts and images.

Getter is a Chrome Manifest V3 extension. The Palette refresh is being reviewed in [issue 6](https://github.com/asbillings07/Getter/issues/6); it has not been published to the Chrome Web Store. Text extraction and element-level CSS inspection are outside this refresh's scope.

Version 2.1.0 is the proposed release candidate, following the existing store version 2.0.0. See the [submission preparation](docs/store-submission.md) and [privacy notice](PRIVACY.md). Building a ZIP does not authorize or establish a store submission.

## Build and verify

Use Node 24.18.1 (`.nvmrc`):

```sh
npm ci --ignore-scripts
npm run check
npx playwright install chromium
npm run test:browser
```

The unpacked extension is in `dist/`. `npm run build:dev` produces an unminified bundle with the same permissions and script policy. No API keys, provider accounts or network services are needed to build. Browser tests use a fresh profile and synthetic localhost fixtures; they never use your existing Chrome profile.

## Use

Open Getter from the toolbar on a regular webpage. Colors can be copied; typography shows captured font styles; images can be previewed or downloaded on request. Display preferences are saved locally. Page results are kept only in the open popup. Navigation invalidates old results; “Scan again” explicitly scans the new document.

Scans are bounded and report omitted frames or truncated results. Previews, file-size reads and ZIP export contact the image hosts only when requested. Image requests require HTTPS. File-size reads and downloads omit credentials/referrers, reject redirects, and respect host access and size limits. Inaccessible images are reported; partial ZIP counts are shown. Keep Getter open while the ZIP is prepared. Review the included/skipped counts, then choose Save ZIP. The native save dialog may close Getter; use browser Downloads to check the final result. See [architecture, limits and owner QA](docs/refresh.md).

## Credits and support

Created by Aptelum Labs. Getter retains its own identity alongside the approved Aptelum product mark.

[Report a problem or suggest an improvement](https://github.com/asbillings07/Getter/issues). Do not include private page contents, signed URLs, cookies or credentials in reports. Include a synthetic reproduction where possible.

For support or privacy questions, contact [support@aptelum.com](mailto:support@aptelum.com). Avoid sending private page contents, credentials or signed resource URLs; a small synthetic example is usually sufficient.

The Aptelum attribution mark is included with the owner's approval for Getter. No private company policy or design document is redistributed or adopted here. Store publication and future policy adoption remain separate decisions.

# Getter

**Created by Aptelum Labs.** Explore a webpage's colors, fonts, images, text and element styles.

Getter is a Chrome Manifest V3 extension. Version **3.0.0** implements the approved Text, expanded Inspect, and popup/side panel designs. The owner accepted the Chrome test build; the v3.0 release adds version and listing metadata without changing that accepted UI. Store submission and publication are separate steps. Chrome 141 or later is required for switching back from the side panel. See the [privacy notice](PRIVACY.md) and [architecture and owner QA](docs/refresh.md). See the updated [store submission preparation](docs/store-submission.md) for v3.0 listing copy, screenshots, permissions and reviewer steps.

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

Open Getter from the toolbar on a regular webpage. In Settings, choose **Open Getter in → Popup / Side panel**. The button next to Settings switches views once without changing that preference; verified results and the current tool follow the switch. Inspect always opens in the side panel. Returning to the popup restores your last non-Inspect tool.

- **Colors / Fonts / Images:** copy values, read typography, and preview or download images. **Load previews by default** is off initially; enabling it saves that preference.
- **Usage:** color and font cards show their share of detected uses. Select **Most used first / Least used first** to change the order. The info icon explains percentages and scan limits. Font percentages include styles hidden by the summary display setting.
- **Text:** read Page, Main content, or Selection; find and copy individual blocks or copy/save the complete current source as `.txt`. Search filters the displayed blocks; full-text actions still include the entire extracted source. Select text on the page before opening the popup, or use the side panel and Extract selection.
- **Inspect:** click an element to see Styles, Layout, Effects, and Element details. Selection stays active until paused or Escape is pressed. Pause lets you use the page normally while keeping the selected values; Resume selecting picks another element. Search and Show all properties apply to the current section. Copy CSS opens a preview; DOM attributes are copied separately.

Results are local to the open workspace. A brief transfer through browser-session memory preserves them when switching views. Navigation clears old results; Scan again reads the new document. The side panel follows tab changes, but a new site may require opening Getter from its toolbar icon to grant access. Display preferences are stored locally.

Scans are bounded and report omitted frames or truncated results. Previews contact image hosts when enabled, including by the saved default. File-size reads and ZIP export require an explicit request. Image requests require HTTPS. File-size reads and downloads omit credentials/referrers, reject redirects, and respect host access and size limits. Inaccessible images are reported; partial ZIP counts are shown. Keep Getter open while the ZIP is prepared. Review the included/skipped counts, then choose Save ZIP. The native save dialog may close Getter; use browser Downloads to check the final result. See [architecture, limits and owner QA](docs/refresh.md).

## Credits and support

Created by Aptelum Labs. Getter retains its own identity alongside the approved Aptelum product mark.

[Report a problem or suggest an improvement](https://github.com/asbillings07/Getter/issues). Do not include private page contents, signed URLs, cookies or credentials in reports. Include a synthetic reproduction where possible.

For support or privacy questions, contact [support@aptelum.com](mailto:support@aptelum.com). Avoid sending private page contents, credentials or signed resource URLs; a small synthetic example is usually sufficient.

The Aptelum attribution mark is included with the owner's approval for Getter. No private company policy or design document is redistributed or adopted here. Store publication and future policy adoption remain separate decisions.

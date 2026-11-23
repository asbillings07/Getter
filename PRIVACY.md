# Getter privacy notice

Applies to Getter 3.1.2. This document does not establish store publication.

Getter is created by Aptelum Labs. Contact [support@aptelum.com](mailto:support@aptelum.com) for support or privacy questions.

## What Getter reads and why

When you open Getter or choose Scan again on a page Chrome permits, it reads the selected page and permitted frames to show colors, font styles, image information and visible text. Inspect reads computed styles, element attributes, text, links, image addresses and dimensions for the element you select. Page/frame addresses identify the right document and its hostname. Getter does not extract form values or passwords as a feature and does not collect browsing history in the background. Text and attributes can contain private information, including signed resource addresses: choose which pages and elements you inspect and which values you copy or save.

Results stay in the open popup or side panel. Switching views temporarily transfers results through Chrome's in-memory session storage. Transfers can be reused for up to 30 seconds and are removed when consumed; an unused transfer is cleaned up by the worker or when the browser session ends. Getter does not save inspected-page history to disk or send results to Aptelum Labs or analytics services. Closing a popup discards its results and unsaved ZIP preparation, except for a pending view transfer. Chrome can retain a hidden side panel and its in-memory results; these remain local until cleared by navigation, a new scan, or Chrome releasing the view. Hiding the panel pauses element selection. Navigating clears old results. A side panel can remain open while you change tabs and attempts to read the newly selected page only where Chrome permits access.

Preferences, including appearance, default workspace and automatic previews, are saved locally, not synchronized by Getter. Updates remove only identified legacy Getter cache keys while preserving preferences and unknown preference fields. The Inspect picker uses a temporary page overlay and removes its event handlers and overlay when selection pauses, Inspect closes, or the page changes; it does not rewrite the inspected elements.

## Website access you control

Getter initially uses temporary access from its toolbar action. For an unapproved regular website, choosing Scan again can ask Chrome for access to that site. Optional host patterns cover HTTP and HTTPS, but declaring them does not grant access. Getter requests a specific site only from an explicit scan action; it does not display a permission prompt just because you navigate.

**Settings → Website access → Allow on all websites** requests access to regular HTTP/HTTPS websites. The switch is off until Chrome grants that access. Turning it off removes the broad grant and returns to per-site requests; Chrome also removes narrower site grants covered by that removal. Turning it on again requests access again, although Chrome may remember a previous approval and not repeat its prompt. The control reads Chrome’s permissions rather than a saved preference and updates when permissions change. Specific sites can also be removed in Chrome’s extension settings. Chrome settings, the Web Store and local files remain unsupported.

Page scans and selected-element inspection remain local and bounded. A visible or retained side panel can attempt a scan when the active tab changes or access is granted; optional access does not add a browsing log or a background content collection service. Revoking access clears current results and stops Inspect. Any separate temporary toolbar grant Chrome still holds is governed by Chrome.

## Requests and actions you choose

- Copying a value, extracted text or CSS snippet writes it to your clipboard. Getter does not read the existing clipboard.
- Enabling image previews contacts the image hosts. The saved “Load previews by default” setting enables those requests when you open Images. Only HTTPS previews are allowed, including after redirects. Preview requests use anonymous cross-origin loading and omit the page referrer.
- Reading an image's file size, downloading an individual image or preparing a ZIP fetches image bytes from HTTPS hosts. These requests omit credentials and the referrer, reject redirects and have size/time limits. Some hosts block them; Getter reports unavailable or skipped images. Resource hosts can receive normal connection information, including your IP address and requested image URL.
- Text files, individual images and ZIPs are prepared locally before being passed as blob URLs to Chrome's download facility; the downloader does not contact the original image host. Chrome presents the save choice and manages the downloaded file and its download history. A completed download remains on your device until you remove it through your normal file-management tools.
- Choosing Search font family opens Google Fonts with the selected family name. Choosing source, privacy or issue links opens GitHub. Those services handle the resulting visit under their own policies. The GitHub links do not include inspected-page contents or page addresses.

Getter has no account, advertising system, analytics or telemetry service, and no Aptelum backend receiving page-inspection data. It does not sell that data, use it for advertising, or transfer it for purposes unrelated to the inspection and download features you choose. It executes packaged extension code rather than remotely hosted executable code.

Getter’s use of user data follows the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use), including its Limited Use requirements.

## Your controls and support messages

Open Getter only on pages you want to inspect. Previews are off initially; you can enable them for the current Images view or by default in Settings. File-size requests and downloads require your action. Close the popup to discard its inspection results and unsaved ZIP, subject to the short-lived transfer described above. A hidden side panel may remain in browser memory; Scan again replaces its results and closing the browser releases it. Remove the extension or its extension storage through Chrome to remove saved preferences; this does not remove files you downloaded separately. Clipboard data and Chrome's download history have their own browser/operating-system controls.

If you email support, Aptelum Labs and the email service used to deliver the message receive the information you choose to send. We use that message to respond to your request. Do not send credentials, private page contents or signed image URLs. For questions about a support message or a request to delete it, email support@aptelum.com. GitHub issues are public; use email for private support matters.

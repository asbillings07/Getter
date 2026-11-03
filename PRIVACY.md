# Getter privacy notice

Applies to Getter 2.1.0. Version 2.0.0 remains the published version until the 2.1.0 update is released.

Getter is created by Aptelum Labs. Contact [support@aptelum.com](mailto:support@aptelum.com) for support or privacy questions.

## What Getter reads and why

When you open Getter from the toolbar, it reads the page you selected and permitted frames to show colors, font styles and image information. This includes computed styles, image addresses, alternative text and dimensions, and the current page/frame addresses needed to identify the right document and show its host. It does not read form values or passwords as a feature, and it does not run a background browsing-history collector. Some pages can still contain private image addresses or descriptive text: choose which pages you inspect and which files you download.

Page-inspection results stay in the open popup's memory. Getter does not send these results to Aptelum Labs or an analytics service, and it does not persist a history of inspected pages. Closing the popup discards its results and unsaved ZIP preparation. Display preferences are saved locally using Chrome extension storage, not synchronized by Getter. Updates remove only identified legacy Getter result/cache keys while preserving preferences and unknown preference fields.

## Requests and actions you choose

- Copying a color writes that value to your clipboard. Getter does not read the existing clipboard.
- Enabling image previews contacts the image hosts. Only HTTPS previews are allowed, including after redirects. Preview requests use anonymous cross-origin loading and omit the page referrer.
- Reading an image's file size, downloading an individual image or preparing a ZIP fetches image bytes from HTTPS hosts. These requests omit credentials and the referrer, reject redirects and have size/time limits. Some hosts block them; Getter reports unavailable or skipped images. Resource hosts can receive normal connection information, including your IP address and requested image URL.
- Individual images and ZIPs are prepared locally before being passed as blob URLs to Chrome's download facility; the downloader does not contact the original image host. Chrome presents the save choice and manages the downloaded file and its download history. A completed download remains on your device until you remove it through your normal file-management tools.
- Choosing Search font family opens Google Fonts with the selected family name. Choosing source, privacy or issue links opens GitHub. Those services handle the resulting visit under their own policies. The GitHub links do not include inspected-page contents or page addresses.

Getter has no account, advertising system, analytics or telemetry service, and no Aptelum backend receiving page-inspection data. It does not sell that data, use it for advertising, or transfer it for purposes unrelated to the inspection and download features you choose. It executes packaged extension code rather than remotely hosted executable code.

Getter’s use of user data follows the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use), including its Limited Use requirements.

## Your controls and support messages

Open Getter only on pages you want to inspect. Previews are off until enabled; file-size requests and downloads require your action. Close the popup to discard its inspection results and unsaved ZIP. Remove the extension or its extension storage through Chrome to remove saved preferences; this does not remove files you downloaded separately. Clipboard data and Chrome's download history have their own browser/operating-system controls.

If you email support, Aptelum Labs and the email service used to deliver the message receive the information you choose to send. We use that message to respond to your request. Do not send credentials, private page contents or signed image URLs. For questions about a support message or a request to delete it, email support@aptelum.com. GitHub issues are public; use email for private support matters.

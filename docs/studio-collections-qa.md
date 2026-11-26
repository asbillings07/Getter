# Getter Studio Collections QA

Collections in this package are editable libraries of chosen assets. Each
project can have multiple named collections, notes, individual item cards,
and a history of the original captures. Earlier Workspace QA saves migrate
when you edit the project. The update preserves original values and keeps
collection data in the same Chrome profile.

## Try in Chrome

1. Unzip the Collections QA build over the unpacked folder you already use
   and select **Reload** on `chrome://extensions`. For the first install use
   **Load unpacked** in a test profile. Select **Open Studio QA** in Getter's
   popup or side panel.
2. Create a project. Under **Add assets**, select a tab or enter a website
   address. Scan the page and save chosen colors, typography, and images.
   Choose **Pick an element** to save a component, element style, effect, or
   motion. You can also add a local image.
3. Under **Assets**, search or filter by type. Open **Item details** to name a
   color, set a role, write a note, or change its curated value. Reorder items,
   merge exact matching styles, and restore removed items. Create a second
   collection and copy an asset between them.
4. Under **Captures**, view the raw values and save a new version. Under
   **Design kit**, choose assets and a destination, review which items transfer,
   and save the kit or download an export. Reopen the saved kit after restarting
   Chrome.

## Capture boundaries

- Studio only reads a website after you choose a tab and request a scan or
  element capture. Captures record the viewport, scan limits, and a hostname
  or a page title chosen before saving. Page style snapshots include the
  available color and typography inventory for the top-level document.
- Component previews use captured structure and supported computed styles.
  They exclude page text, raw markup, handlers, external style resources, and
  form values. Effects use saved properties and motion plays available
  keyframes. A transition with no captured keyframes retains its timing.
- Selected images are copied locally from HTTPS or picked from the device.
  Studio checks the raster format and file limit. The saved record has no
  original image URL.
- Original captures remain separate from editable asset values. A saved design
  kit keeps its own copy of the selected values when assets are later edited
  or removed. The package saves on the device and makes no cloud copy.

## Export formats

- **Design kit ZIP** contains a versioned Getter asset manifest, reusable CSS,
  and the included image files. Source references are optional.
- **CSS** exports original or curated color values, type variables, element
  and effect declarations, and supported recorded motion.
- **Figma variables** exports sRGB color and single font-family tokens.
  [Figma Variables import](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
  documents other supported token types and limits.
- **Adobe swatches** exports an ASE palette of opaque sRGB colors.
  [Adobe swatch exchange](https://helpx.adobe.com/illustrator/desktop/manage-colors/use-swatches/share-swatches-between-applications.html)
  documents application-specific import routes.
- **Canva brand guide** opens a print-ready guide. Save it as a PDF and review
  the colors and font styles extracted by
  [Canva Brand Kit Builder](https://www.canva.com/help/brand-kit-builder/).

The browser checks exercise the extension files and generated export bytes.
Receiving-app import fidelity is a separate QA step. The full visual editor,
Design Review, live Aptelum subscriptions, account recovery, and cross-device
sync remain separate Studio work.

Build with `node scripts/build.mjs --studio-workspace-qa`. The normal package
excludes the Studio workspace and its capture port.

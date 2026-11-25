# Browse and design in Getter Studio

## Save while browsing

1. Open a regular website and use Getter in the popup or side panel. Select
   **Scan again** if the page changes in the same tab.
2. Use **Save palette to collection**, **Save all typography to collection**,
   **Save all images to collection**, or **Save all text to collection**.
   Typography uses the displayed styles. Image saves use eligible HTTPS
   images. Expand the review details to adjust either list. Text uses the
   current Page, Main content, or Selection result. Use an in-card
   **Save to collection** button to save a single color, font or image.
3. Open **Quick Inspect** in the side panel and select an element.
   **Save to collection** opens the destination for the entire selection and
   its child elements. **Individual assets** opens the separate choices.
   **Select parent** moves from a part to its containing element.
4. In Quick Inspect **Effects**, use **Preview animation** or
   **Preview transition** when playable frames are available. Hover the
   source element while picking to record its transition. The preview plays
   in Getter. You can save motion separately or keep it with a component.
5. Pick a project and collection or use **Create and save** to start both.
   After the save, **Keep browsing** or **Keep inspecting**
   keeps the website in view. Getter remembers the last collection in the
   browser session. **Open collection** shows the saved assets in Studio.

Select on page, Show all properties, property search, value copying, and Copy CSS
are still available in Quick Inspect. Component captures started in the side
panel include selected visible text, supported HTTPS image files, and supported
motion. Form values and executable markup are excluded.

The capture checks the active document before storage. Saved sources identify
the site without the page URL. Website images reuse Getter's bounded HTTPS
fetch path and have the same format and size limits as Studio Collections.

## Use the collection in the editor

1. From the collection, select **Create design** or **Use in editor** on an
   asset. Choose a website layout, social post, brand board, or blank canvas.
2. Select layers on the canvas or in **Layers**. Edit text and type styles,
   move and resize artwork, and use **Collection assets** to apply a color or
   font, replace artwork, or insert a captured component. The website preset has
   separate editable header and footer layers. An artwork slot fills with the
   first image you insert.
3. Save the draft. **Back to collection** saves outstanding edits before
   returning. Reopen it under **Editor** in the same collection.
4. **Export draft** downloads the visible design as an SVG with embedded image
   assets or as a flat PNG at the artboard dimensions. SVG references fonts by
   name. Saved effects can apply supported properties to static layers.
   Motion assets remain available from the collection for preview.

The editor uses captured structure, visible text, included images, and selected
style properties for component artwork. Captured markup, handlers, and form
values are excluded. Standalone text assets can be inserted as editable layers.
Projects, collections, and drafts use local Chrome storage. Existing QA
collections use the same storage and do not need to be imported again.

## Build

Build with `node scripts/build.mjs --studio-workspace-qa`. Load or reload the
unpacked folder in Chrome. In the QA build, **Open Studio QA** opens the project
workspace from the popup or side panel. The normal extension package excludes
the editor and side-panel collection controls.

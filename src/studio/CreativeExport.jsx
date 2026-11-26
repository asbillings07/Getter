import React from "react";

export function CreativeExport({
  name,
  kind,
  target,
  onTarget,
  format,
  onFormat,
  carousel,
  exporting,
  status,
  onDownload,
  onBack,
  continued,
  substituteFont,
  onSubstituteFont,
  children,
}) {
  const campaign = kind === "Campaign artwork";
  const choices = campaign ? ["Canva", "Figma"] : ["Figma", "Illustrator"];
  return (
    <section className="workspace-export" aria-label="Export draft">
      <div className="studio-heading">
        <div>
          <small className="workspace-kicker">Continue your design</small>
          <h1>{continued ? `Continue in ${target}` : `Export ${name}`}</h1>
          <p>
            {continued
              ? "Your downloaded files are ready to import."
              : "Review the design and choose files for your destination."}
          </p>
        </div>
        <button className="secondary" disabled={exporting} onClick={onBack}>
          ← Back to editor
        </button>
      </div>
      <div className="workspace-export-grid">
        <div className="workspace-export-options">
          <h2>Destination</h2>
          <div className="workspace-destinations">
            {choices.map((choice) => (
              <button
                key={choice}
                className="secondary"
                aria-pressed={choice === target}
                disabled={exporting}
                onClick={() => onTarget(choice)}
              >
                {choice}
              </button>
            ))}
          </div>
          <h3>{format === "svg" ? "Artwork and text" : "Flattened artwork"}</h3>
          <dl className="workspace-delivery">
            <div>
              <dt>
                <span aria-hidden="true">T</span>Text and shapes
              </dt>
              <dd>
                {format === "svg"
                  ? "Separate elements in the SVG. Editability depends on how your design tool imports the file."
                  : "Included in the image at the artwork dimensions."}
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">▧</span>Artwork
              </dt>
              <dd>
                {format === "svg"
                  ? "Collection images are embedded in the SVG."
                  : "Everything visible on the artboard becomes one image."}
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">◉</span>Colors and typography
              </dt>
              <dd>
                {format === "svg"
                  ? "Colors are applied to the artwork. Fonts are referenced by name."
                  : "Colors and type are rendered into the PNG."}
              </dd>
            </div>
            {carousel && (
              <div>
                <dt>
                  <span aria-hidden="true">▤</span>Carousel
                </dt>
                <dd>Each slide is a separate numbered file in the ZIP.</dd>
              </div>
            )}
          </dl>
          <label className="workspace-export-format">
            File format
            <select
              value={format}
              onChange={(event) => onFormat(event.target.value)}
              disabled={exporting}
            >
              <option value="svg">
                {carousel
                  ? "SVG ZIP · One SVG per slide"
                  : "SVG · Text and shapes"}
              </option>
              <option value="png">
                {carousel
                  ? "PNG ZIP · One PNG per slide"
                  : "PNG · Flattened image"}
              </option>
            </select>
          </label>
          <button className="primary" disabled={exporting} onClick={onDownload}>
            {exporting
              ? "Preparing…"
              : `Download ${format.toUpperCase()}${carousel ? " ZIP" : ""}`}
          </button>
          <p className="workspace-export-note">
            Download the files and import them into {target}.
          </p>
          {status && <p role="status">{status}</p>}
          {format === "svg" && (
            <details className="workspace-font-adjustment">
              <summary>Preview a font substitution</summary>
              <label>
                Heading font in this export
                <select
                  value={substituteFont}
                  onChange={(event) => onSubstituteFont(event.target.value)}
                  disabled={exporting}
                >
                  <option value="">Keep the draft font</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Arial, sans-serif">Arial</option>
                </select>
              </label>
              <p>
                The preview and downloaded file use this choice. Your saved
                draft keeps its font.
              </p>
            </details>
          )}
        </div>
        <aside className="studio-card workspace-export-preview">
          <h2>{carousel ? "Carousel · 3 slides" : kind}</h2>
          {children}
          <small>
            {format === "svg" ? "SVG preview" : "PNG preview"} · Your draft
            stays in Getter Studio.
          </small>
        </aside>
      </div>
    </section>
  );
}

import React, { useState } from "react";
import { EditorDialog } from "./Collections.jsx";
import { createDraft, formats, startingLayouts } from "./design.js";

export default function Designs({
  collection,
  startingAsset,
  creating,
  onCancel,
  onNew,
  onOpen,
  onCreate,
}) {
  const [includeAsset, setIncludeAsset] = useState(true);
  const designs = [...(collection.designs || [])].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const options = Object.entries(startingLayouts).map(
    ([id, { label, width, height }]) => ({
      id,
      name: `${label} · ${width} × ${height}`,
    }),
  );
  return (
    <section className="studio-card" aria-labelledby="designs-title">
      <div className="studio-heading">
        <h2 id="designs-title">Designs</h2>
        <button className="primary" onClick={onNew}>
          New design
        </button>
      </div>
      {!designs.length && (
        <p>Choose a layout and use the assets in this collection.</p>
      )}
      <div className="studio-projects">
        {designs.map((design) => (
          <article className="studio-card studio-design-tile" key={design.id}>
            <div
              className="studio-design-tile-color"
              style={{ backgroundColor: design.background }}
              aria-hidden="true"
            />
            <h3>{design.name}</h3>
            <p>
              {design.additionalSlides?.length
                ? startingLayouts.carousel.label
                : formats[design.format].label}{" "}
              · {design.width} × {design.height}
            </p>
            <button
              className="secondary studio-inline-action"
              aria-label={`Open ${design.name}`}
              onClick={() => onOpen(design)}
            >
              Open design
            </button>
          </article>
        ))}
      </div>
      {creating && (
        <EditorDialog
          title="Create a design"
          initial={{
            name: `${collection.name.slice(0, 53)} design`,
            format: "website",
          }}
          fields={[
            { key: "name", label: "Design name", max: 60, required: true },
            { key: "format", label: "Starting layout", options },
          ]}
          action="Create design"
          onClose={onCancel}
          onSubmit={({ name, format }) =>
            onCreate(
              createDraft(name, format, collection.name),
              includeAsset ? startingAsset : null,
            )
          }
        >
          {startingAsset && (
            <label>
              <input
                type="checkbox"
                checked={includeAsset}
                onChange={(event) => setIncludeAsset(event.target.checked)}
              />{" "}
              Find {startingAsset.name} in the editor
            </label>
          )}
        </EditorDialog>
      )}
    </section>
  );
}

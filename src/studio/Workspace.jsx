import React, { useState } from "react";

export function WorkspaceHeader({ project, onProjects, onInspect, onReview }) {
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearance = document.documentElement.dataset.appearance || "system";
  async function changeAppearance(value) {
    const { cssGetterOptions } =
      await chrome.storage.local.get("cssGetterOptions");
    await chrome.storage.local.set({
      cssGetterOptions: { ...cssGetterOptions, appearance: value },
    });
    if (value === "system") delete document.documentElement.dataset.appearance;
    else document.documentElement.dataset.appearance = value;
    setAppearanceOpen(false);
  }
  return (
    <header className="studio-header workspace-header">
      <div className="brand">
        <img
          src="images/CSS-Getter-Icon-48px.png"
          alt=""
          width="25"
          height="25"
        />
        <strong>Getter Studio</strong>
      </div>
      {project ? (
        <div className="studio-row workspace-context">
          <span>{project.name}</span>
          <button
            type="button"
            className="secondary"
            aria-label="Appearance settings"
            aria-expanded={appearanceOpen}
            onClick={() => setAppearanceOpen(!appearanceOpen)}
          >
            ⚙
          </button>
          {appearanceOpen && (
            <label className="studio-card workspace-appearance">
              Appearance
              <select
                defaultValue={appearance}
                onChange={(event) => changeAppearance(event.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          )}
        </div>
      ) : (
        <nav className="studio-row workspace-sections" aria-label="Studio">
          <button
            className="text-button"
            aria-current="page"
            onClick={onProjects}
          >
            Projects
          </button>
          <button className="text-button" onClick={onReview}>
            Design Review
          </button>
          <button className="text-button" onClick={onInspect}>
            Inspect Pro
          </button>
        </nav>
      )}
    </header>
  );
}

const workflowStages = [
  ["collect", "Collect"],
  ["assets", "Collection"],
  ["designs", "Editor"],
  ["export", "Export"],
  ["continue", "Continue"],
];

export function WorkspaceSteps({ active, actions, children }) {
  return (
    <nav className="workspace-navigation" aria-label="Collection views">
      <div className="workspace-steps">
        {workflowStages.map(([id, label], index) => (
          <button
            key={id}
            type="button"
            aria-current={active === id ? "step" : undefined}
            disabled={!actions[id]}
            onClick={actions[id]}
          >
            <span aria-hidden="true">{index + 1}</span>
            {label}
          </button>
        ))}
      </div>
      {children}
    </nav>
  );
}

export function WorkspaceFooter({ collection }) {
  return (
    <footer className="workspace-footer">
      <span>Created by Aptelum Labs</span>
      {collection && (
        <span>
          {collection.name} ·{" "}
          {collection.assets.filter(({ removedAt }) => !removedAt).length}{" "}
          assets
        </span>
      )}
    </footer>
  );
}

export function ProjectsView({
  projects,
  collections,
  onNew,
  onReuse,
  onChooseSite,
  onOpen,
  onCollection,
}) {
  const existing = projects
    .flatMap((project) => project.collections)
    .find((collection) =>
      collection.assets.some(({ removedAt }) => !removedAt),
    );
  const swatches = existing?.assets
    .filter(({ value, removedAt }) => !removedAt && value.type === "color")
    .slice(0, 4);
  return (
    <>
      <div className="studio-heading">
        <div>
          <h1>Your projects</h1>
          <p>Keep collections, sites, and design work together.</p>
        </div>
        <button className="primary" onClick={onNew}>
          <span aria-hidden="true">＋ </span>New project
        </button>
      </div>
      <div className="workspace-project-launch">
        <section className="studio-card">
          <small className="workspace-kicker">Existing collection</small>
          <h2>{existing?.name || "Start from a collection"}</h2>
          {swatches?.length > 0 && (
            <div className="workspace-swatches" aria-label="Collection colors">
              {swatches.map((item) => (
                <span
                  key={item.id}
                  style={{ backgroundColor: item.color || item.value.value }}
                />
              ))}
            </div>
          )}
          <p>
            Use a saved palette, typography, and artwork in another project.
          </p>
          <button
            className="secondary"
            disabled={!existing}
            onClick={() => onReuse(existing?.id)}
          >
            Create project from collection
          </button>
        </section>
        <section className="studio-card">
          <small className="workspace-kicker">Website assets</small>
          <h2>Choose a site to collect assets</h2>
          <p>Enter a website or pick an open tab.</p>
          <button className="secondary" onClick={onChooseSite}>
            Choose site
          </button>
        </section>
      </div>
      <div className="workspace-project-list">
        {projects.map((project) => (
          <article
            className="studio-card workspace-project-row"
            key={project.id}
          >
            <div>
              <h3>{project.name}</h3>
              <div className="studio-row">
                {collections(project).map((collection) => (
                  <button
                    className="text-button"
                    key={collection.id}
                    onClick={() => onCollection(project, collection)}
                  >
                    {collection.name}
                  </button>
                ))}
                {project.site?.hostname && (
                  <small>{project.site.hostname}</small>
                )}
              </div>
            </div>
            <button
              className="secondary"
              aria-label={`Open project ${project.name}`}
              onClick={() => onOpen(project)}
            >
              Open project →
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import CollectionCapture from "./CollectionCapture.jsx";
import CollectionAssets, {
  CaptureHistory,
  EditorDialog,
  collectionFields,
} from "./Collections.jsx";
import DesignKit from "./DesignKit.jsx";
import Designs from "./Designs.jsx";
import DesignEditor from "./DesignEditor.jsx";
import { cleanName, mergeAssets, moveAsset, savedAsset } from "./library.js";
import {
  changeCollection,
  copyAssetToCollection,
  createCollection,
  createProject,
  listProjects,
  saveDesign,
} from "./projects.js";

const sections = [
  ["assets", "Assets"],
  ["collect", "Add assets"],
  ["captures", "Captures"],
  ["kit", "Design kit"],
  ["designs", "Editor"],
];

function Studio() {
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState(null);
  const [section, setSection] = useState("assets");
  const [version, setVersion] = useState(null);
  const [dialog, setDialog] = useState("");
  const [error, setError] = useState("");
  const [designId, setDesignId] = useState("");
  const [newDesign, setNewDesign] = useState(false);
  const [startingAsset, setStartingAsset] = useState(null);
  const currentProject = projects?.find(
    (project) => project.id === selection?.projectId,
  );
  const collection = currentProject?.collections.find(
    (entry) => entry.id === selection?.collectionId,
  );
  const design = collection?.designs?.find(({ id }) => id === designId);
  const heading = useRef(null);
  const query = search.trim().toLowerCase();
  const shownProjects = projects?.flatMap((project) => {
    if (project.name.toLowerCase().includes(query)) return [project];
    const collections = project.collections.filter((entry) =>
      entry.name.toLowerCase().includes(query),
    );
    return collections.length ? [{ ...project, collections }] : [];
  });

  async function refreshProjects() {
    setError("");
    try {
      setProjects(await listProjects());
    } catch {
      setError("Couldn’t read projects saved on this device.");
    }
  }
  useEffect(() => {
    listProjects()
      .then((records) => {
        setProjects(records);
        const params = new URLSearchParams(location.search);
        const project = records.find(({ id }) => id === params.get("project"));
        const linked = project?.collections.find(
          ({ id }) => id === params.get("collection"),
        );
        if (linked) openCollection(project, linked);
      })
      .catch(() => setError("Couldn’t read projects saved on this device."));
    globalThis.chrome.storage.local
      .get("cssGetterOptions")
      .then(({ cssGetterOptions }) => {
        const appearance = cssGetterOptions?.appearance;
        if (["light", "dark"].includes(appearance))
          document.documentElement.dataset.appearance = appearance;
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [selection]);

  function updateProject(project) {
    setProjects((current) => [
      project,
      ...current.filter((item) => item.id !== project.id),
    ]);
  }

  function openCollection(project, next, view = "assets") {
    setSelection({ projectId: project.id, collectionId: next.id });
    setVersion(null);
    setDesignId("");
    setNewDesign(false);
    setSection(view);
  }

  function openSection(view) {
    setVersion(null);
    setSection(view);
  }

  function startDesign(asset = null) {
    setStartingAsset(asset);
    setNewDesign(true);
    openSection("designs");
  }

  async function writeDesign(draft, expectedRevision = null) {
    const { project, result } = await saveDesign(
      currentProject.id,
      collection.id,
      draft,
      expectedRevision,
    );
    updateProject(project);
    return result;
  }

  async function newDraft(draft, asset) {
    const saved = await writeDesign(draft);
    setNewDesign(false);
    setStartingAsset(asset);
    setDesignId(saved.id);
  }

  async function updateCollection(mutate) {
    const { project } = await changeCollection(
      currentProject.id,
      collection.id,
      mutate,
    );
    updateProject(project);
  }

  function onRecapture(previous) {
    setVersion(previous);
    setSection("collect");
  }

  function saveAsset(id, fields) {
    return updateCollection((next) =>
      Object.assign(savedAsset(next, id), fields),
    );
  }

  function removeAsset(id, removed) {
    return updateCollection((next) => {
      const item = savedAsset(next, id);
      if (removed) item.removedAt = new Date().toISOString();
      else delete item.removedAt;
    });
  }

  function saveKit(kit) {
    return updateCollection((next) => {
      next.kits = [...(next.kits || []).filter(({ id }) => id !== kit.id), kit];
    });
  }

  async function copyAsset(id, targetId) {
    const { project } = await copyAssetToCollection(
      currentProject.id,
      collection.id,
      targetId,
      id,
    );
    updateProject(project);
  }

  const projectDialog = dialog === "project";
  const editDialog = dialog === "edit-collection";
  async function submitDialog({ name, notes }) {
    if (projectDialog) {
      const project = await createProject(name);
      updateProject(project);
      openCollection(project, project.collections[0], "collect");
    } else if (editDialog) {
      await updateCollection((next, project) => {
        const cleaned = cleanName(name);
        if (
          project.collections.some(
            (candidate) =>
              candidate.id !== next.id &&
              candidate.name.toLowerCase() === cleaned.toLowerCase(),
          )
        )
          throw Error(
            "Choose a different name from the other collections in this project.",
          );
        next.name = cleaned;
        next.notes = notes.trim();
      });
    } else {
      const { project, collection: next } = await createCollection(
        currentProject.id,
        name,
      );
      updateProject(project);
      openCollection(project, next);
    }
  }

  if (design)
    return (
      <div className="studio-shell design-shell">
        <main className="studio-content">
          <DesignEditor
            key={design.id}
            initial={design}
            collection={collection}
            startingAsset={startingAsset}
            onSave={async (draft, revision) =>
              (await writeDesign(draft, revision)).revision
            }
            onBack={() => {
              setStartingAsset(null);
              setDesignId("");
              openSection("assets");
            }}
          />
        </main>
      </div>
    );

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="brand">
          <img
            src="images/CSS-Getter-Icon-48px.png"
            alt=""
            width="24"
            height="24"
          />
          <strong>Getter Studio</strong>
        </div>
        <nav aria-label="Studio">
          <button
            className="text-button"
            aria-current={!selection ? "page" : undefined}
            onClick={() => {
              setSelection(null);
              refreshProjects();
            }}
          >
            Projects
          </button>
        </nav>
      </header>
      <main className="studio-content">
        {error && (
          <p role="alert">
            {error}{" "}
            <button className="secondary" onClick={refreshProjects}>
              Retry
            </button>
          </p>
        )}
        {collection ? (
          <>
            <div className="studio-heading">
              <div>
                <p>{currentProject.name} / Collection</p>
                <h1 tabIndex={-1} ref={heading}>
                  {collection.name}
                </h1>
                {collection.notes && <p>{collection.notes}</p>}
              </div>
              <small>On this device</small>
            </div>
            <div
              className="studio-toolbar studio-fields"
              aria-label="Collection controls"
            >
              <label>
                Collection
                <select
                  value={collection.id}
                  onChange={(event) =>
                    openCollection(
                      currentProject,
                      currentProject.collections.find(
                        ({ id }) => id === event.target.value,
                      ),
                    )
                  }
                >
                  {currentProject.collections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary"
                onClick={() => setDialog("collection")}
              >
                New collection
              </button>
              <button
                className="secondary"
                onClick={() => setDialog("edit-collection")}
              >
                Edit collection
              </button>
            </div>
            <nav
              aria-label="Collection views"
              className="studio-collection-nav"
            >
              {sections.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={section === id ? "primary" : "secondary"}
                  aria-pressed={section === id}
                  onClick={() => openSection(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {section === "assets" && (
              <CollectionAssets
                key={collection.id}
                collection={collection}
                destinations={currentProject.collections.filter(
                  ({ id }) => id !== collection.id,
                )}
                onCollect={() => openSection("collect")}
                onExport={() => openSection("kit")}
                onDesign={startDesign}
                onEdit={saveAsset}
                onMove={(id, step) =>
                  updateCollection((next) => moveAsset(next, id, step))
                }
                onRemove={removeAsset}
                onCopy={copyAsset}
                onMerge={(target, source) =>
                  updateCollection((next) => mergeAssets(next, target, source))
                }
              />
            )}
            {section === "collect" && (
              <CollectionCapture
                key={`${collection.id}:${version?.id || "new"}`}
                projectId={currentProject.id}
                collectionId={collection.id}
                version={version}
                onSave={updateProject}
              />
            )}
            {section === "captures" && (
              <CaptureHistory
                collection={collection}
                onRecapture={onRecapture}
              />
            )}
            {section === "kit" && (
              <DesignKit
                key={collection.id}
                collection={collection}
                onSave={saveKit}
              />
            )}
            {section === "designs" && (
              <Designs
                key={collection.id}
                collection={collection}
                startingAsset={startingAsset}
                creating={newDesign}
                onNew={() => startDesign()}
                onCancel={() => setNewDesign(false)}
                onOpen={(draft) => {
                  setStartingAsset(null);
                  setDesignId(draft.id);
                }}
                onCreate={newDraft}
              />
            )}
          </>
        ) : (
          <>
            <div className="studio-heading">
              <h1 tabIndex={-1} ref={heading}>
                Your projects
              </h1>
              <button
                className="primary"
                disabled={!projects || !!error}
                onClick={() => setDialog("project")}
              >
                New project
              </button>
            </div>
            {!projects && !error && <p role="status">Opening projects…</p>}
            {projects?.length === 0 && (
              <p>Create a project to start a collection on this device.</p>
            )}
            {projects?.length > 0 && (
              <div className="studio-toolbar studio-fields">
                <label>
                  Find projects or collections
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>
            )}
            {query && !shownProjects?.length && (
              <p>No projects or collections match this search.</p>
            )}
            <div className="studio-projects">
              {shownProjects?.map((project) => (
                <article
                  className="studio-card studio-project"
                  key={project.id}
                >
                  <h2>{project.name}</h2>
                  <p>On this device</p>
                  <ul>
                    {project.collections.map((item) => (
                      <li key={item.id}>
                        <button
                          className="text-button"
                          onClick={() => openCollection(project, item)}
                        >
                          {item.name}
                        </button>
                        <small>
                          {
                            item.assets.filter(({ removedAt }) => !removedAt)
                              .length
                          }{" "}
                          assets
                        </small>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
      {dialog && (
        <EditorDialog
          title={
            projectDialog
              ? "Create a project"
              : editDialog
                ? "Edit collection"
                : "New collection"
          }
          description={
            projectDialog
              ? "A new collection will be saved with this project on this device."
              : undefined
          }
          initial={{
            name: editDialog ? collection.name : "",
            notes: editDialog ? collection.notes : "",
          }}
          fields={
            projectDialog
              ? [
                  {
                    key: "name",
                    label: "Project name",
                    max: 50,
                    required: true,
                  },
                ]
              : editDialog
                ? collectionFields
                : collectionFields.slice(0, 1)
          }
          action={
            projectDialog
              ? "Create project"
              : editDialog
                ? "Save collection"
                : "Create collection"
          }
          onSubmit={submitDialog}
          onClose={() => setDialog("")}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Studio />);

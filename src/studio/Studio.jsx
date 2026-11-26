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
import DesignReviews from "./DesignReviews.jsx";
import {
  ProjectsView,
  WorkspaceFooter,
  WorkspaceHeader,
  WorkspaceSteps,
} from "./Workspace.jsx";
import { openWebsites, websiteAddress } from "./sources.js";
import { launchInspectPro } from "./inspect-workspace.js";
import { cleanName, mergeAssets, moveAsset, savedAsset } from "./library.js";
import {
  changeCollection,
  copyAssetToCollection,
  createCollection,
  createProject,
  listProjects,
  projectCollectionEntries,
  saveDesign,
  saveProjectSite,
} from "./projects.js";

const collectionTools = [
  ["captures", "Captures"],
  ["kit", "Design kit"],
];

function Studio() {
  const [projects, setProjects] = useState(null);
  const [siteOptions, setSiteOptions] = useState([]);
  const [inspectWindow, setInspectWindow] = useState(null);
  const [selection, setSelection] = useState(null);
  const [section, setSection] = useState("assets");
  const [version, setVersion] = useState(null);
  const [dialog, setDialog] = useState("");
  const [error, setError] = useState("");
  const [designId, setDesignId] = useState("");
  const [newDesign, setNewDesign] = useState(false);
  const [startingAsset, setStartingAsset] = useState(null);
  const [startingLayout, setStartingLayout] = useState("website");
  const [projectOverview, setProjectOverview] = useState(false);
  const [notice, setNotice] = useState("");
  const [featuredCollection, setFeaturedCollection] = useState("");
  const [reviews, setReviews] = useState(() => {
    const initialReviewId = new URLSearchParams(location.search).get("review");
    return initialReviewId ? { initialReviewId } : null;
  });
  const currentProject = projects?.find(
    (project) => project.id === selection?.projectId,
  );
  const ownerId = selection?.ownerId || currentProject?.id;
  const owner = projects?.find(({ id }) => id === ownerId);
  const collection = owner?.collections.find(
    ({ id }) => id === selection?.collectionId,
  );
  const design = collection?.designs?.find(({ id }) => id === designId);
  const heading = useRef(null);

  const projectCollections = (project) =>
    projectCollectionEntries(project, projects || []);

  function clearReviewRoute() {
    const url = new URL(location.href);
    if (url.searchParams.has("review")) {
      url.searchParams.delete("review");
      history.replaceState(null, "", url);
    }
  }

  function showProjects() {
    setReviews(null);
    clearReviewRoute();
    setSelection(null);
    setNotice("");
    refreshProjects();
  }

  function showReviews(scope = {}) {
    clearReviewRoute();
    setReviews({ ...scope, navigationId: crypto.randomUUID() });
  }

  function openProject(project) {
    const target = projectCollections(project)[0];
    if (!target) return;
    setReviews(null);
    clearReviewRoute();
    openCollection(project, target, "project");
  }

  async function openProjectDialog(next) {
    setDialog(next);
    setSiteOptions([]);
    setInspectWindow(null);
    try {
      const [options, window] = await Promise.all([
        openWebsites(chrome),
        next === "inspect-pro" ? chrome.windows.getCurrent() : null,
      ]);
      setSiteOptions(options);
      setInspectWindow(window?.id ?? null);
    } catch {
      setSiteOptions([]);
    }
  }

  function siteFromFields({ address, tab }) {
    if (address?.trim()) {
      try {
        const url = websiteAddress(address.trim());
        return { address: url.origin + url.pathname, hostname: url.hostname };
      } catch {
        throw Error("Enter an HTTP or HTTPS website address.");
      }
    }
    const selected = siteOptions.find(({ id }) => String(id) === tab);
    return selected ? { tabId: tab, hostname: selected.hostname } : null;
  }

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
        const linked =
          project &&
          projectCollectionEntries(project, records).find(
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
    setNotice("");
    setProjectOverview(view === "project");
    setSelection({
      projectId: project.id,
      ownerId: next.ownerId || project.id,
      collectionId: next.id,
    });
    setVersion(null);
    setDesignId("");
    setNewDesign(false);
    setSection(view === "project" ? "assets" : view);
  }

  function openSection(view) {
    setProjectOverview(false);
    setVersion(null);
    setSection(view);
  }

  function startDesign(asset = null, layout = "website") {
    setStartingLayout(layout);
    setStartingAsset(asset);
    setNewDesign(true);
    openSection("designs");
  }

  async function writeDesign(draft, expectedRevision = null) {
    const { project, result } = await saveDesign(
      ownerId,
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
    const { project } = await changeCollection(ownerId, collection.id, mutate);
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
      ownerId,
      collection.id,
      targetId,
      id,
    );
    updateProject(project);
  }

  const projectDialog = ["project", "reuse"].includes(dialog);
  const siteDialog = dialog === "change-site";
  const inspectDialog = dialog === "inspect-pro";
  const editDialog = dialog === "edit-collection";
  const reusable = (projects || []).flatMap((project) =>
    project.collections.map((item) => ({
      id: `${project.id}|${item.id}`,
      name: item.name,
      ownerId: project.id,
      item,
    })),
  );
  const siteFields = [
    {
      key: "tab",
      label: "Open tabs",
      options: [
        { id: "", name: "Choose an open tab" },
        ...siteOptions.map(({ id, label }) => ({
          id: String(id),
          name: label,
        })),
      ],
    },
    { key: "address", label: "Website address", max: 2048 },
  ];
  const inspectSiteFields = [
    {
      key: "siteMode",
      label: "How to open the page",
      options: [
        { id: "tab", name: "Choose an open tab" },
        { id: "address", name: "Enter a website address" },
      ],
    },
    ...siteFields.map((field) => ({
      ...field,
      required: true,
      type: field.key === "address" ? "url" : undefined,
      visible: ({ siteMode }) => siteMode === field.key,
    })),
  ];
  async function submitDialog(fields) {
    const { name, notes, collection: destination } = fields;
    if (projectDialog) {
      const source = reusable.find(({ id }) => id === destination);
      const site = siteFromFields(fields);
      const project = await createProject(name, {
        site,
        collectionLink: source
          ? { projectId: source.ownerId, collectionId: source.item.id }
          : null,
      });
      updateProject(project);
      const target = source
        ? { ...source.item, ownerId: source.ownerId }
        : project.collections[0];
      openCollection(project, target, source || site ? "project" : "collect");
    } else if (inspectDialog) {
      if (!Number.isInteger(inspectWindow))
        throw Error("The sites are still loading. Try again in a moment.");
      let address;
      if (fields.siteMode === "address") {
        try {
          address = websiteAddress(fields.address.trim()).href;
        } catch {
          throw Error(
            "Enter an HTTP or HTTPS website address without credentials.",
          );
        }
      }
      const source =
        fields.siteMode === "tab" &&
        siteOptions.find(({ id }) => String(id) === fields.tab);
      if (!address && !source)
        throw Error("Choose an open tab or enter a website address.");
      await launchInspectPro(chrome, {
        windowId: inspectWindow,
        address,
        source,
        destination: collection
          ? { projectId: currentProject.id, collectionId: collection.id }
          : undefined,
      });
    } else if (siteDialog) {
      const site = siteFromFields(fields);
      if (!site) throw Error("Choose an open tab or enter a website address.");
      const { project } = await saveProjectSite(currentProject.id, site);
      updateProject(project);
      openCollection(project, { ...collection, ownerId }, "collect");
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

  if (reviews && !dialog)
    return (
      <div className="studio-shell workspace-shell">
        <WorkspaceHeader
          active="reviews"
          onProjects={showProjects}
          onInspect={() => openProjectDialog("inspect-pro")}
          onReview={() => showReviews()}
        />
        <main className="studio-content workspace-page">
          <DesignReviews
            key={reviews.navigationId || reviews.initialReviewId}
            projects={projects || []}
            onProject={openProject}
            {...reviews}
          />
        </main>
        <WorkspaceFooter />
      </div>
    );

  if (design)
    return (
      <div className="studio-shell design-shell workspace-shell">
        <WorkspaceHeader project={currentProject} />
        <main className="studio-content workspace-editor-content">
          <DesignEditor
            key={design.id}
            initial={design}
            collection={collection}
            startingAsset={startingAsset}
            onSave={async (draft, revision) =>
              (await writeDesign(draft, revision)).revision
            }
            onBack={(next = "assets") => {
              setStartingAsset(null);
              setDesignId("");
              if (next === "projects") showProjects();
              else openSection(next);
            }}
          />
        </main>
        <WorkspaceFooter collection={collection} />
      </div>
    );

  return (
    <div className="studio-shell workspace-shell">
      <WorkspaceHeader
        project={collection && !projectOverview ? currentProject : null}
        onProjects={showProjects}
        onInspect={() => openProjectDialog("inspect-pro")}
        onReview={() => showReviews()}
      />
      {collection && !projectOverview && (
        <WorkspaceSteps
          active={section}
          actions={{
            collect: () => openSection("collect"),
            assets: () => openSection("assets"),
            designs: () => openSection("designs"),
          }}
        >
          <div className="workspace-collection-tools">
            {collectionTools.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="text-button"
                aria-current={section === id ? "page" : undefined}
                onClick={() => openSection(id)}
              >
                {label}
              </button>
            ))}
            <button className="text-button" onClick={showProjects}>
              Projects
            </button>
          </div>
        </WorkspaceSteps>
      )}
      <main className="studio-content workspace-page">
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p role="alert">
            {error}{" "}
            <button className="secondary" onClick={refreshProjects}>
              Retry
            </button>
          </p>
        )}
        {collection && projectOverview ? (
          <>
            <div className="studio-heading">
              <div>
                <h1>{currentProject.name}</h1>
                <p>
                  {currentProject.site?.hostname ||
                    "Choose a site to collect assets"}
                </p>
              </div>
              <div className="studio-row">
                <button
                  className="secondary"
                  onClick={() => openProjectDialog("change-site")}
                >
                  Change site
                </button>
                <button
                  className="secondary"
                  onClick={() => openProjectDialog("inspect-pro")}
                >
                  Inspect Pro
                </button>
                <button
                  className="primary"
                  onClick={() => openSection("collect")}
                >
                  Collect assets →
                </button>
              </div>
            </div>
            <div className="workspace-project-launch">
              <section className="studio-card">
                <small className="workspace-kicker">
                  {currentProject.collectionLink
                    ? "Linked collection"
                    : "Collection"}
                </small>
                <h2>{collection.name}</h2>
                <button
                  className="secondary"
                  onClick={() => openSection("assets")}
                >
                  Open collection →
                </button>
              </section>
              <section className="studio-card">
                <small className="workspace-kicker">Designs</small>
                <h2>Continue designing</h2>
                <button
                  className="secondary"
                  onClick={() => openSection("designs")}
                >
                  Open editor →
                </button>
              </section>
              <section className="studio-card">
                <h2>Design Review</h2>
                <div className="studio-row">
                  <button
                    className="secondary"
                    onClick={() =>
                      showReviews({ projectId: currentProject.id, setup: true })
                    }
                  >
                    New design review
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      showReviews({ projectId: currentProject.id })
                    }
                  >
                    View project reviews
                  </button>
                </div>
              </section>
            </div>
          </>
        ) : collection ? (
          <>
            <div className="studio-heading">
              <div>
                <small className="workspace-kicker">Your collection</small>
                <h1 tabIndex={-1} ref={heading}>
                  {collection.name}
                </h1>
                <p>
                  {
                    collection.assets.filter(({ removedAt }) => !removedAt)
                      .length
                  }{" "}
                  saved assets · originals stay linked to their source
                </p>
                {collection.notes && <p>{collection.notes}</p>}
              </div>
              <div className="studio-row">
                <button
                  className="secondary"
                  aria-label="Edit collection"
                  onClick={() => setDialog("edit-collection")}
                >
                  Rename
                </button>
                <button
                  className="secondary"
                  onClick={() => openSection("collect")}
                >
                  ＋ Collect more
                </button>
              </div>
            </div>
            {currentProject.collectionLink?.collectionId === collection.id && (
              <p className="workspace-collection-origin">
                <strong>Starting with {collection.name}.</strong> Saved colors,
                typography, and artwork are ready to reuse.
              </p>
            )}
            <details className="workspace-collection-switcher">
              <summary>Manage collections</summary>
              <div className="studio-row">
                <label>
                  Collection
                  <select
                    value={collection.id}
                    onChange={(event) =>
                      openCollection(
                        currentProject,
                        projectCollections(currentProject).find(
                          ({ id }) => id === event.target.value,
                        ),
                      )
                    }
                  >
                    {projectCollections(currentProject).map((item) => (
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
              </div>
            </details>
            {section === "assets" && (
              <CollectionAssets
                key={collection.id}
                collection={collection}
                destinations={owner.collections.filter(
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
                projectId={ownerId}
                collectionId={collection.id}
                version={version}
                site={currentProject.site}
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
                startingLayout={startingLayout}
                designCollectionName={
                  currentProject.collectionLink
                    ? currentProject.name
                    : collection.name
                }
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
        ) : projects ? (
          <ProjectsView
            projects={projects}
            collections={projectCollections}
            onNew={() => openProjectDialog("project")}
            onReuse={(collectionId) => {
              setFeaturedCollection(
                reusable.find(({ item }) => item.id === collectionId)?.id || "",
              );
              openProjectDialog("reuse");
            }}
            onChooseSite={() => openProjectDialog("inspect-pro")}
            onOpen={openProject}
            onCollection={openCollection}
          />
        ) : (
          !error && <p role="status">Opening projects…</p>
        )}
      </main>
      <WorkspaceFooter collection={collection} />
      {dialog && (
        <EditorDialog
          title={
            projectDialog
              ? "Create a project"
              : inspectDialog
                ? "Inspect Pro · Choose a site"
                : siteDialog
                  ? "Choose a site"
                  : editDialog
                    ? "Edit collection"
                    : "New collection"
          }
          description={
            inspectDialog
              ? "Open the inspection side panel beside the site you choose."
              : undefined
          }
          initial={{
            name: editDialog ? collection.name : "",
            notes: editDialog ? collection.notes : "",
            collection: dialog === "reuse" ? featuredCollection : "",
            address:
              dialog === "change-site"
                ? currentProject.site?.address || ""
                : "",
            tab: "",
            siteMode: "tab",
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
                  ...siteFields,
                  {
                    key: "collection",
                    label: "Collection",
                    options: [
                      { id: "", name: "Start with a new collection" },
                      ...reusable,
                    ],
                  },
                ]
              : inspectDialog
                ? inspectSiteFields
                : siteDialog
                  ? siteFields
                  : editDialog
                    ? collectionFields
                    : collectionFields.slice(0, 1)
          }
          action={
            projectDialog
              ? "Create project"
              : inspectDialog
                ? "Open Inspect Pro"
                : siteDialog
                  ? "Collect assets"
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

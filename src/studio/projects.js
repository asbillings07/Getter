import {
  addCapture,
  cleanName,
  newCollection,
  savedAsset,
  upgradeProject,
} from "./library.js";

// The QA package owns this local database. The verified account integration can
// select its own storage namespace without adopting device-local QA data.
let connection;

function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open("getter-studio-workspace-qa", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("projects", { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    connection = null;
    throw error;
  });
  return connection;
}

async function transact(mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("projects", mode);
    let result, failure;
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure ?? transaction.error);
    const finish = (value) => (result = value);
    const abort = (error) => {
      failure = error;
      transaction.abort();
    };
    operation(transaction.objectStore("projects"), finish, abort);
  });
}

export function listProjects() {
  return transact("readonly", (store, finish, abort) => {
    const request = store.getAll();
    request.onsuccess = () => {
      try {
        finish(
          request.result
            .map(upgradeProject)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      } catch (error) {
        abort(error);
      }
    };
  });
}

export function projectCollectionEntries(project, projects) {
  const link = project.collectionLink;
  const linked =
    link &&
    projects
      .find(({ id }) => id === link.projectId)
      ?.collections.find(({ id }) => id === link.collectionId);
  return [
    ...(linked ? [{ ...linked, ownerId: link.projectId }] : []),
    ...project.collections,
  ];
}

function newProject(input, collectionName) {
  const name = cleanName(input, 50);
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name,
    updatedAt: new Date().toISOString(),
    collections: [
      newCollection(
        collectionName
          ? cleanName(collectionName)
          : `${name.slice(0, 49)} collection`,
      ),
    ],
  };
}

export function createProject(input, { site, collectionLink } = {}) {
  const project = newProject(input);
  if (site) project.site = site;
  if (collectionLink) {
    project.collectionLink = collectionLink;
    project.collections = [];
  }
  return transact("readwrite", (store, finish, abort) => {
    const add = () => {
      store.add(project);
      finish(project);
    };
    if (!collectionLink) {
      add();
      return;
    }
    const request = store.get(collectionLink.projectId);
    request.onsuccess = () => {
      try {
        if (
          !request.result ||
          !upgradeProject(request.result).collections.some(
            ({ id }) => id === collectionLink.collectionId,
          )
        )
          throw Error("Choose a collection that is still available.");
        add();
      } catch (error) {
        abort(error);
      }
    };
  });
}

function changeProject(id, mutate) {
  return transact("readwrite", (store, finish, abort) => {
    const request = store.get(id);
    request.onsuccess = () => {
      try {
        if (!request.result)
          throw Error(
            "This project is unavailable. Return to Projects to refresh.",
          );
        const project = upgradeProject(request.result);
        const result = mutate(project);
        project.updatedAt = new Date().toISOString();
        store.put(project);
        finish({ project, result });
      } catch (error) {
        abort(error);
      }
    };
  });
}

export function saveProjectSite(id, site) {
  return changeProject(id, (project) => {
    project.site = site;
  });
}

export async function createCollection(projectId, name) {
  const collection = newCollection(cleanName(name));
  const { project } = await changeProject(projectId, (current) => {
    if (
      current.collections.some(
        (entry) => entry.name.toLowerCase() === collection.name.toLowerCase(),
      )
    )
      throw Error(
        "Choose a different name from the other collections in this project.",
      );
    current.collections.push(collection);
  });
  return { project, collection };
}

export function changeCollection(projectId, collectionId, mutate) {
  return changeProject(projectId, (project) => {
    const collection = project.collections.find(
      ({ id }) => id === collectionId,
    );
    if (!collection)
      throw Error(
        "This collection is unavailable. Return to Projects to refresh.",
      );
    return mutate(collection, project);
  });
}

export function saveCapture(projectId, collectionId, capture) {
  return changeCollection(projectId, collectionId, (collection) =>
    addCapture(collection, capture),
  );
}

export function saveDesign(
  projectId,
  collectionId,
  design,
  expectedRevision = null,
) {
  return changeCollection(projectId, collectionId, (collection) => {
    const designs = (collection.designs ||= []);
    const index = designs.findIndex(({ id }) => id === design.id);
    const prior = designs[index];
    if ((prior?.revision ?? null) !== expectedRevision)
      throw Error(
        "This design changed in another tab. Your draft is still open. Export it before reopening.",
      );
    const updatedAt = new Date().toISOString();
    const saved = {
      ...design,
      name: cleanName(design.name),
      revision: (prior?.revision || 0) + 1,
      createdAt: prior?.createdAt || updatedAt,
      updatedAt,
    };
    if (index === -1) designs.push(saved);
    else designs[index] = saved;
    return saved;
  });
}

export async function saveFromPage(destination, capture) {
  if (!destination.projectId) {
    const project = newProject(
      destination.projectName,
      destination.collectionName,
    );
    const [collection] = project.collections;
    addCapture(collection, capture);
    return transact("readwrite", (store, finish) => {
      store.add(project);
      finish({
        projectId: project.id,
        collectionId: collection.id,
        name: collection.name,
      });
    });
  }
  const { result } = await changeProject(destination.projectId, (project) => {
    let collection;
    if (destination.collectionId) {
      collection = project.collections.find(
        ({ id }) => id === destination.collectionId,
      );
      if (!collection)
        throw Error(
          "This collection is unavailable. Choose another collection.",
        );
    } else {
      const name = cleanName(destination.collectionName);
      if (
        project.collections.some(
          (item) => item.name.toLowerCase() === name.toLowerCase(),
        )
      )
        throw Error("Choose a different collection name.");
      collection = newCollection(name);
      project.collections.push(collection);
    }
    const duplicate = addCapture(collection, capture);
    return {
      projectId: project.id,
      collectionId: collection.id,
      name: collection.name,
      duplicate,
    };
  });
  return result;
}

export function copyAssetToCollection(projectId, sourceId, targetId, assetId) {
  return changeProject(projectId, (project) => {
    const source = project.collections.find(({ id }) => id === sourceId);
    const target = project.collections.find(({ id }) => id === targetId);
    if (!source || !target || source === target)
      throw Error("Choose another collection.");
    const asset = savedAsset(source, assetId);
    if (asset.removedAt) throw Error("Restore the item before copying it.");
    if (
      target.assets.some(
        ({ copiedFrom, removedAt }) => copiedFrom === assetId && !removedAt,
      )
    )
      throw Error("This item already has a copy in that collection.");
    const sources = asset.sources.map((ref) => ({
      ...ref,
      source:
        source.captures.find(({ id }) => id === ref.captureId)?.source ||
        ref.source,
    }));
    target.assets.push({
      ...asset,
      id: crypto.randomUUID(),
      sources,
      copiedFrom: assetId,
    });
  });
}

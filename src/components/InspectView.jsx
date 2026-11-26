import React, { useEffect, useRef, useState } from "react";
import { sections, inspectGroups, cssSnippet } from "../core/inspect.js";
import { verifyDocument } from "../core/workspace.js";
import Info from "./Info.jsx";
import InspectMotion from "../studio/InspectMotion.jsx";
import InspectComponentPreview from "../studio/InspectComponentPreview.jsx";
import InspectorIcon from "../studio/InspectorIcon.jsx";
import { capturableEffects } from "../studio/inspect.js";

function findPart(node, id) {
  if (!node || node.id === id) return node;
  for (const child of node.children) {
    const result = findPart(child, id);
    if (result) return result;
  }
}

function ComponentParts({ node, selectedId, onSelect }) {
  const mark =
    node.tag === "img"
      ? "image"
      : ["input", "button", "label", "select"].includes(node.tag)
        ? "control"
        : node.children.length
          ? "layers"
          : "text";
  return (
    <li>
      <button
        type="button"
        className="text-button inspect-pro-label"
        aria-pressed={node.id === selectedId}
        onClick={() => onSelect(node.id)}
      >
        <InspectorIcon name={mark} />
        <span>
          <code>{node.tag}</code>
          {node.text && ` · ${node.text.slice(0, 60)}`}
        </span>
      </button>
      {!!node.children.length && (
        <ul>
          {node.children.map((child) => (
            <ComponentParts
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
export default function InspectView({
  scan,
  model,
  onChange,
  onCopy,
  onNotice,
  onCollect,
  pro: proWorkspace = false,
}) {
  const pro = GETTER_STUDIO_WORKSPACE_QA && proWorkspace;
  const [status, setStatus] = useState("connecting"),
    [note, setNote] = useState("");
  const [motion, setMotion] = useState(null);
  const [observed, setObserved] = useState(null);
  const [parts, setParts] = useState(null);
  const connection = useRef(),
    latest = useRef(),
    waiters = useRef(new Map()),
    requestId = useRef(0);
  latest.current = { model, onChange };
  useEffect(() => {
    let live = true,
      port;
    setStatus("connecting");
    setNote("");
    (async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: scan.tabId, documentIds: [scan.documentId] },
          files: ["inspect.js"],
        });
        if (!live) return;
        port = chrome.tabs.connect(scan.tabId, {
          name: pro ? "getter-inspect-pro" : "getter-inspect",
          documentId: scan.documentId,
        });
        connection.current = port;
        port.onMessage.addListener((message) => {
          if (!live) return;
          const { model: m, onChange: change } = latest.current;
          if (
            GETTER_STUDIO_WORKSPACE_QA &&
            message.type === "studio-sampled-motion"
          )
            setObserved({ ...message, documentId: scan.documentId });
          if (
            GETTER_STUDIO_WORKSPACE_QA &&
            message.type === "studio-native-motion"
          )
            setMotion({
              value: message.motion,
              selectionId: message.selectionId,
              documentId: scan.documentId,
            });
          if (message.requestId) {
            waiters.current.get(message.requestId)?.(
              message.type === "snapshot"
                ? message.snapshot
                : GETTER_STUDIO_WORKSPACE_QA &&
                    message.type === "studio-capture"
                  ? message.capture
                  : GETTER_STUDIO_WORKSPACE_QA &&
                      message.type === "studio-motion"
                    ? message.motion
                    : pro && message.type === "studio-component-parts"
                      ? message.parts
                      : null,
            );
            waiters.current.delete(message.requestId);
          }
          if (message.type === "connected") {
            setStatus("ready");
            port.postMessage({ type: m.picking ? "start" : "pause" });
          }
          if (message.type === "snapshot") {
            setStatus("ready");
            setNote("");
            change({ ...m, snapshot: message.snapshot });
          }
          if (message.type === "paused") change({ ...m, picking: false });
          if (message.type === "removed") {
            setStatus("removed");
            if (GETTER_STUDIO_WORKSPACE_QA) setObserved(null);
            change({ ...m, snapshot: null });
          }
          if (message.type === "unavailable") setNote(message.message);
          if (message.type === "error") {
            setNote(message.message);
          }
        });
        port.onDisconnect.addListener(() => {
          void chrome.runtime.lastError;
          if (live) {
            setStatus("error");
            if (GETTER_STUDIO_WORKSPACE_QA) setObserved(null);
            setNote(
              "The page connection ended. Scan again or reopen Getter from the toolbar.",
            );
          }
          for (const resolve of waiters.current.values()) resolve(null);
          waiters.current.clear();
        });
      } catch {
        if (live) {
          setStatus("error");
          setNote(
            "Inspect could not access this page. Open Getter from the toolbar and try again.",
          );
        }
      }
    })();
    return () => {
      live = false;
      port?.disconnect();
      connection.current = null;
      for (const resolve of waiters.current.values()) resolve(null);
      waiters.current.clear();
    };
  }, [scan.tabId, scan.documentId, pro]);
  useEffect(() => {
    try {
      connection.current?.postMessage({
        type: model.picking ? "start" : "pause",
      });
    } catch {}
  }, [model.picking]);
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape")
        latest.current.onChange({ ...latest.current.model, picking: false });
    };
    const hide = () => {
      if (!document.hidden) return;
      try {
        connection.current?.postMessage({ type: "pause" });
      } catch {}
      latest.current.onChange({ ...latest.current.model, picking: false });
    };
    document.addEventListener("keydown", esc);
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  function request(message) {
    return new Promise((resolve) => {
      const id = ++requestId.current;
      const timeout = setTimeout(() => {
        waiters.current.delete(id);
        resolve(null);
      }, 2000);
      waiters.current.set(id, (snapshot) => {
        clearTimeout(timeout);
        resolve(snapshot);
      });
      try {
        connection.current?.postMessage({ ...message, requestId: id });
      } catch {
        clearTimeout(timeout);
        waiters.current.delete(id);
        resolve(null);
      }
    });
  }
  async function copy(value, label) {
    const selected = model.snapshot?.selector;
    if (!(await verifyDocument(chrome, scan))) {
      onNotice("The page changed. Scan again before copying.");
      return;
    }
    const fresh = await request({ type: "refresh" });
    if (
      !fresh ||
      fresh.selector !== selected ||
      !(await verifyDocument(chrome, scan))
    ) {
      onNotice("The selection changed. Choose an element and try again.");
      return;
    }
    onCopy(value, label, scan);
  }
  const selectionId = model.snapshot?.selectionId;
  const componentRootId = model.snapshot?.componentRootId;
  const matchesSelection = (result) =>
    !!result &&
    selectionId !== undefined &&
    result.selectionId === selectionId &&
    result.documentId === scan.documentId;
  useEffect(() => {
    if (
      !GETTER_STUDIO_WORKSPACE_QA ||
      !onCollect ||
      model.section !== "effects" ||
      selectionId === undefined
    )
      return;
    let live = true;
    setMotion(null);
    request({ type: "inspect-motion", selectionId }).then((value) => {
      if (live) setMotion({ value, selectionId, documentId: scan.documentId });
    });
    return () => {
      live = false;
    };
  }, [scan.documentId, selectionId, model.section, model.picking, !!onCollect]);

  useEffect(() => {
    if (!pro || componentRootId === undefined) return;
    let live = true;
    request({ type: "component-parts", selectionId }).then((result) => {
      if (live) setParts({ result, componentRootId });
    });
    return () => {
      live = false;
    };
  }, [scan.documentId, componentRootId, pro]);

  async function selectPart(partId) {
    if (!(await verifyDocument(chrome, scan))) {
      onNotice("The page changed. Choose the current page before selecting.");
      return;
    }
    if (
      !(await request({
        type: "select-part",
        selectionId,
        partId,
        revision: parts?.result?.revision,
      }))
    )
      onNotice("This part is no longer available. Choose the component again.");
  }

  async function selectParent() {
    if (!(await verifyDocument(chrome, scan))) {
      onNotice("The page changed. Scan again before selecting.");
      return;
    }
    await request({ type: "select-parent", selectionId });
  }

  async function collect(scope, sampleId) {
    const selectionId = model.snapshot?.selectionId;
    if (!(await verifyDocument(chrome, scan))) {
      onNotice("The page changed. Scan again before saving.");
      return;
    }
    const capture = await request({
      type: "collect-selection",
      selectionId,
      scope,
      sampleId,
    });
    if (
      !capture ||
      latest.current.model.snapshot?.selectionId !== selectionId ||
      !(await verifyDocument(chrome, scan))
    ) {
      onNotice("Choose the element again before saving.");
      return;
    }
    onCollect(capture, scope, selectionId);
  }
  const snapshot = model.snapshot,
    groups = inspectGroups(snapshot, model.section, model.all, model.query);
  const partsReady =
    parts !== null && parts.componentRootId === componentRootId;
  const tree = partsReady ? parts.result : null;
  const component = tree && {
    ...tree,
    selected:
      snapshot?.partId === undefined
        ? tree.selected
        : findPart(tree.component, snapshot.partId),
  };
  const observedSelection = matchesSelection(observed) ? observed : null;
  const sectionButtons = pro ? [["parts", "Parts"], ...sections] : sections;
  const hasEffect =
    pro && snapshot && Object.keys(capturableEffects(snapshot.css)).length > 0;
  const toggle = (key, value) => onChange({ ...model, [key]: value });
  const controls = (
    <div className="inspect-mode-row">
      <div className="inspect-controls">
        <button
          type="button"
          className="secondary selection-button"
          onClick={() => {
            if (!model.picking) setStatus("ready");
            toggle("picking", !model.picking);
          }}
        >
          {model.picking ? "Pause selection" : "Resume selecting"}
        </button>
        <label className="setting">
          Show all properties
          <input
            type="checkbox"
            role="switch"
            checked={model.all}
            onChange={(e) => toggle("all", e.target.checked)}
          />
        </label>
      </div>
      {snapshot && (
        <button
          className="primary"
          onClick={() =>
            onChange({
              ...model,
              previousSection: model.section,
              section: "code",
              query: "",
            })
          }
        >
          ▣ Copy CSS
        </button>
      )}
    </div>
  );
  if (status === "connecting")
    return (
      <section className="state" role="status">
        Connecting to this page…
      </section>
    );
  if (status === "error")
    return (
      <section className="state" role="status">
        <h1>Inspect unavailable</h1>
        <p>{note}</p>
      </section>
    );
  const valueRow = (r) => (
    <div
      className={`property ${["text", "src", "href", "alt"].includes(r.name) ? "property-long" : ""}`}
      key={r.name}
    >
      <dt>{r.name}</dt>
      <dd>
        {r.value === null || r.value === undefined ? (
          <span className="missing-value">Not set</span>
        ) : (
          <button
            className="value-copy"
            title={`Copy ${r.name}`}
            onClick={() => copy(String(r.value), r.name)}
          >
            {r.value}
          </button>
        )}
      </dd>
    </div>
  );
  const sectionControls = (
    <>
      <div className="inspect-tabs-row">
        <div className="segments" role="group" aria-label="Inspect sections">
          {sectionButtons.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={model.section === id}
              onClick={() => onChange({ ...model, section: id, query: "" })}
            >
              {label}
            </button>
          ))}
        </div>
        <Info label="How to copy values">
          Click a value to copy it. Show all properties reveals additional
          values and attributes.
        </Info>
      </div>
      {model.section !== "parts" && (
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label={
              model.section === "element"
                ? "Find element detail"
                : "Find CSS property"
            }
            placeholder={
              model.section === "element" ? "Find a detail" : "Find a property"
            }
            value={model.query}
            onChange={(e) => toggle("query", e.target.value)}
          />
        </label>
      )}
    </>
  );
  const n = (value) => Number.parseFloat(value) || 0;
  return (
    <section className="inspect-view">
      <div className="inspector-pinned">
        {controls}
        {note && (
          <p className="scan-note" role="status">
            {note}
          </p>
        )}
        {snapshot && !model.picking && (
          <div className="selection-paused" role="status">
            <strong>Selection paused</strong>
            <span>Use the page normally; this element stays selected.</span>
          </div>
        )}
        {snapshot && (
          <>
            <div
              className={
                GETTER_STUDIO_WORKSPACE_QA && onCollect
                  ? "element-title studio-inspect-selection"
                  : "element-title"
              }
            >
              <code title={snapshot.selector}>{snapshot.selector}</code>
              {GETTER_STUDIO_WORKSPACE_QA &&
                onCollect &&
                snapshot.hasParent && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={selectParent}
                  >
                    Select parent
                  </button>
                )}
            </div>
            {GETTER_STUDIO_WORKSPACE_QA && onCollect && (
              <div className="studio-inspect-save-actions">
                <button
                  type="button"
                  className="secondary studio-collection-button"
                  aria-label={pro ? "＋ Save to collection" : undefined}
                  onClick={() => collect("component")}
                >
                  {pro ? (
                    <span className="inspect-pro-label">
                      <InspectorIcon name="add" />
                      Save to collection
                    </span>
                  ) : (
                    "＋ Save to collection"
                  )}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => collect("individual")}
                >
                  Individual assets
                </button>
              </div>
            )}
            {snapshot.limited && (
              <p className="scan-note">Some long values were limited.</p>
            )}
            {snapshot.shadow && (
              <p className="scan-note">
                This element is inside a shadow root; its selector is relative
                to that root.
              </p>
            )}
            {!pro && model.section !== "code" && sectionControls}
          </>
        )}
      </div>
      {!snapshot ? (
        <div className="state">
          <h2>
            {status === "removed"
              ? "Element no longer available"
              : model.picking
                ? "Choose an element"
                : "Selection paused"}
          </h2>
          <p>
            {!model.picking
              ? "Resume selecting when you’re ready to inspect an element."
              : status === "removed"
                ? "Choose another element on the page."
                : "Click any element on the page to inspect it. Selection stays active until you pause."}
          </p>
        </div>
      ) : (
        <div className="inspect-results" aria-label="Inspect results">
          {pro && model.section !== "code" && (
            <>
              <InspectComponentPreview
                component={component}
                artwork={observedSelection?.preview}
                loading={
                  !partsReady ||
                  !observedSelection ||
                  observedSelection.status === "checking"
                }
              />
              {sectionControls}
            </>
          )}
          {model.section === "code" ? (
            <>
              <button
                className="text-button"
                onClick={() =>
                  toggle("section", model.previousSection || "styles")
                }
              >
                ← Back to {model.previousSection || "Styles"}
              </button>
              <div className="title-with-info">
                <h2>Copy CSS</h2>
                <Info label="About this CSS snippet">
                  Computed CSS from Styles, Layout, and Effects. Copy element
                  attributes separately. The surrounding layout and available
                  fonts may affect the result elsewhere.
                </Info>
              </div>
              <pre className="code-preview">{cssSnippet(snapshot)}</pre>
              <button
                className="primary snippet-copy"
                onClick={() => copy(cssSnippet(snapshot), "CSS snippet")}
              >
                Copy snippet
              </button>
            </>
          ) : model.section === "parts" && pro ? (
            component ? (
              <section aria-label="Component hierarchy">
                {component.limited && (
                  <p className="scan-note">
                    Large components may have additional parts. Select a smaller
                    section to inspect them.
                  </p>
                )}
                <ul className="inspect-pro-parts">
                  <ComponentParts
                    node={component.component}
                    selectedId={component.selected?.id}
                    onSelect={selectPart}
                  />
                </ul>
              </section>
            ) : (
              <p className="scan-note">
                Select a visible component on the page to see its parts.
              </p>
            )
          ) : (
            <>
              {pro &&
                model.section === "effects" &&
                !model.query &&
                component?.selected &&
                hasEffect && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => collect("effect")}
                  >
                    Save effect
                  </button>
                )}
              {GETTER_STUDIO_WORKSPACE_QA &&
                onCollect &&
                model.section === "effects" && (
                  <InspectMotion
                    key={`${scan.documentId}:${selectionId}`}
                    motion={matchesSelection(motion) ? motion.value : null}
                    observed={observedSelection}
                    snapshot={snapshot}
                    component={pro ? component?.selected : undefined}
                    playback={pro}
                    query={model.query}
                    onSave={collect}
                  />
                )}
              {model.section === "layout" && !model.query && (
                <>
                  <div className="dimension-summary">
                    {["width", "height"].map((key) => (
                      <button
                        key={key}
                        onClick={() => copy(String(snapshot.rect[key]), key)}
                      >
                        <span>Rendered {key}</span>
                        <strong>
                          {snapshot.rect[key]}
                          <small> px</small>
                        </strong>
                      </button>
                    ))}
                  </div>
                  <details className="box-disclosure">
                    <summary>
                      Box model <small>padding {snapshot.css.padding}</small>
                    </summary>
                    <div className="box-model-live">
                      <div className="box-margin">
                        <span>margin · {snapshot.css.margin}</span>
                        <div className="box-border">
                          <span>border · {snapshot.css["border-width"]}</span>
                          <div className="box-padding">
                            <span>padding · {snapshot.css.padding}</span>
                            <div className="box-core">
                              {Math.max(
                                0,
                                Math.round(
                                  snapshot.box.width -
                                    n(snapshot.css["padding-left"]) -
                                    n(snapshot.css["padding-right"]) -
                                    n(snapshot.css["border-left-width"]) -
                                    n(snapshot.css["border-right-width"]),
                                ),
                              )}{" "}
                              ×{" "}
                              {Math.max(
                                0,
                                Math.round(
                                  snapshot.box.height -
                                    n(snapshot.css["padding-top"]) -
                                    n(snapshot.css["padding-bottom"]) -
                                    n(snapshot.css["border-top-width"]) -
                                    n(snapshot.css["border-bottom-width"]),
                                ),
                              )}
                              <small>content · px</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </>
              )}
              {groups.map((g) => (
                <details
                  className="inspect-group"
                  key={`${model.section}:${g.name}:${!!model.query}:${model.all}`}
                  open={g.open}
                >
                  <summary>
                    {g.name}
                    <span>{g.rows.length}</span>
                  </summary>
                  <dl>{g.rows.map(valueRow)}</dl>
                </details>
              ))}
              {!groups.length && (
                <div className="state">
                  <h2>
                    {model.query
                      ? "No matching properties"
                      : model.section === "effects"
                        ? pro
                          ? "No additional CSS effects"
                          : "No effects applied"
                        : "No details available"}
                  </h2>
                  <p>
                    {model.query
                      ? "Try another search within this section."
                      : "No additional effects are applied to this element."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() =>
                      model.query ? toggle("query", "") : toggle("all", true)
                    }
                  >
                    {model.query ? "Clear search" : "Show default values"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

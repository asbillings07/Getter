import { snapshotElement } from "./core/inspect.js";
import {
  captureComponent,
  readActiveMotion,
  readMotion,
} from "./studio/inspect.js";
// Runs only after the user opens Inspect. Isolated-world state cannot be read by page scripts.
if (!globalThis.__getterInspector) {
  const state = {
    port: null,
    selected: null,
    picking: false,
    host: null,
    box: null,
    raf: 0,
    hovered: null,
    observer: null,
    studio: false,
    selectionId: 0,
  };
  const transitions = new WeakMap();
  const recorded = (element) => transitions.get(element) || [];
  function transition(event) {
    const node = event.target;
    if (!(node instanceof Element) || event.pseudoElement) return;
    const active = readActiveMotion(node).filter(
      ({ kind }) => kind === "transition",
    );
    if (active.length) transitions.set(node, active);
  }
  globalThis.__getterInspector = state;
  const send = (message) => {
    try {
      state.port?.postMessage(message);
    } catch {
      pause();
    }
  };
  const snapshot = (requestId) => {
    if (state.studio) return;
    const node = state.selected?.deref();
    if (!node?.isConnected) {
      if (state.selected || requestId) send({ type: "removed", requestId });
      state.selected = null;
      return;
    }
    try {
      const result = snapshotElement(node);
      if (GETTER_STUDIO_WORKSPACE_QA) {
        result.selectionId = state.selectionId;
        result.hasParent =
          !!node.parentElement &&
          !["body", "html"].includes(node.parentElement.localName);
      }
      send({ type: "snapshot", snapshot: result, requestId });
    } catch {
      send({
        type: "error",
        requestId,
        message: "This element could not be read. Choose another element.",
      });
    }
  };
  function pause() {
    state.picking = false;
    document.removeEventListener("pointerover", hover, true);
    if (GETTER_STUDIO_WORKSPACE_QA)
      document.removeEventListener("transitionrun", transition, true);
    window.removeEventListener("click", select, true);
    for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup"])
      window.removeEventListener(type, suppressPress, true);
    document.removeEventListener("keydown", key, true);
    window.removeEventListener("scroll", position, true);
    window.removeEventListener("resize", position);
    cancelAnimationFrame(state.raf);
    state.host?.remove();
    state.host = null;
    state.box = null;
    state.hovered = null;
  }
  function position() {
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => {
      const el = state.hovered;
      if (!state.box || !el?.isConnected) return;
      const r = el.getBoundingClientRect();
      Object.assign(state.box.style, {
        left: r.left + "px",
        top: r.top + "px",
        width: r.width + "px",
        height: r.height + "px",
        pointerEvents: ["iframe", "frame"].includes(el.localName)
          ? "auto"
          : "none",
      });
    });
  }
  const target = (event) =>
    event
      .composedPath()
      .find(
        (n) =>
          n instanceof Element &&
          n !== state.host &&
          !state.host?.shadowRoot?.contains(n),
      );
  function hover(event) {
    if (event.composedPath().includes(state.host)) return;
    state.hovered = target(event);
    position();
  }
  function suppressPress(event) {
    if (event.composedPath().includes(state.host) || !state.picking) return;
    // Stop page actions that run before click (including document capture handlers).
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function select(event) {
    if (event.composedPath().includes(state.host) || !state.picking) return;
    const element = target(event);
    if (!element) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (["iframe", "frame"].includes(element.localName)) {
      send({
        type: "unavailable",
        message:
          "Embedded page content is unavailable to Inspect. Choose an element on the main page.",
      });
      return;
    }
    if (GETTER_STUDIO_WORKSPACE_QA && state.studio) {
      pause();
      try {
        send({ type: "studio-capture", capture: captureComponent(element) });
      } catch {
        send({
          type: "error",
          message: "This element could not be captured. Pick another element.",
        });
      }
      return;
    }
    state.selected = new WeakRef(element);
    state.selectionId++;
    snapshot();
  }
  function key(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      pause();
      send({ type: "paused" });
    }
  }
  function start() {
    pause();
    state.picking = true;
    const host = document.createElement("getter-inspection-overlay");
    state.host = host;
    host.style.cssText =
      "all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent =
      ":host{all:initial}*{box-sizing:border-box}.box{position:fixed;border:2px solid #387bf0;border-radius:3px;background:#387bf00b;pointer-events:none}.banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);padding:10px 14px;background:#fff;color:#17253b;border:1px solid #cbd9f0;border-radius:9px;box-shadow:0 4px 20px #17253b22;font:13px/1.5 system-ui;pointer-events:auto}.banner button{font:inherit;color:#2059be;background:none;border:0;cursor:pointer;white-space:nowrap}.banner button:focus-visible{outline:2px solid #2059be}";
    const box = document.createElement("div");
    box.className = "box";
    state.box = box;
    box.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      send({
        type: "unavailable",
        message:
          "Embedded page content is unavailable to Inspect. Choose an element on the main page.",
      });
    };
    const banner = document.createElement("div");
    banner.className = "banner";
    const text = document.createElement("span");
    text.textContent = "Click any element to inspect · Esc to pause";
    const button = document.createElement("button");
    button.textContent = "Pause";
    button.onclick = () => {
      pause();
      send({ type: "paused" });
    };
    banner.append(text, button);
    shadow.append(style, box, banner);
    document.documentElement.append(host);
    document.addEventListener("pointerover", hover, true);
    if (GETTER_STUDIO_WORKSPACE_QA && !state.studio)
      document.addEventListener("transitionrun", transition, true);
    window.addEventListener("click", select, true);
    for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup"])
      window.addEventListener(type, suppressPress, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
  }
  chrome.runtime.onConnect.addListener((port) => {
    const studio =
      GETTER_STUDIO_WORKSPACE_QA && port.name === "getter-studio-inspect";
    if (
      (!studio && port.name !== "getter-inspect") ||
      port.sender?.id !== chrome.runtime.id
    )
      return;
    state.port?.disconnect();
    state.port = port;
    state.studio = studio;
    port.onMessage.addListener((message) => {
      if (port !== state.port) return;
      if (message.type === "start") start();
      if (message.type === "pause") {
        pause();
        send({ type: "paused" });
      }
      if (message.type === "refresh") snapshot(message.requestId);
      if (
        GETTER_STUDIO_WORKSPACE_QA &&
        ["collect-selection", "inspect-motion", "select-parent"].includes(
          message.type,
        )
      ) {
        const node = state.selected?.deref();
        try {
          if (!node?.isConnected || message.selectionId !== state.selectionId)
            throw Error();
          if (message.type === "select-parent") {
            const parent = node.parentElement;
            if (!parent || ["body", "html"].includes(parent.localName))
              throw Error();
            state.selected = new WeakRef(parent);
            state.selectionId++;
            snapshot(message.requestId);
          } else if (message.type === "inspect-motion") {
            send({
              type: "studio-motion",
              motion: readMotion(node, recorded(node)),
              requestId: message.requestId,
            });
          } else {
            send({
              type: "studio-capture",
              capture: captureComponent(node, {
                withAssets: true,
                transitions: recorded,
              }),
              requestId: message.requestId,
            });
          }
        } catch {
          send({
            type: "error",
            message: "The selection changed. Choose an element again.",
            requestId: message.requestId,
          });
        }
      }
    });
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      if (state.port === port) {
        pause();
        state.port = null;
        state.observer?.disconnect();
      }
    });
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => {
      const node = state.selected?.deref();
      if (state.selected && !node?.isConnected) {
        state.selected = null;
        send({ type: "removed" });
      }
    });
    state.observer.observe(document, { childList: true, subtree: true });
    send({ type: "connected" });
    snapshot();
  });
  window.addEventListener("pagehide", () => {
    pause();
    state.port?.disconnect();
    state.observer?.disconnect();
  });
}

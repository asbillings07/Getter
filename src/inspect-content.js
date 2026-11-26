import { snapshotElement } from "./core/inspect.js";
import {
  captureComponent,
  readActiveMotion,
  readMotion,
} from "./studio/inspect.js";
import { bindMotionSelection, sampleMotion } from "./studio/sample-motion.js";
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
    pro: false,
    selectionId: 0,
  };
  const transitions = new WeakMap();
  let sampler, observed, visualPreview, samplingStatus, motionSelection;
  let proRoot,
    proParts = [],
    partsRevision = 0;
  const selectionCursor = new CSSStyleSheet();
  selectionCursor.replaceSync(
    "@layer getter-inspection-cursor { :root, :root *, :host * { cursor: crosshair !important; } }",
  );
  let cursorShadow;
  let sampleId = 0;
  const widestFrame = (clip) =>
    Math.max(...clip.frames.map(({ width }) => (width / 100) * clip.width));
  const recorded = (element) => transitions.get(element) || [];
  const transition = GETTER_STUDIO_WORKSPACE_QA
    ? (event) => {
        const node = event.target;
        if (
          !(node instanceof Element) ||
          event.pseudoElement ||
          state.studio ||
          (!state.picking && node !== state.selected?.deref()) ||
          !state.port
        )
          return;
        const active = readActiveMotion(node).filter(
          ({ kind }) => kind === "transition",
        );
        if (!active.length) return;
        transitions.set(node, active);
        if (node === state.selected?.deref())
          send({
            type: "studio-native-motion",
            selectionId: state.selectionId,
            motion: readMotion(node, active),
          });
      }
    : null;
  globalThis.__getterInspector = state;
  const send = (message) => {
    try {
      state.port?.postMessage(message);
    } catch {
      pause();
      if (GETTER_STUDIO_WORKSPACE_QA) stopSampling();
    }
  };
  function stopSampling() {
    sampler?.abort();
    sampler = observed = visualPreview = samplingStatus = undefined;
  }
  const startSampling = GETTER_STUDIO_WORKSPACE_QA
    ? (element, refresh = false) => {
        sampler?.abort();
        if (!refresh) observed = undefined;
        const controller = new AbortController();
        const { port, selectionId } = state;
        const selection = motionSelection;
        sampler = controller;
        const publish = (result) => {
          if (
            controller.signal.aborted ||
            port !== state.port ||
            selectionId !== state.selectionId
          )
            return;
          // A scene can change at the same width. For individual artwork,
          // retain the existing clip until navigation reveals more of it.
          if (
            refresh &&
            (!result.asset?.clip ||
              (!selection.artwork.scene &&
                widestFrame(result.asset.clip) <
                  widestFrame(observed.clip) + 8))
          ) {
            samplingStatus = "ready";
            return;
          }
          samplingStatus = result.status;
          observed = result.asset;
          if (observed) sampleId++;
          send({
            type: "studio-sampled-motion",
            selectionId,
            sampleId,
            ...result,
            preview: visualPreview,
          });
        };
        if (refresh) samplingStatus = "checking";
        else publish({ status: "checking" });
        const preview =
          state.pro && !visualPreview
            ? (frame) => {
                visualPreview = frame;
                if (!refresh) publish({ status: "checking" });
              }
            : undefined;
        sampleMotion(element, controller.signal, selection, preview).then(
          publish,
          () => publish({ status: "unavailable" }),
        );
      }
    : null;
  const sampleOnInteraction = GETTER_STUDIO_WORKSPACE_QA
    ? (event) => {
        const artwork = motionSelection?.artwork;
        const navigation = event.type === "wheel" || event.type === "keydown";
        const refresh =
          navigation &&
          event.isTrusted &&
          !!artwork &&
          samplingStatus === "ready";
        if ((!refresh && samplingStatus !== "none") || state.studio) return;
        const node = state.selected?.deref();
        if (!node?.isConnected || !state.port || document.hidden) return;
        if (event.type === "keydown") {
          if (
            !artwork ||
            !event.isTrusted ||
            !["ArrowLeft", "ArrowRight"].includes(event.key)
          )
            return;
        } else if (event.type !== "wheel" && !node.contains(event.target))
          return;
        const rect = node.getBoundingClientRect();
        if (
          rect.bottom > 0 &&
          rect.top < innerHeight &&
          rect.right > 0 &&
          rect.left < innerWidth
        )
          startSampling(node, refresh);
      }
    : null;
  function setSelection(element, requestId, point, keepRoot = false) {
    if (GETTER_STUDIO_WORKSPACE_QA && state.pro && !keepRoot) {
      proRoot = new WeakRef(element);
      proParts = [];
    }
    state.selected = new WeakRef(element);
    state.selectionId++;
    if (GETTER_STUDIO_WORKSPACE_QA) visualPreview = undefined;
    snapshot(requestId);
    if (GETTER_STUDIO_WORKSPACE_QA) {
      motionSelection = bindMotionSelection(element, point);
      startSampling(element);
    }
  }
  const snapshot = (requestId) => {
    if (state.studio) return;
    const node = state.selected?.deref();
    if (!node?.isConnected) {
      if (state.selected || requestId) send({ type: "removed", requestId });
      state.selected = null;
      if (GETTER_STUDIO_WORKSPACE_QA) {
        motionSelection = undefined;
        stopSampling();
      }
      return;
    }
    // Keep the temporary picking cursor out of the page styles Getter copies.
    selectionCursor.disabled = true;
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
    } finally {
      selectionCursor.disabled = false;
    }
  };
  function restoreCursor(root) {
    root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
      (sheet) => sheet !== selectionCursor,
    );
  }
  function pause() {
    if (!state.picking) return;
    state.picking = false;
    restoreCursor(document);
    if (cursorShadow) restoreCursor(cursorShadow);
    cursorShadow = null;
    document.removeEventListener("pointerover", hover, true);
    document.removeEventListener("pointermove", hover, true);
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
    const element = target(event);
    if (element === state.hovered) return;
    const root = element?.getRootNode();
    const shadow = root instanceof ShadowRoot ? root : null;
    if (shadow !== cursorShadow) {
      if (cursorShadow) restoreCursor(cursorShadow);
      cursorShadow = shadow;
      cursorShadow?.adoptedStyleSheets.push(selectionCursor);
    }
    state.hovered = element;
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
    const point =
      GETTER_STUDIO_WORKSPACE_QA && event.isTrusted && event.detail > 0
        ? { x: event.clientX, y: event.clientY }
        : undefined;
    setSelection(element, undefined, point);
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
    if (state.picking) return;
    state.picking = true;
    document.adoptedStyleSheets.push(selectionCursor);
    const host = document.createElement("getter-inspection-overlay");
    state.host = host;
    host.style.cssText =
      "all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent =
      ":host{all:initial}*{box-sizing:border-box}.box{position:fixed;border:2px solid #387bf0;border-radius:3px;background:#387bf00b;pointer-events:none;cursor:crosshair}.banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);padding:10px 14px;background:#fff;color:#17253b;border:1px solid #cbd9f0;border-radius:9px;box-shadow:0 4px 20px #17253b22;font:13px/1.5 system-ui;pointer-events:auto;cursor:default}.banner button{font:inherit;color:#2059be;background:none;border:0;cursor:pointer;white-space:nowrap}.banner button:focus-visible{outline:2px solid #2059be}";
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
    document.addEventListener("pointermove", hover, true);
    window.addEventListener("click", select, true);
    for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup"])
      window.addEventListener(type, suppressPress, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
  }
  function previewImage(node) {
    if (!node.complete || !node.naturalWidth || !node.naturalHeight) return;
    const scale = Math.min(
      1,
      160 / Math.max(node.naturalWidth, node.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(node.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(node.naturalHeight * scale));
    try {
      canvas
        .getContext("2d")
        .drawImage(node, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/webp", 0.8);
      if (data.startsWith("data:image/webp;base64,"))
        return { data, alt: node.alt.slice(0, 100) };
    } catch {
      // The browser can block reading an image on the page. Use a placeholder.
    }
  }

  function previewBackground(root) {
    for (
      let node = root.parentElement, depth = 0;
      node && depth < 16;
      node = node.parentElement, depth++
    ) {
      const value = getComputedStyle(node).backgroundColor;
      if (value && value !== "transparent" && !/[,/]\s*0\)$/.test(value))
        return value;
    }
    const scheme = getComputedStyle(root).colorScheme;
    const dark =
      scheme === "dark" ||
      (scheme.includes("dark") &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    return dark ? "#121212" : "#ffffff";
  }

  chrome.runtime.onConnect.addListener((port) => {
    const studio =
      GETTER_STUDIO_WORKSPACE_QA && port.name === "getter-studio-inspect";
    const pro =
      GETTER_STUDIO_WORKSPACE_QA && port.name === "getter-inspect-pro";
    if (
      (!studio && !pro && port.name !== "getter-inspect") ||
      port.sender?.id !== chrome.runtime.id
    )
      return;
    state.port?.disconnect();
    if (GETTER_STUDIO_WORKSPACE_QA) {
      stopSampling();
      if (pro || pro !== state.pro) {
        pause();
        state.selected = null;
        state.selectionId++;
        motionSelection = proRoot = undefined;
        proParts = [];
      }
    }
    state.port = port;
    state.studio = studio;
    state.pro = pro;
    port.onMessage.addListener((message) => {
      if (port !== state.port) return;
      if (message.type === "start") start();
      if (message.type === "pause") pause();
      if (message.type === "refresh") snapshot(message.requestId);
      if (
        GETTER_STUDIO_WORKSPACE_QA &&
        (["collect-selection", "inspect-motion", "select-parent"].includes(
          message.type,
        ) ||
          (state.pro &&
            ["component-parts", "select-part"].includes(message.type)))
      ) {
        const node = state.selected?.deref();
        try {
          if (!node?.isConnected || message.selectionId !== state.selectionId)
            throw Error();
          if (message.type === "component-parts") {
            let root = proRoot?.deref();
            if (!root?.isConnected || !root.contains(node)) {
              root = node;
              proRoot = new WeakRef(root);
            }
            const refs = [];
            const images = [];
            let selected;
            const result = captureComponent(root, {
              withAssets: true,
              preview: true,
              onNode(element, part) {
                part.id = refs.length;
                refs.push(new WeakRef(element));
                if (element === node) selected = part;
                if (element.localName === "img" && images.length < 4)
                  images.push({ element, part });
              },
            });
            for (const { element, part } of images)
              part.thumbnail = previewImage(element);
            proParts = refs;
            send({
              type: "studio-component-parts",
              parts: {
                ...result,
                selected,
                background: previewBackground(root),
                selectionId: state.selectionId,
                revision: ++partsRevision,
              },
              requestId: message.requestId,
            });
          } else if (message.type === "select-part") {
            const part =
              Number.isInteger(message.partId) &&
              message.revision === partsRevision &&
              proParts[message.partId]?.deref();
            if (!part?.isConnected || !proRoot?.deref()?.contains(part))
              throw Error();
            setSelection(part, message.requestId, undefined, true);
            state.hovered = part;
            position();
          } else if (message.type === "select-parent") {
            const parent = node.parentElement;
            if (!parent || ["body", "html"].includes(parent.localName))
              throw Error();
            setSelection(parent, message.requestId);
          } else if (message.type === "inspect-motion") {
            send({
              type: "studio-motion",
              motion: readMotion(node, recorded(node)),
              requestId: message.requestId,
            });
          } else {
            const motionOnly = ["visual", "scripted"].includes(message.scope);
            if (
              motionOnly &&
              (observed?.kind !== message.scope ||
                message.sampleId !== sampleId)
            )
              throw Error();
            send({
              type: "studio-capture",
              capture: motionOnly
                ? {
                    observedMotion: observed,
                    viewport: { width: innerWidth, height: innerHeight },
                  }
                : {
                    ...captureComponent(node, {
                      withAssets: true,
                      transitions: recorded,
                    }),
                    observedMotion: observed,
                  },
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
        if (GETTER_STUDIO_WORKSPACE_QA) stopSampling();
        state.port = null;
        state.observer?.disconnect();
      }
    });
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => {
      const node = state.selected?.deref();
      if (state.selected && !node?.isConnected) {
        state.selected = null;
        if (GETTER_STUDIO_WORKSPACE_QA) {
          motionSelection = undefined;
          stopSampling();
        }
        send({ type: "removed" });
      }
    });
    state.observer.observe(document, { childList: true, subtree: true });
    send({ type: "connected" });
    snapshot();
    if (GETTER_STUDIO_WORKSPACE_QA && !studio) {
      const node = state.selected?.deref();
      if (node?.isConnected) startSampling(node);
    }
  });
  if (GETTER_STUDIO_WORKSPACE_QA) {
    document.addEventListener("transitionrun", transition, true);
    for (const type of ["pointerover", "wheel", "play", "keydown"])
      document.addEventListener(type, sampleOnInteraction, {
        capture: true,
        passive: true,
      });
  }
  window.addEventListener("pagehide", () => {
    pause();
    if (GETTER_STUDIO_WORKSPACE_QA) stopSampling();
    state.port?.disconnect();
    state.observer?.disconnect();
  });
}

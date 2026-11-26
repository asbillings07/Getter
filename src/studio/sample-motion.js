import { readActiveMotion, safeStyleValue } from "./inspect.js";

const duration = 2000;
const interval = 160;
const maxSide = 256;
const maxEncodedBytes = 512 * 1024;
const maxNearbyCanvases = 12;
const artworkLeftView = Symbol("artwork left view");

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

function containsRect(outer, inner) {
  return (
    outer.left <= inner.left &&
    outer.top <= inner.top &&
    outer.right >= inner.right &&
    outer.bottom >= inner.bottom
  );
}

function intersection(first, second) {
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const width = Math.min(first.x + first.width, second.x + second.width) - x;
  const height = Math.min(first.y + first.height, second.y + second.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

function clippingAxes(css) {
  const paint = /(?:^| )(?:paint|strict|content)(?: |$)/.test(css.contain);
  return [
    paint || css.overflowX !== "visible",
    paint || css.overflowY !== "visible",
  ];
}

function rotatedCanvasFrame(ancestors, box, win) {
  const { css: canvasStyle } = ancestors[0];
  const width = parseFloat(canvasStyle.width);
  const height = parseFloat(canvasStyle.height);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    canvasStyle.objectFit !== "fill" ||
    ["Top", "Right", "Bottom", "Left"].some(
      (side) =>
        parseFloat(canvasStyle["padding" + side]) ||
        parseFloat(canvasStyle["border" + side + "Width"]),
    ) ||
    hasRoundedCorners(canvasStyle)
  )
    return null;

  let matrix = new win.DOMMatrixReadOnly();
  let left = Math.max(0, box.left);
  let top = Math.max(0, box.top);
  let right = Math.min(win.innerWidth, box.right);
  let bottom = Math.min(win.innerHeight, box.bottom);
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const { el, css } = ancestors[index];
    if (css.display === "contents") continue;
    if (
      css.perspective !== "none" ||
      css.offsetPath !== "none" ||
      css.rotate !== "none" ||
      css.scale !== "none" ||
      css.zoom !== "1"
    )
      return null;
    if (css.transform !== "none") {
      const current = new win.DOMMatrixReadOnly(css.transform);
      const { a, b, c, d } = current;
      const columnScale = Math.hypot(a, b) * Math.hypot(c, d);
      if (
        !current.is2D ||
        !(a > 0 && d > 0 && a * d - b * c > 0) ||
        Math.abs(a * c + b * d) > 0.0001 * columnScale
      )
        return null;
      matrix = matrix.multiply(current);
    }

    const [clipX, clipY] = clippingAxes(css);
    if (!index || (!clipX && !clipY)) continue;
    if (
      !["visible", "hidden", "clip"].includes(css.overflowX) ||
      !["visible", "hidden", "clip"].includes(css.overflowY) ||
      matrix.b ||
      matrix.c ||
      el.getClientRects().length !== 1
    )
      return null;
    const box = el.getBoundingClientRect();
    const clip = {
      left: box.left + parseFloat(css.borderLeftWidth) * matrix.a,
      top: box.top + parseFloat(css.borderTopWidth) * matrix.d,
      right: box.right - parseFloat(css.borderRightWidth) * matrix.a,
      bottom: box.bottom - parseFloat(css.borderBottomWidth) * matrix.d,
    };
    if (clipX) {
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
    }
    if (clipY) {
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
    if (clipX && clipY && hasRoundedCorners(css)) {
      const [radiusX, radiusY] = maximumCornerRadii(
        css,
        box,
        matrix.a,
        matrix.d,
      );
      // No circular clipping is needed when the full crop stays between corners.
      const betweenSides =
        left >= clip.left + radiusX && right <= clip.right - radiusX;
      const betweenEnds =
        top >= clip.top + radiusY && bottom <= clip.bottom - radiusY;
      if (!betweenSides && !betweenEnds) return null;
    }
  }

  const { a, b, c, d } = matrix;
  const mappedWidth = Math.abs(a * width) + Math.abs(c * height);
  const mappedHeight = Math.abs(b * width) + Math.abs(d * height);
  if (
    (!b && !c) ||
    !(right > left && bottom > top) ||
    Math.abs(mappedWidth - box.width) > 0.125 ||
    Math.abs(mappedHeight - box.height) > 0.125
  )
    return null;
  // The measured bounding box fixes the translation for all transform origins.
  const originX = box.left - Math.min(0, a * width) - Math.min(0, c * height);
  const originY = box.top - Math.min(0, b * width) - Math.min(0, d * height);
  return {
    rect: {
      x: left + win.scrollX,
      y: top + win.scrollY,
      width: right - left,
      height: bottom - top,
    },
    projection: {
      matrix: [a, b, c, d, originX - left, originY - top],
      width,
      height,
    },
  };
}

const corners = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"];

function hasRoundedCorners(css) {
  return corners.some((corner) => css["border" + corner + "Radius"] !== "0px");
}

function maximumCornerRadii(css, box, scaleX, scaleY) {
  const radius = (value, size, scale) => {
    if (!/^\d*\.?\d+(?:px|%)$/.test(value)) return Infinity;
    return parseFloat(value) * (value.endsWith("%") ? size / 100 : scale);
  };
  let maxX = 0;
  let maxY = 0;
  for (const corner of corners) {
    const [x, y = x] = css["border" + corner + "Radius"].split(" ");
    maxX = Math.max(maxX, radius(x, box.width, scaleX));
    maxY = Math.max(maxY, radius(y, box.height, scaleY));
  }
  return [maxX, maxY];
}

function mediaFrame(node, win, allowZeroInset = false) {
  if (
    !node.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
      contentVisibilityAuto: true,
    })
  )
    return null;
  const style = win.getComputedStyle(node);
  const box = node.getBoundingClientRect();
  const pad = (side) => parseFloat(style[side]) || 0;
  const width = node.clientWidth - pad("paddingLeft") - pad("paddingRight");
  const height = node.clientHeight - pad("paddingTop") - pad("paddingBottom");
  const pixelsWide = node.videoWidth ?? node.width;
  const pixelsHigh = node.videoHeight ?? node.height;
  if (
    width <= 0 ||
    height <= 0 ||
    !pixelsWide ||
    !pixelsHigh ||
    !box.width ||
    !box.height
  )
    return null;

  const sx = box.width / node.offsetWidth;
  const sy = box.height / node.offsetHeight;
  const contentLeft = box.left + (node.clientLeft + pad("paddingLeft")) * sx;
  const contentTop = box.top + (node.clientTop + pad("paddingTop")) * sy;
  let drawnWidth = width;
  let drawnHeight = height;
  if (style.objectFit !== "fill") {
    const contain = Math.min(width / pixelsWide, height / pixelsHigh);
    const ratio =
      style.objectFit === "cover"
        ? Math.max(width / pixelsWide, height / pixelsHigh)
        : style.objectFit === "none"
          ? 1
          : style.objectFit === "scale-down"
            ? Math.min(1, contain)
            : contain;
    drawnWidth = pixelsWide * ratio;
    drawnHeight = pixelsHigh * ratio;
  }
  const position = style.objectPosition.split(/\s+/);
  function offset(axis, gap) {
    const value = position[axis];
    if (/^-?[\d.]+px$/.test(value)) return parseFloat(value);
    if (/^-?[\d.]+%$/.test(value)) return (parseFloat(value) * gap) / 100;
    return NaN;
  }
  const left = contentLeft + offset(0, width - drawnWidth) * sx;
  const top = contentTop + offset(1, height - drawnHeight) * sy;
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  let x = Math.max(0, contentLeft, left);
  let y = Math.max(0, contentTop, top);
  let right = Math.min(
    win.innerWidth,
    contentLeft + width * sx,
    left + drawnWidth * sx,
  );
  let bottom = Math.min(
    win.innerHeight,
    contentTop + height * sy,
    top + drawnHeight * sy,
  );

  let axisAligned = true;
  let sourceMappingSupported = true;
  let hasZeroInset = false;
  const ancestors = [];
  for (let el = node; el; el = el.parentElement || el.getRootNode().host) {
    const css = el === node ? style : win.getComputedStyle(el);
    const zeroInset =
      allowZeroInset &&
      node.localName === "canvas" &&
      css.clipPath === "inset(0px)";
    if (
      Number(css.opacity) <= 0.05 ||
      (css.clipPath !== "none" && !zeroInset) ||
      css.maskImage !== "none" ||
      (css.webkitMaskBoxImageSource &&
        css.webkitMaskBoxImageSource !== "none") ||
      css.clip !== "auto" ||
      css.filter !== "none"
    )
      return null;
    if (zeroInset) {
      // A plain inset uses the border box even when the inset is zero.
      if (
        el.getClientRects().length !== 1 ||
        !containsRect(el.getBoundingClientRect(), box)
      )
        return null;
      hasZeroInset = true;
    }
    if (css.display === "contents") continue;
    ancestors.push({ el, css });
    sourceMappingSupported &&= css.offsetPath === "none" && css.zoom === "1";
    if (axisAligned) {
      const matrix =
        css.transform === "none"
          ? null
          : new win.DOMMatrixReadOnly(css.transform);
      axisAligned =
        (!matrix ||
          (matrix.is2D &&
            matrix.a > 0 &&
            matrix.d > 0 &&
            !matrix.b &&
            !matrix.c)) &&
        (css.rotate === "none" ||
          parseFloat(css.rotate.split(" ").at(-1)) === 0) &&
        (css.scale === "none" ||
          css.scale.split(" ").every((value) => Number(value) > 0)) &&
        css.perspective === "none";
    }
    const [clipX, clipY] = el === node ? [true, true] : clippingAxes(css);
    if (!clipX && !clipY) continue;
    const clip = el.getBoundingClientRect();
    const scaleX = clip.width / el.offsetWidth;
    const scaleY = clip.height / el.offsetHeight;
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null;
    const clipLeft = clip.left + el.clientLeft * scaleX;
    const clipTop = clip.top + el.clientTop * scaleY;
    const clipRight = clipLeft + el.clientWidth * scaleX;
    const clipBottom = clipTop + el.clientHeight * scaleY;
    if (clipX) {
      x = Math.max(x, clipLeft);
      right = Math.min(right, clipRight);
    }
    if (clipY) {
      y = Math.max(y, clipTop);
      bottom = Math.min(bottom, clipBottom);
    }
    if (clipX && clipY) {
      const corners = [
        [css.borderTopLeftRadius, clipLeft, clipTop],
        [css.borderTopRightRadius, clipRight, clipTop],
        [css.borderBottomLeftRadius, clipLeft, clipBottom],
        [css.borderBottomRightRadius, clipRight, clipBottom],
      ];
      if (
        corners.some(([radius, cx, cy]) => {
          const [horizontal, vertical = horizontal] = radius.split(" ");
          const rx =
            (parseFloat(horizontal) || 0) *
            (horizontal.endsWith("%") ? clip.width / 100 : scaleX);
          const ry =
            (parseFloat(vertical) || 0) *
            (vertical.endsWith("%") ? clip.height / 100 : scaleY);
          return (
            rx &&
            ry &&
            Math.max(x - cx, cx - right, 0) < rx &&
            Math.max(y - cy, cy - bottom, 0) < ry
          );
        })
      )
        return null;
    }
  }
  const visibleWidth = right - x;
  const visibleHeight = bottom - y;
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;
  if (!axisAligned && node.localName === "canvas" && !hasZeroInset) {
    const frame = rotatedCanvasFrame(ancestors, box, win);
    if (frame) return frame;
  }
  if (
    !axisAligned &&
    (hasZeroInset ||
      drawnWidth * sx - visibleWidth > 0.5 ||
      drawnHeight * sy - visibleHeight > 0.5)
  )
    return null;
  return {
    axisAligned: axisAligned && sourceMappingSupported,
    rect: {
      x: x + win.scrollX,
      y: y + win.scrollY,
      width: visibleWidth,
      height: visibleHeight,
    },
    source: [
      ((x - left) / (drawnWidth * sx)) * pixelsWide,
      ((y - top) / (drawnHeight * sy)) * pixelsHigh,
      (visibleWidth / (drawnWidth * sx)) * pixelsWide,
      (visibleHeight / (drawnHeight * sy)) * pixelsHigh,
    ],
  };
}

function selectedMedia(root, win) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, win.NodeFilter.SHOW_ELEMENT);
  const candidates = [];
  for (let i = 0, node = root; node && i < 160; i++, node = walker.nextNode()) {
    const canvas = node.localName === "canvas" && node.width && node.height;
    const video =
      node.localName === "video" &&
      !node.paused &&
      node.videoWidth &&
      node.videoHeight;
    if (!canvas && !video) continue;
    const frame = mediaFrame(node, win, node === root);
    if (!frame) continue;
    if (node === root) return [node];
    candidates.push({ node, area: frame.rect.width * frame.rect.height });
  }
  return candidates
    .sort((first, second) => second.area - first.area)
    .slice(0, 2)
    .map(({ node }) => node);
}

function canvasAtSelectionPoint(root, win, point) {
  if (!point || ["html", "body"].includes(root.localName)) return null;
  const canvases = root.getElementsByTagName("canvas");
  if (!canvases.length || canvases.length > maxNearbyCanvases) return null;
  let match;
  for (const canvas of canvases) {
    if (
      !canvas.width ||
      !canvas.height ||
      !canvas.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
      })
    )
      continue;
    const rect = canvas.getBoundingClientRect();
    if (
      point.x < rect.left ||
      point.x >= rect.right ||
      point.y < rect.top ||
      point.y >= rect.bottom
    )
      continue;
    if (match) return null;
    match = canvas;
  }
  const frame = match && canvasFrameWithinSelection(root, match, win);
  if (!frame) return null;
  const { x, y, width, height } = frame.rect;
  const pageX = point.x + win.scrollX;
  const pageY = point.y + win.scrollY;
  return pageX >= x && pageX < x + width && pageY >= y && pageY < y + height
    ? match
    : null;
}

function canvasFrameWithinSelection(root, canvas, win) {
  if (
    !root.contains(canvas) ||
    win.getComputedStyle(canvas).pointerEvents !== "none" ||
    !containsRect(root.getBoundingClientRect(), canvas.getBoundingClientRect())
  )
    return null;
  return mediaFrame(canvas, win, true);
}

function visibleHitTarget(root) {
  return root.checkVisibility({
    opacityProperty: true,
    visibilityProperty: true,
  });
}

function transparentHitTarget(root, scope, win) {
  if (
    root.localName !== "div" ||
    root.childNodes.length > 12 ||
    [...root.childNodes].some(
      (child) =>
        (child.nodeType === win.Node.TEXT_NODE && child.textContent.trim()) ||
        (child.nodeType === win.Node.ELEMENT_NODE &&
          win.getComputedStyle(child).display !== "none"),
    ) ||
    !visibleHitTarget(root)
  )
    return false;
  const hitStyle = win.getComputedStyle(root);
  if (!["absolute", "fixed"].includes(hitStyle.position)) return false;
  for (let el = root; el && el !== scope; el = el.parentElement) {
    const css = el === root ? hitStyle : win.getComputedStyle(el);
    const transform = new win.DOMMatrixReadOnly(
      css.transform === "none" ? undefined : css.transform,
    );
    if (
      css.backgroundColor !== "rgba(0, 0, 0, 0)" ||
      css.backgroundImage !== "none" ||
      css.boxShadow !== "none" ||
      css.clipPath !== "none" ||
      css.clip !== "auto" ||
      css.filter !== "none" ||
      css.backdropFilter !== "none" ||
      css.maskImage !== "none" ||
      (css.webkitMaskBoxImageSource &&
        css.webkitMaskBoxImageSource !== "none") ||
      css.rotate !== "none" ||
      css.scale !== "none" ||
      css.perspective !== "none" ||
      css.offsetPath !== "none" ||
      css.zoom !== "1" ||
      hasRoundedCorners(css) ||
      (el !== root && clippingAxes(css).some(Boolean)) ||
      !transform.is2D ||
      transform.b ||
      transform.c ||
      transform.a <= 0 ||
      transform.d <= 0 ||
      ["Top", "Right", "Bottom", "Left"].some((side) =>
        parseFloat(css["border" + side + "Width"]),
      ) ||
      ["::before", "::after"].some(
        (pseudo) =>
          !["none", "normal"].includes(
            win.getComputedStyle(el, pseudo).content,
          ),
      )
    )
      return false;
  }
  return true;
}

function clipMediaToHit(frame, hit) {
  if (!frame?.axisAligned) return null;
  const rect = intersection(frame.rect, hit);
  if (!rect) return null;
  const [left, top, width, height] = frame.source;
  const scaleX = width / frame.rect.width;
  const scaleY = height / frame.rect.height;
  return {
    rect,
    source: [
      left + (rect.x - frame.rect.x) * scaleX,
      top + (rect.y - frame.rect.y) * scaleY,
      rect.width * scaleX,
      rect.height * scaleY,
    ],
  };
}

function hitCrop(media, hit) {
  if (
    !media ||
    hit.width >= media.rect.width ||
    hit.height >= media.rect.height
  )
    return null;
  return clipMediaToHit(media, hit);
}

function sceneTargets(
  root,
  scope,
  media,
  scene,
  win,
  requireInteractive = true,
) {
  const members = [];
  const siblings = root.parentElement.children;
  for (let i = 0; i < Math.min(siblings.length, 48); i++) {
    const sibling = siblings[i];
    if (sibling === root) continue;
    const rect = hitCrop(media, geometry(sibling, win))?.rect;
    const overlap = rect && intersection(scene, rect);
    if (
      !overlap ||
      overlap.width < rect.width * 0.9 ||
      overlap.height < rect.height * 0.9 ||
      overlap.height < scene.height * (2 / 3) ||
      (requireInteractive &&
        win.getComputedStyle(sibling).pointerEvents === "none") ||
      !transparentHitTarget(sibling, scope, win)
    )
      continue;
    // Separate artwork targets distinguish a scene from stacked click layers
    // for the same item. Adjacent rotated objects can overlap at their edges.
    if (
      members.some(
        (member) =>
          Math.max(
            0,
            Math.min(member.x + member.width, rect.x + rect.width) -
              Math.max(member.x, rect.x),
          ) <
          Math.min(member.width, rect.width) / 2,
      )
    )
      return 2;
    members.push(rect);
  }
  return members.length ? 1 : 0;
}

function clickedCanvasPixel(node, crop, x, y) {
  const probe = node.ownerDocument.createElement("canvas");
  probe.width = probe.height = 1;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  const [left, top, width, height] = crop.source;
  ctx.drawImage(
    node,
    Math.floor(left + (x * width) / crop.rect.width),
    Math.floor(top + (y * height) / crop.rect.height),
    1,
    1,
    0,
    0,
    1,
    1,
  );
  return ctx.getImageData(0, 0, 1, 1).data[3] > 32;
}

function bindArtworkSelection(root, point) {
  if (!point || root.localName !== "div") return null;
  const win = root.ownerDocument.defaultView;
  const selectArtwork = { status: "select-artwork" };
  let scope = root.parentElement;
  for (
    let depth = 0;
    depth < 2 && scope;
    depth++, scope = scope.parentElement
  ) {
    if (["html", "body"].includes(scope.localName)) return null;
    const canvases = scope.getElementsByTagName("canvas");
    if (!canvases.length) continue;
    if (canvases.length !== 1 || !transparentHitTarget(root, scope, win))
      return null;
    const node = canvases[0];
    if (
      root.contains(node) ||
      win.getComputedStyle(node).pointerEvents !== "none"
    )
      return null;
    const media = mediaFrame(node, win, true);
    if (!media?.axisAligned) return null;
    const bounds = geometry(root, win);
    const artwork = hitCrop(media, bounds);
    const scene = !artwork;
    const crop = artwork || clipMediaToHit(media, bounds);
    if (!crop) return null;
    const x = point.x + win.scrollX - crop.rect.x;
    const y = point.y + win.scrollY - crop.rect.y;
    if (x < 0 || y < 0 || x >= crop.rect.width || y >= crop.rect.height)
      return null;
    if (scene) {
      const targets = sceneTargets(root, scope, media, crop.rect, win);
      if (targets < 2) return targets ? selectArtwork : null;
    } else {
      try {
        if (!clickedCanvasPixel(node, crop, x, y)) return selectArtwork;
      } catch {
        return { status: "unavailable" };
      }
    }
    const hitParent = root.parentElement;
    const canvasParent = node.parentElement;
    const matchedScope = scope;
    const firstBox = node.getBoundingClientRect();
    const initialScroll = [win.scrollX, win.scrollY];
    return {
      node,
      scene,
      frame() {
        if (
          root.parentElement !== hitParent ||
          node.parentElement !== canvasParent ||
          !matchedScope.contains(root) ||
          !matchedScope.contains(node) ||
          win.getComputedStyle(node).pointerEvents !== "none" ||
          matchedScope.getElementsByTagName("canvas").length !== 1
        )
          return null;
        if (!transparentHitTarget(root, matchedScope, win))
          return !scene && !visibleHitTarget(root) ? artworkLeftView : null;
        if (
          win.scrollX !== initialScroll[0] ||
          win.scrollY !== initialScroll[1]
        ) {
          const box = node.getBoundingClientRect();
          // Navigation can turn artwork on a fixed canvas while the document
          // scrolls. A canvas displaced by scroll no longer maps to that scene.
          if (
            ["x", "y", "width", "height"].some(
              (key) => Math.abs(box[key] - firstBox[key]) > 0.5,
            )
          )
            return null;
        }
        // Keep the original canvas and use only the selected layer's current
        // visible bounds, including when a book widens or the shelf moves.
        const media = mediaFrame(node, win, true);
        const hit = geometry(root, win);
        const crop = scene ? clipMediaToHit(media, hit) : hitCrop(media, hit);
        // The selected book can leave a fixed canvas while the page scrolls.
        // Finish at the last verified frame without sampling the next item.
        if (
          !scene &&
          !crop &&
          media?.axisAligned &&
          !intersection(media.rect, hit)
        )
          return artworkLeftView;
        // Some pages reuse a shelf layer across states. Keep later samples
        // within the original scene's scale and recheck the visible regions.
        // Input can be disabled while the artwork itself is still turning.
        if (
          scene &&
          (!crop ||
            hit.height > bounds.height * 1.25 ||
            hit.width > bounds.width * 1.25 ||
            sceneTargets(root, matchedScope, media, crop.rect, win, false) < 2)
        )
          return null;
        if (crop) {
          crop.rect.x -= win.scrollX;
          crop.rect.y -= win.scrollY;
        }
        return crop;
      },
    };
  }
  return null;
}

export function bindMotionSelection(root, point) {
  const artwork = bindArtworkSelection(root, point);
  if (artwork) return { artwork };
  if (!point) return;
  const win = root.ownerDocument.defaultView;
  const canvas = canvasAtSelectionPoint(root, win, point);
  // Keep a fallback match across retries without reusing the click coordinates.
  if (canvas && !selectedMedia(root, win).length)
    return { canvas: new WeakRef(canvas) };
}

function geometry(node, win) {
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left + win.scrollX,
    y: rect.top + win.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

function moved(samples) {
  return samples.some(
    ({ rect }, index) =>
      index > 0 &&
      ["x", "y", "width", "height"].some(
        (key) => Math.abs(rect[key] - samples[0].rect[key]) > 0.25,
      ),
  );
}

function clipAsset(samples, sources, name, useGeometry) {
  if (!useGeometry)
    samples = samples.map((sample) => ({ ...sample, rect: samples[0].rect }));
  const left = Math.min(...samples.map(({ rect }) => rect.x));
  const top = Math.min(...samples.map(({ rect }) => rect.y));
  const width =
    Math.max(...samples.map(({ rect }) => rect.x + rect.width)) - left;
  const height =
    Math.max(...samples.map(({ rect }) => rect.y + rect.height)) - top;
  return {
    type: "motion",
    kind: "visual",
    name,
    css: {},
    animations: [],
    clip: {
      duration: samples.at(-1).at,
      width,
      height,
      sources,
      frames: samples.map(({ at, rect, image }) => ({
        at,
        image,
        left: ((rect.x - left) / width) * 100,
        top: ((rect.y - top) / height) * 100,
        width: (rect.width / width) * 100,
        height: (rect.height / height) * 100,
      })),
    },
  };
}

const sampledProperties = [
  "transform",
  "translate",
  "scale",
  "rotate",
  "opacity",
  "backgroundColor",
  "color",
  "filter",
  "clipPath",
  "borderRadius",
];

function scriptedAsset(samples, useGeometry, nativeProperties) {
  if (samples.length < 2) return null;
  const first = samples[0];
  const changed = sampledProperties.filter(
    (key) =>
      !nativeProperties.has(key) &&
      samples.every(({ style }) => safeStyleValue(style[key])) &&
      samples.some(({ style }) => style[key] !== first.style[key]),
  );
  const move =
    useGeometry &&
    !["transform", "translate", "scale", "rotate"].some(
      (key) => nativeProperties.has(key) || changed.includes(key),
    ) &&
    samples.some(
      ({ rect }) =>
        Math.abs(rect.x - first.rect.x) > 0.25 ||
        Math.abs(rect.y - first.rect.y) > 0.25,
    );
  if (!move && !changed.length) return null;
  return {
    type: "motion",
    kind: "scripted",
    name: "Scripted motion",
    css: {},
    animations: [
      {
        keyframes: samples.map(({ style, rect, at }) => ({
          offset: at / duration,
          easing: "linear",
          ...Object.fromEntries(changed.map((key) => [key, style[key]])),
          ...(move
            ? {
                translate: `${(rect.x - first.rect.x).toFixed(2)}px ${(rect.y - first.rect.y).toFixed(2)}px`,
              }
            : {}),
        })),
        duration,
        easing: "linear",
        delay: 0,
        direction: "normal",
        iterations: 1,
        fill: "none",
      },
    ],
  };
}

function mediaObserver(node, readFrame, onPreview) {
  const buffer = node.ownerDocument.createElement("canvas");
  const ctx = buffer.getContext("2d", { willReadFrequently: true });
  const sources = [];
  const samples = [];
  let failed = !ctx;
  let ended = false;
  let hasPixels = false;
  let bytes = 0;
  let firstCrop;
  let cropMoved = false;
  let projected = false;

  function sample(at) {
    if (failed || ended) return;
    const frame = readFrame();
    if (frame === artworkLeftView) {
      ended = true;
      return;
    }
    if (!frame) {
      failed = true;
      return;
    }
    const { rect, source, projection } = frame;
    projected ||= !!projection;
    if (source) {
      firstCrop ??= source;
      cropMoved ||= source.some(
        (value, i) => Math.abs(value - firstCrop[i]) > 0.25,
      );
    }
    const width = source ? source[2] : rect.width;
    const height = source ? source[3] : rect.height;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    buffer.width = Math.max(1, Math.round(width * scale));
    buffer.height = Math.max(1, Math.round(height * scale));
    try {
      if (projection) {
        const [a, b, c, d, e, f] = projection.matrix;
        const scaleX = buffer.width / rect.width;
        const scaleY = buffer.height / rect.height;
        ctx.setTransform(
          a * scaleX,
          b * scaleY,
          c * scaleX,
          d * scaleY,
          e * scaleX,
          f * scaleY,
        );
        ctx.drawImage(node, 0, 0, projection.width, projection.height);
      } else {
        ctx.drawImage(node, ...source, 0, 0, buffer.width, buffer.height);
      }
      const firstPaint = !hasPixels;
      if (firstPaint) {
        const pixels = ctx.getImageData(0, 0, buffer.width, buffer.height).data;
        hasPixels = pixels.some((value, i) => i % 4 === 3 && value > 0);
      }
      const data = buffer.toDataURL("image/webp", 0.75);
      if (!data.startsWith("data:image/webp;base64,")) {
        failed = true;
        return;
      }
      let image = sources.indexOf(data);
      if (image < 0) {
        bytes += data.length;
        if (bytes > maxEncodedBytes) {
          failed = true;
          return;
        }
        image = sources.push(data) - 1;
      }
      samples.push({ at, rect, image });
      if (firstPaint && hasPixels)
        onPreview?.({ src: data, width: rect.width, height: rect.height });
    } catch {
      failed = true;
    }
  }
  return {
    sample,
    get unavailable() {
      return failed || !hasPixels || (ended && samples.length < 2);
    },
    get ended() {
      return ended;
    },
    asset(useGeometry) {
      if (
        this.unavailable ||
        ((cropMoved || projected) && !useGeometry) ||
        (sources.length === 1 && !(useGeometry && moved(samples)))
      )
        return null;
      const name =
        node.localName === "video" ? "Video motion" : "Canvas motion";
      return clipAsset(samples, sources, name, useGeometry);
    },
  };
}

export async function sampleMotion(
  root,
  signal,
  { artwork, canvas } = {},
  onPreview,
) {
  if (artwork?.status) return { status: artwork.status };
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const nearbyCanvas = canvas?.deref();
  if (canvas && !nearbyCanvas) return { status: "unavailable" };
  const preview = (frame) =>
    onPreview?.({
      ...frame,
      kind: artwork ? (artwork.scene ? "scene" : "artwork") : "media",
    });
  const media = artwork
    ? [mediaObserver(artwork.node, artwork.frame, preview)]
    : nearbyCanvas
      ? [
          mediaObserver(
            nearbyCanvas,
            () => canvasFrameWithinSelection(root, nearbyCanvas, win),
            preview,
          ),
        ]
      : selectedMedia(root, win).map((node) =>
          mediaObserver(
            node,
            () =>
              root.contains(node) ? mediaFrame(node, win, node === root) : null,
            node === root ? preview : undefined,
          ),
        );
  const bounds = new AbortController();
  let useGeometry = true;
  const viewportChanged = (event) => {
    if (artwork && event.type === "scroll" && event.target === doc) return;
    useGeometry = false;
  };
  win.addEventListener("scroll", viewportChanged, {
    capture: true,
    passive: true,
    signal: bounds.signal,
  });
  win.addEventListener("resize", viewportChanged, { signal: bounds.signal });
  try {
    const samples = [];
    const nativeProperties = new Set();
    const start = win.performance.now();
    for (let at = 0; at <= duration; at = Math.min(at + interval, duration)) {
      signal.throwIfAborted();
      if (!root.isConnected || doc.hidden) return { status: "none" };
      for (const observer of media) observer.sample(at);
      if (artwork && media[0].ended) break;
      if (!artwork) {
        const rect = geometry(root, win);
        const css = win.getComputedStyle(root);
        for (const { keyframes } of readActiveMotion(root))
          for (const frame of keyframes)
            for (const key of Object.keys(frame)) nativeProperties.add(key);
        samples.push({
          at,
          rect,
          style: Object.fromEntries(
            sampledProperties.map((key) => [key, css[key]]),
          ),
        });
      }
      if (at === duration) break;
      const next = Math.min(at + interval, duration);
      await wait(Math.max(0, start + next - win.performance.now()), signal);
    }
    for (const observer of media) {
      const asset = observer.asset(useGeometry);
      if (!asset) continue;
      if (artwork?.scene) {
        if (asset.clip.sources.length < 2) continue;
        asset.name = "Entire scene motion";
        asset.clip.scope = "scene";
      }
      return {
        status: "ready",
        asset,
        canvasWithinSelection: !!nearbyCanvas,
        selectedArtwork:
          (!!artwork && !artwork.scene) || root.localName === "canvas",
      };
    }
    // Replaying the movement of an invisible overlay shows the click target
    // instead of the artwork and would save the wrong item.
    if (artwork)
      return { status: media[0].unavailable ? "unavailable" : "none" };
    const asset = scriptedAsset(samples, useGeometry, nativeProperties);
    if (asset) return { status: "ready", asset };
    return {
      status:
        (!media.length &&
          (root.localName === "canvas" ||
            (root.localName === "video" && !root.paused))) ||
        media.some((observer) => observer.unavailable)
          ? "unavailable"
          : "none",
    };
  } finally {
    bounds.abort();
  }
}

// This function is serialized by Chrome. Keep it self-contained and read-only.
export function extractPage({ maxNodes = 8000, maxMs = 200, maxItems = 500 } = {}) {
  const start = performance.now();
  const colors = new Map(), fonts = new Map(), images = new Map();
  const fontTags = new Set(['h1','h2','h3','h4','h5','h6','header','nav','body','section','article','aside','main','p','button']);
  let visited = 0, limited = false, frames = 0;
  const iterator = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
  const addColor = (value, kind) => {
    if (!value || value === 'transparent' || /^rgba\(.*[, /]0\s*\)$/.test(value)) return;
    if (!colors.has(value)) {
      if (colors.size >= maxItems) { limited = true; return; }
      colors.set(value, { value, count: 0, kinds: [] });
    }
    const item = colors.get(value); item.count++;
    if (!item.kinds.includes(kind)) item.kinds.push(kind);
  };
  let node = iterator.currentNode;
  while (node) {
    if (visited >= maxNodes || performance.now() - start >= maxMs) { limited = true; break; }
    visited++;
    if (node.localName === 'iframe' || node.localName === 'frame') frames++;
    const style = getComputedStyle(node);
    if (style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length) {
      addColor(style.color, 'Text'); addColor(style.backgroundColor, 'Background');
      if (fontTags.has(node.localName)) {
        const item = { tag: node.localName, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, lineHeight: style.lineHeight };
        const key = JSON.stringify(item);
        if (fonts.has(key)) fonts.get(key).count++;
        else if (fonts.size < maxItems) fonts.set(key, { ...item, count: 1 });
        else limited = true;
      }
      if (node.localName === 'img') {
        const src = node.currentSrc || node.src;
        if (/^https?:\/\//i.test(src) && !images.has(src)) {
          if (images.size < maxItems) images.set(src, { src, name: (node.alt || '').slice(0,160), width: node.naturalWidth || 0, height: node.naturalHeight || 0 });
          else limited = true;
        }
      }
    }
    node = iterator.nextNode();
  }
  return { colors: [...colors.values()], fonts: [...fonts.values()], images: [...images.values()], limited, visited, frames };
}
export function colorLabel(value) {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value);
  if (!match) return value; // Preserve modern CSS colors instead of inventing a conversion.
  const channels = match.slice(1,4).map(n => Math.max(0,Math.min(255,Math.round(Number(n)))));
  if (match[4] !== undefined && Number(match[4]) < 1) channels.push(Math.round(Math.max(0,Number(match[4])) * 255));
  return '#' + channels.map(n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function aggregate(injections) {
  const colors = new Map(), fonts = new Map(), images = new Map();
  let limited = false, visited = 0, frameElements = 0;
  for (const { result } of [...injections].sort((a,b) => a.frameId-b.frameId)) {
    if (!result || !['colors','fonts','images'].every(k=>Array.isArray(result[k]))) throw new Error('Invalid scan response.');
    limited ||= result.limited; visited += result.visited; frameElements += result.frames;
    for (const c of result.colors) {
      const previous = colors.get(c.value);
      if (previous) { previous.count += c.count; previous.kinds = [...new Set([...previous.kinds,...c.kinds])]; }
      else colors.set(c.value, {...c,kinds:[...c.kinds]});
    }
    for (const f of result.fonts) { const {count,...style}=f,key=JSON.stringify(style); if (fonts.has(key)) fonts.get(key).count += count; else fonts.set(key,{...f}); }
    for (const img of result.images) if (!images.has(img.src)) images.set(img.src,{...img});
  }
  // Enforce an aggregate bound across frames, not only a per-document limit.
  limited ||= colors.size > 500 || fonts.size > 500 || images.size > 500;
  return { colors:[...colors.values()].sort((a,b)=>b.count-a.count || a.value.localeCompare(b.value)).slice(0,500), fonts:[...fonts.values()].slice(0,500), images:[...images.values()].slice(0,500), limited, visited, frames: injections.length, frameElements };
}

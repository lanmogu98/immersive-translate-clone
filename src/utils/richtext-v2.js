/**
 * RichText V2 (Token Protocol)
 *
 * Goal: preserve inline DOM structure (links, emphasis, code, footnotes) without asking the model
 * to output HTML. The model outputs plain text containing immutable tokens that we map back to
 * cloned DOM nodes.
 *
 * UMD-style: globalThis.RichTextV2 for extension runtime, module.exports for Jest/Node.
 */

const RICH_V2_MARKER = '[[ITC_RICH_V2]]';

// Paired tokens wrap translatable content
const PAIRED_TAGS = new Set(['A', 'STRONG', 'EM', 'CODE']);

function isFootnoteReferenceElement(el) {
  if (!el || !el.classList) return false;
  // Wikipedia-style: <sup class="reference">...</sup> or .mw-ref
  if (el.tagName === 'SUP' && el.classList.contains('reference')) return true;
  if (el.classList.contains('mw-ref')) return true;
  return false;
}

function shallowClonePreservingAttrs(el) {
  const clone = el.cloneNode(false);
  // For safety: keep only existing attributes already on the page (cloneNode(false) does this).
  // No additional normalization needed here.
  return clone;
}

function makeToken(id, isClose = false) {
  // Close token is generic on purpose (no id): models frequently corrupt close ids.
  // We still accept legacy close tokens like [[/ITC:a0]] when parsing.
  return isClose ? `[[/ITC]]` : `[[ITC:${id}]]`;
}

function tokenizeElement(element) {
  const tokenMap = {}; // id -> { kind, clone }
  const counters = { a: 0, strong: 0, em: 0, code: 0, ref: 0 };

  function nextId(prefix) {
    const n = counters[prefix]++;
    return `${prefix}${n}`;
  }

  function walk(node, out) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node;

    // Atomic: footnote references (preserve as-is and allow reordering)
    if (isFootnoteReferenceElement(el)) {
      const id = nextId('ref');
      tokenMap[id] = { kind: 'atomic', clone: el.cloneNode(true) };
      out.push(makeToken(id, false));
      return;
    }

    // Paired: supported inline tags
    if (PAIRED_TAGS.has(el.tagName)) {
      const prefix = el.tagName.toLowerCase();
      const id = nextId(prefix);
      tokenMap[id] = { kind: 'paired', tag: el.tagName, clone: shallowClonePreservingAttrs(el) };
      out.push(makeToken(id, false));
      for (const child of Array.from(el.childNodes)) {
        walk(child, out);
      }
      out.push(makeToken(id, true));
      return;
    }

    // Default: flatten unknown elements to text by recursing into children.
    for (const child of Array.from(el.childNodes)) {
      walk(child, out);
    }
  }

  const parts = [];
  for (const child of Array.from(element.childNodes)) {
    walk(child, parts);
  }

  return {
    marker: RICH_V2_MARKER,
    text: `${RICH_V2_MARKER}\n${parts.join('')}`,
    tokenMap,
  };
}

function stripCodeFences(text) {
  const s = (text || '').trim();
  if (!s.startsWith('```')) return s;
  const withoutFirstLine = s.split('\n').slice(1).join('\n');
  const lastFence = withoutFirstLine.lastIndexOf('```');
  if (lastFence === -1) return withoutFirstLine.trim();
  return withoutFirstLine.slice(0, lastFence).trim();
}

function normalizeOutput(output) {
  let s = (output || '').trim();
  // Some models echo the marker; strip it if present.
  if (s.startsWith(RICH_V2_MARKER)) {
    s = s.slice(RICH_V2_MARKER.length).trim();
  }
  s = stripCodeFences(s);
  return s.trim();
}

function tokenizeOutput(output) {
  const s = normalizeOutput(output);
  // Supports:
  // - open:  [[ITC:a0]]
  // - close: [[/ITC]] or legacy [[/ITC:a0]]
  const re = /\[\[(\/)?ITC(?::([a-z]+[0-9]+))?\]\]/g;
  const items = [];
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    const start = m.index;
    const full = m[0];
    const isClose = !!m[1];
    const id = m[2];
    if (start > last) items.push({ type: 'text', value: s.slice(last, start) });
    if (isClose) {
      items.push({ type: 'close', id: id || null, raw: full });
    } else {
      // Open token must have an id; otherwise treat as invalid (will fail validation).
      items.push({ type: 'open', id: id || null, raw: full });
    }
    last = start + full.length;
  }
  if (last < s.length) items.push({ type: 'text', value: s.slice(last) });
  return items;
}

function validateAndClassifyItems(items, tokenMap) {
  const stack = [];
  const seenAtomic = new Set();
  const expectedIds = new Set(Object.keys(tokenMap || {}));
  let closeCount = 0;
  let openPairedCount = 0;

  for (const it of items) {
    if (it.type === 'text') continue;
    if (it.type === 'open' && !it.id) return { ok: false, reason: 'open token missing id' };
    if (it.type === 'open') {
      const entry = tokenMap[it.id];
      if (!entry) return { ok: false, reason: `unknown token: ${it.id}` };

      if (entry.kind === 'atomic') {
        if (seenAtomic.has(it.id)) return { ok: false, reason: `atomic token duplicated: ${it.id}` };
        seenAtomic.add(it.id);
        it.type = 'atomic';
        continue;
      }

      // Paired open
      openPairedCount++;
      stack.push(it.id);
      continue;
    }

    // Close token: generic (id optional). Pop last paired open.
    if (it.type === 'close') {
      closeCount++;
      const top = stack.pop();
      if (!top) return { ok: false, reason: 'close token without open' };
      continue;
    }
    return { ok: false, reason: `invalid token event: ${it.type}` };
  }

  if (stack.length) return { ok: false, reason: `unclosed token: ${stack[stack.length - 1]}` };
  if (closeCount !== openPairedCount) return { ok: false, reason: 'close/open count mismatch' };

  // Ensure every expected token appears at least once in output.
  // For paired tokens we require open occurrence; for atomic, one occurrence.
  const counts = {};
  for (const it of items) {
    if (it.type === 'text') continue;
    if (it.id) counts[it.id] = (counts[it.id] || 0) + 1;
  }
  for (const id of expectedIds) {
    const entry = tokenMap[id];
    const c = counts[id] || 0;
    if (entry.kind === 'atomic') {
      if (c !== 1) return { ok: false, reason: `atomic token missing/extra: ${id}` };
    } else {
      if (c !== 1) return { ok: false, reason: `paired token missing/extra: ${id}` };
    }
  }

  return { ok: true };
}

function renderToNode(targetNode, tokenized, output) {
  if (!targetNode) return false;
  const tokenMap = tokenized && tokenized.tokenMap ? tokenized.tokenMap : {};
  const items = tokenizeOutput(output);
  const v = validateAndClassifyItems(items, tokenMap);
  if (!v.ok) return false;

  const frag = document.createDocumentFragment();
  const stack = [frag];

  for (const it of items) {
    const parent = stack[stack.length - 1];
    if (it.type === 'text') {
      parent.appendChild(document.createTextNode(it.value));
      continue;
    }

    const entry = tokenMap[it.id];
    if (it.type === 'atomic') {
      parent.appendChild(entry.clone.cloneNode(true));
      continue;
    }

    if (it.type === 'open') {
      const el = entry.clone.cloneNode(false);
      parent.appendChild(el);
      stack.push(el);
      continue;
    }

    if (it.type === 'close') {
      // Pop the current element; we already validated nesting.
      stack.pop();
      continue;
    }
  }

  targetNode.innerHTML = '';
  targetNode.appendChild(frag);
  return true;
}

const RichTextV2 = {
  RICH_V2_MARKER,
  tokenizeElement,
  renderToNode,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RichTextV2 };
}
if (typeof globalThis !== 'undefined') {
  globalThis.RichTextV2 = RichTextV2;
}


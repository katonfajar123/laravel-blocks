import { topLevelBlockRanges } from './block-drag.js';

function blockPreview(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();

  return normalized === '' ? 'Empty block' : normalized;
}

export function documentListItems(editor, block = {}) {
  const doc = editor?.state?.doc;
  const ranges = topLevelBlockRanges(editor);
  const siblingCount = ranges.length;

  if (!doc || siblingCount === 0) {
    return Object.freeze([]);
  }

  return Object.freeze(ranges.map((range) => {
    const node = doc.child(range.index);
    const selected = Boolean(
      block?.active
      && block.depth === 1
      && (block.index === range.index || block.from === range.from),
    );
    const text = blockPreview(node?.textContent);

    return Object.freeze({
      active: true,
      attrs: Object.freeze({ ...(node?.attrs ?? {}) }),
      canMoveDown: range.index < siblingCount - 1,
      canMoveUp: range.index > 0,
      depth: 1,
      from: range.from,
      index: range.index,
      label: range.label,
      preview: text,
      selected,
      siblingCount,
      text: text === 'Empty block' ? '' : text,
      to: range.to,
      type: range.type,
    });
  }));
}

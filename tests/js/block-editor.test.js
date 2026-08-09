import { describe, expect, it } from 'vitest';

import {
  blockInsertPayload,
  blockInserterItems,
  createBlockSelectionState,
  filterBlockInserterItems,
  normalizeEditorManifest,
} from '../../resources/js/block-editor/index.js';

describe('block editor helpers', () => {
  it('creates immutable top-level block selection snapshots', () => {
    const selection = createBlockSelectionState(fakeEditorAtBlock({
      index: 1,
      nodeSize: 14,
      siblingCount: 3,
      text: 'Middle block',
      type: 'paragraph',
    }));

    expect(selection).toEqual({
      active: true,
      attrs: {},
      canMoveDown: true,
      canMoveUp: true,
      depth: 1,
      from: 12,
      index: 1,
      label: 'Paragraph',
      siblingCount: 3,
      text: 'Middle block',
      to: 26,
      type: 'paragraph',
    });
    expect(Object.isFrozen(selection)).toBe(true);
    expect(Object.isFrozen(selection.attrs)).toBe(true);
  });

  it('normalizes manifest blocks into searchable inserter items', () => {
    const manifest = normalizeEditorManifest({
      manifestVersion: 1,
      documentSchemaVersion: 1,
      categories: [{ name: 'text', label: 'Text' }],
      blocks: [
        {
          name: 'paragraph',
          label: 'Paragraph',
          category: 'text',
          keywords: ['copy'],
          supports: { inserter: true },
        },
        {
          name: 'featureCard',
          label: 'Feature Card',
          category: 'design',
          supports: { inserter: true },
        },
      ],
    });

    expect(blockInserterItems(manifest)).toMatchObject([
      {
        category: 'text',
        categoryLabel: 'Text',
        label: 'Paragraph',
        name: 'paragraph',
        supported: true,
      },
      {
        category: 'design',
        categoryLabel: 'Design',
        label: 'Feature Card',
        name: 'featureCard',
        supported: false,
      },
    ]);
    expect(filterBlockInserterItems(manifest.blocks, 'copy').map((item) => item.name))
      .toEqual(['paragraph']);
  });

  it('maps supported inserter items to Tiptap node payloads', () => {
    expect(blockInsertPayload({
      name: 'heading',
      supported: true,
    })).toEqual({
      node: {
        type: 'heading',
        attrs: { level: 2 },
      },
      reason: null,
      valid: true,
    });

    expect(blockInsertPayload({
      disabledReason: 'Unsupported.',
      name: 'featureCard',
      supported: false,
    })).toEqual({
      node: null,
      reason: 'Unsupported.',
      valid: false,
    });
  });
});

function fakeEditorAtBlock({
  index,
  nodeSize,
  siblingCount,
  text,
  type,
}) {
  const block = {
    attrs: {},
    isBlock: true,
    nodeSize,
    textContent: text,
    type: { name: type },
  };
  const doc = {
    childCount: siblingCount,
  };

  return {
    state: {
      selection: {
        $from: {
          before: () => 12,
          depth: 1,
          index: () => index,
          node: (depth) => (depth === 1 ? block : doc),
        },
      },
    },
  };
}

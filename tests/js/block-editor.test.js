import { describe, expect, it } from 'vitest';

import {
  blockManifestDefinition,
  blockInsertPayload,
  blockInserterItems,
  coerceInspectorFieldValue,
  createBlockSelectionState,
  documentListItems,
  dropTargetFromRects,
  filterBlockInserterItems,
  inspectorFieldValue,
  inspectorFieldsForBlock,
  inspectorGroups,
  normalizeEditorManifest,
  slashCommandItems,
  topLevelBlockRanges,
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

  it('selects the correct top-level atom from a document-depth node selection', () => {
    const blocks = [
      fakeBlockNode({ nodeSize: 8, type: 'paragraph' }),
      fakeBlockNode({ nodeSize: 1, type: 'image' }),
      fakeBlockNode({ nodeSize: 6, type: 'paragraph' }),
    ];
    const selection = createBlockSelectionState({
      state: {
        doc: {
          child: (index) => blocks[index],
          childCount: blocks.length,
        },
        selection: {
          from: 8,
          $from: {
            depth: 0,
            index: () => 1,
          },
        },
      },
    });

    expect(selection).toMatchObject({
      canMoveDown: true,
      canMoveUp: true,
      from: 8,
      index: 1,
      label: 'Image',
      to: 9,
      type: 'image',
    });
  });

  it('derives top-level block ranges for drag transactions', () => {
    const ranges = topLevelBlockRanges({
      state: {
        doc: {
          childCount: 3,
          child: (index) => [
            fakeBlockNode({ nodeSize: 8, type: 'paragraph' }),
            fakeBlockNode({ nodeSize: 12, type: 'heading' }),
            fakeBlockNode({ nodeSize: 10, type: 'codeBlock' }),
          ][index],
        },
      },
    });

    expect(ranges).toEqual([
      {
        from: 0,
        index: 0,
        label: 'Paragraph',
        nodeSize: 8,
        to: 8,
        type: 'paragraph',
      },
      {
        from: 8,
        index: 1,
        label: 'Heading',
        nodeSize: 12,
        to: 20,
        type: 'heading',
      },
      {
        from: 20,
        index: 2,
        label: 'Code Block',
        nodeSize: 10,
        to: 30,
        type: 'codeBlock',
      },
    ]);
    expect(Object.isFrozen(ranges)).toBe(true);
  });

  it('derives immutable document list items from top-level blocks', () => {
    const items = documentListItems({
      state: {
        doc: {
          childCount: 3,
          child: (index) => [
            fakeBlockNode({ nodeSize: 8, text: 'First block', type: 'paragraph' }),
            fakeBlockNode({ nodeSize: 12, text: 'Second block', type: 'heading' }),
            fakeBlockNode({ nodeSize: 10, type: 'codeBlock' }),
          ][index],
        },
      },
    }, {
      active: true,
      depth: 1,
      from: 8,
      index: 1,
    });

    expect(items).toEqual([
      {
        active: true,
        attrs: {},
        canMoveDown: true,
        canMoveUp: false,
        depth: 1,
        from: 0,
        index: 0,
        label: 'Paragraph',
        preview: 'First block',
        selected: false,
        siblingCount: 3,
        text: 'First block',
        to: 8,
        type: 'paragraph',
      },
      {
        active: true,
        attrs: {},
        canMoveDown: true,
        canMoveUp: true,
        depth: 1,
        from: 8,
        index: 1,
        label: 'Heading',
        preview: 'Second block',
        selected: true,
        siblingCount: 3,
        text: 'Second block',
        to: 20,
        type: 'heading',
      },
      {
        active: true,
        attrs: {},
        canMoveDown: false,
        canMoveUp: true,
        depth: 1,
        from: 20,
        index: 2,
        label: 'Code Block',
        preview: 'Empty block',
        selected: false,
        siblingCount: 3,
        text: '',
        to: 30,
        type: 'codeBlock',
      },
    ]);
    expect(Object.isFrozen(items)).toBe(true);
    expect(Object.isFrozen(items[0])).toBe(true);
    expect(Object.isFrozen(items[0].attrs)).toBe(true);
  });

  it('calculates valid and invalid top-level drop targets', () => {
    const block = {
      active: true,
      depth: 1,
      index: 1,
    };
    const rects = [
      fakeDropRect({ bottom: 40, index: 0, top: 0 }),
      fakeDropRect({ bottom: 90, index: 1, top: 50 }),
      fakeDropRect({ bottom: 140, index: 2, top: 100 }),
    ];

    expect(dropTargetFromRects({
      block,
      clientY: 10,
      rects,
    })).toMatchObject({
      draggingIndex: 1,
      placement: 'before',
      targetIndex: 0,
      valid: true,
    });

    expect(dropTargetFromRects({
      block,
      clientY: 60,
      rects,
    })).toMatchObject({
      placement: 'before',
      reason: 'Drop would keep the block in the same position.',
      targetIndex: 1,
      valid: false,
    });

    expect(dropTargetFromRects({
      block,
      clientY: 135,
      rects,
    })).toMatchObject({
      placement: 'after',
      targetIndex: 3,
      valid: true,
    });
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
        {
          name: 'listItem',
          label: 'List Item',
          category: 'text',
          supports: { inserter: false },
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
    expect(filterBlockInserterItems(manifest.blocks, 'item').map((item) => item.name))
      .toEqual([]);
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
      name: 'orderedList',
      supported: true,
    })).toEqual({
      node: {
        type: 'orderedList',
        attrs: { start: 1, type: null },
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph' }],
        }],
      },
      reason: null,
      valid: true,
    });

    expect(blockInsertPayload({
      name: 'image',
      supported: true,
    })).toEqual({
      node: {
        type: 'image',
        attrs: { src: null, alt: null, title: null },
      },
      reason: null,
      valid: true,
    });

    expect(blockInsertPayload({
      name: 'video',
      supported: true,
    })).toEqual({
      node: {
        type: 'video',
        attrs: { src: null, poster: null, title: null },
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

  it('filters slash command items through the same manifest-driven inserter index', () => {
    const manifest = {
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
          name: 'heading',
          label: 'Heading',
          description: 'Start with a heading',
          category: 'text',
          keywords: ['title'],
          supports: { inserter: true },
        },
      ],
    };

    expect(slashCommandItems(manifest, 'hea').map((item) => item.name)).toEqual(['heading']);
    expect(slashCommandItems(manifest, 'copy').map((item) => item.name)).toEqual(['paragraph']);
  });

  it('derives inspector fields and values from block manifest definitions', () => {
    const manifest = {
      blocks: [{
        name: 'heading',
        label: 'Heading',
        fields: [
          {
            constraints: { allowedValues: [1, 2, 3] },
            default: 2,
            group: 'content',
            label: 'Level',
            name: 'level',
            path: 'attrs.level',
            type: 'select',
          },
          {
            default: '',
            group: 'advanced',
            label: 'Anchor',
            name: 'anchor',
            path: 'attrs.advanced.anchor',
            type: 'text',
          },
        ],
      }],
    };
    const block = {
      active: true,
      attrs: {
        advanced: { anchor: 'intro' },
        level: 2,
      },
      type: 'heading',
    };

    expect(inspectorGroups().map((group) => group.name)).toEqual(['content', 'design', 'advanced']);
    expect(blockManifestDefinition(manifest, block)).toMatchObject({ label: 'Heading' });
    expect(inspectorFieldsForBlock(manifest, block, 'content')).toMatchObject([{
      constraints: { allowedValues: [1, 2, 3] },
      default: 2,
      group: 'content',
      label: 'Level',
      name: 'level',
      path: 'attrs.level',
      type: 'select',
    }]);
    expect(inspectorFieldValue(block, inspectorFieldsForBlock(manifest, block, 'content')[0])).toBe(2);
    expect(inspectorFieldValue(block, inspectorFieldsForBlock(manifest, block, 'advanced')[0])).toBe('intro');
    expect(coerceInspectorFieldValue(inspectorFieldsForBlock(manifest, block, 'content')[0], '3')).toBe(3);

    expect(coerceInspectorFieldValue({
      constraints: { nullable: true },
      type: 'url',
    }, '   ')).toBeNull();
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

function fakeBlockNode({ nodeSize, text = '', type }) {
  return {
    attrs: {},
    isBlock: true,
    nodeSize,
    textContent: text,
    type: { name: type },
  };
}

function fakeDropRect({ bottom, index, top }) {
  return {
    index,
    rect: {
      bottom,
      height: bottom - top,
      left: 80,
      right: 520,
      top,
      width: 440,
    },
  };
}

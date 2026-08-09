import { describe, expect, it } from 'vitest';

import {
  blockManifestDefinition,
  blockInsertPayload,
  blockInserterItems,
  coerceInspectorFieldValue,
  createBlockSelectionState,
  filterBlockInserterItems,
  inspectorFieldValue,
  inspectorFieldsForBlock,
  inspectorGroups,
  normalizeEditorManifest,
  slashCommandItems,
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

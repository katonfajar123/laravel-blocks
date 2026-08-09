import { describe, expect, it } from 'vitest';

import {
  createRichTextToolbarItems,
  richTextToolbarStyle,
  richTextToolbarVisible,
  runRichTextToolbarCommand,
  selectionAnchorRect,
} from '../../resources/js/rich-text/index.js';

describe('rich text toolbar infrastructure', () => {
  it('is visible only for non-empty selections', () => {
    expect(richTextToolbarVisible(null)).toBe(false);
    expect(richTextToolbarVisible({ empty: true, from: 2, to: 2 })).toBe(false);
    expect(richTextToolbarVisible({ empty: false, from: 2, to: 7 })).toBe(true);
  });

  it('creates toolbar items from shared command state', () => {
    const items = createRichTextToolbarItems(fakeRegistry({
      toggleBold: { active: true, enabled: true },
      toggleItalic: { active: false, disabledReason: 'Italic unavailable.', enabled: false },
    }));

    expect(items).toEqual([
      expect.objectContaining({
        active: true,
        command: 'toggleBold',
        disabled: false,
        label: 'Bold',
      }),
      expect.objectContaining({
        active: false,
        command: 'toggleItalic',
        disabled: true,
        disabledReason: 'Italic unavailable.',
        label: 'Italic',
      }),
    ]);
    expect(Object.isFrozen(items)).toBe(true);
    expect(Object.isFrozen(items[0])).toBe(true);
  });

  it('runs actions through the shared command registry', () => {
    const registry = fakeRegistry();

    expect(runRichTextToolbarCommand(registry, 'toggleBold')).toMatchObject({
      executed: true,
      name: 'toggleBold',
    });
    expect(registry.runs).toEqual(['toggleBold']);
  });

  it('computes a selection anchor rect from ProseMirror coords', () => {
    const editor = fakeEditor({
      2: { bottom: 28, left: 12, right: 14, top: 10 },
      7: { bottom: 30, left: 92, right: 96, top: 12 },
    });

    expect(selectionAnchorRect(editor, { empty: false, from: 2, to: 7 })).toEqual({
      bottom: 30,
      height: 20,
      left: 12,
      right: 96,
      top: 10,
      width: 84,
    });
  });

  it('computes toolbar placement from the current text selection', () => {
    const editor = fakeEditor({
      2: { bottom: 48, left: 50, right: 54, top: 28 },
      7: { bottom: 48, left: 150, right: 154, top: 28 },
    });

    expect(richTextToolbarStyle({
      editor,
      placement: 'top',
      selection: { empty: false, from: 2, to: 7 },
      toolbarRect: { height: 40, width: 120 },
    })).toEqual({
      left: '42px',
      position: 'fixed',
      top: '8px',
    });
  });
});

function fakeRegistry(states = {}) {
  return {
    runs: [],
    run(name) {
      this.runs.push(name);

      return {
        executed: true,
        name,
      };
    },
    state(name) {
      return {
        active: false,
        disabledReason: null,
        enabled: true,
        ...(states[name] ?? {}),
      };
    },
  };
}

function fakeEditor(coords) {
  return {
    view: {
      coordsAtPos(position) {
        return coords[position];
      },
      dom: {
        ownerDocument: {
          defaultView: {
            innerHeight: 600,
            innerWidth: 800,
          },
        },
      },
    },
  };
}

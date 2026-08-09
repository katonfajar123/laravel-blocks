import { computePopoverStyle } from '../ui/index.js';

export const richTextToolbarCommands = Object.freeze([
  Object.freeze({
    command: 'toggleBold',
    label: 'Bold',
    shortcut: 'B',
    text: 'B',
  }),
  Object.freeze({
    command: 'toggleItalic',
    label: 'Italic',
    shortcut: 'I',
    text: 'I',
  }),
]);

export function richTextToolbarVisible(selection) {
  return Boolean(selection && !selection.empty && selection.from !== selection.to);
}

export function createRichTextToolbarItems(commandRegistry, definitions = richTextToolbarCommands) {
  return Object.freeze(definitions.map((definition) => {
    const state = commandRegistry?.state?.(definition.command) ?? {
      active: false,
      disabledReason: 'Command registry is unavailable.',
      enabled: false,
    };

    return Object.freeze({
      ...definition,
      active: Boolean(state.active),
      disabled: !state.enabled,
      disabledReason: state.disabledReason,
    });
  }));
}

export function runRichTextToolbarCommand(commandRegistry, command) {
  if (!commandRegistry?.run) {
    return Object.freeze({
      executed: false,
      name: command,
      state: null,
    });
  }

  return commandRegistry.run(command);
}

export function selectionAnchorRect(editor, selection) {
  if (!editor?.view || !richTextToolbarVisible(selection)) {
    return null;
  }

  try {
    const from = editor.view.coordsAtPos(Math.min(selection.from, selection.to));
    const to = editor.view.coordsAtPos(Math.max(selection.from, selection.to));
    const left = Math.min(from.left, to.left);
    const right = Math.max(from.right, to.right);
    const top = Math.min(from.top, to.top);
    const bottom = Math.max(from.bottom, to.bottom);

    return Object.freeze({
      bottom,
      height: Math.max(1, bottom - top),
      left,
      right,
      top,
      width: Math.max(1, right - left),
    });
  } catch {
    return null;
  }
}

export function richTextToolbarStyle({
  editor,
  placement = 'top',
  selection,
  toolbarRect = { height: 44, width: 112 },
} = {}) {
  const anchorRect = selectionAnchorRect(editor, selection);

  if (!anchorRect) {
    return Object.freeze({});
  }

  return computePopoverStyle({
    anchorRect,
    placement,
    popoverRect: toolbarRect,
    viewportHeight: editor.view.dom.ownerDocument.defaultView.innerHeight,
    viewportWidth: editor.view.dom.ownerDocument.defaultView.innerWidth,
  });
}

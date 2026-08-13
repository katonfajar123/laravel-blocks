import { describe, expect, it, vi } from 'vitest';

import {
  editorShortcutCommand,
  handleEditorShortcut,
  handleHistoryShortcut,
  headingShortcutCommand,
  historyShortcutCommand,
} from '../../resources/js/editor/keyboard-shortcuts.js';

describe('editor keyboard shortcuts', () => {
  it('maps platform undo and redo shortcuts', () => {
    expect(historyShortcutCommand(event({ ctrlKey: true, key: 'z' }))).toBe('undo');
    expect(historyShortcutCommand(event({ metaKey: true, key: 'Z' }))).toBe('undo');
    expect(historyShortcutCommand(event({ ctrlKey: true, key: 'z', shiftKey: true }))).toBe('redo');
    expect(historyShortcutCommand(event({ metaKey: true, key: 'Z', shiftKey: true }))).toBe('redo');
  });

  it('ignores unrelated or conflicting shortcuts', () => {
    expect(historyShortcutCommand(event({ key: 'z' }))).toBeNull();
    expect(historyShortcutCommand(event({ altKey: true, ctrlKey: true, key: 'z' }))).toBeNull();
    expect(historyShortcutCommand(event({ ctrlKey: true, key: 'b' }))).toBeNull();
  });

  it('maps heading level shortcuts to command payloads', () => {
    expect(headingShortcutCommand(event({ code: 'Digit2', ctrlKey: true, key: '@', shiftKey: true })))
      .toEqual({ command: 'setHeading', payload: { level: 2 } });
    expect(headingShortcutCommand(event({ code: 'Digit3', metaKey: true, key: '#', shiftKey: true })))
      .toEqual({ command: 'setHeading', payload: { level: 3 } });
    expect(headingShortcutCommand(event({ ctrlKey: true, key: '4', shiftKey: true })))
      .toEqual({ command: 'setHeading', payload: { level: 4 } });
    expect(headingShortcutCommand(event({ code: 'Digit5', ctrlKey: true, key: '%', shiftKey: true })))
      .toBeNull();
    expect(headingShortcutCommand(event({ code: 'Digit2', ctrlKey: true, key: '2' })))
      .toBeNull();
  });

  it('dispatches editor shortcuts with payloads through the command registry', () => {
    const preventDefault = vi.fn();
    const run = vi.fn();

    expect(editorShortcutCommand(event({ code: 'Digit3', ctrlKey: true, key: '#', shiftKey: true })))
      .toEqual({ command: 'setHeading', payload: { level: 3 } });

    expect(handleEditorShortcut(
      event({ code: 'Digit3', ctrlKey: true, key: '#', preventDefault, shiftKey: true }),
      { run },
    )).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith('setHeading', { level: 3 });

    expect(handleEditorShortcut(event({ ctrlKey: true, key: 'z', preventDefault }), { run }))
      .toBe(true);
    expect(run).toHaveBeenLastCalledWith('undo', {});
  });

  it('dispatches recognized history shortcuts through the command registry', () => {
    const preventDefault = vi.fn();
    const run = vi.fn();

    expect(handleHistoryShortcut(event({ ctrlKey: true, key: 'z', preventDefault }), { run })).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith('undo');

    expect(handleHistoryShortcut(event({ ctrlKey: true, key: 'z', shiftKey: true, preventDefault }), { run })).toBe(true);
    expect(run).toHaveBeenLastCalledWith('redo');
  });

  it('does not consume unknown shortcuts', () => {
    const preventDefault = vi.fn();
    const run = vi.fn();

    expect(handleHistoryShortcut(event({ ctrlKey: true, key: 'x', preventDefault }), { run })).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});

function event(overrides = {}) {
  return {
    altKey: false,
    code: '',
    ctrlKey: false,
    key: '',
    metaKey: false,
    preventDefault: () => {},
    shiftKey: false,
    ...overrides,
  };
}

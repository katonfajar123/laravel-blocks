import { describe, expect, it } from 'vitest';

import { CommandRegistry, createDefaultCommandRegistry } from '../../resources/js/editor/commands.js';
import { createSelectionState } from '../../resources/js/editor/selection.js';

describe('editor command registry', () => {
  it('reports command metadata, active state, and execution through one path', () => {
    const editor = fakeEditor({ active: new Set(['bold']) });
    const registry = createDefaultCommandRegistry(editor);

    expect(registry).toBeInstanceOf(CommandRegistry);
    expect(registry.has('toggleBold')).toBe(true);
    expect(registry.state('toggleBold')).toMatchObject({
      name: 'toggleBold',
      label: 'Bold',
      active: true,
      enabled: true,
      disabledReason: null,
    });

    expect(registry.run('toggleBold')).toMatchObject({
      name: 'toggleBold',
      executed: true,
    });
    expect(editor.calls).toContain('run:toggleBold');
  });

  it('does not execute disabled commands and reports a reason', () => {
    const editor = fakeEditor({ canRun: false });
    const registry = createDefaultCommandRegistry(editor);

    expect(registry.run('toggleItalic')).toMatchObject({
      name: 'toggleItalic',
      executed: false,
      state: {
        enabled: false,
        disabledReason: 'Italic is unavailable for the current selection.',
      },
    });
    expect(editor.calls).not.toContain('run:toggleItalic');
  });

  it('validates heading levels before reporting state or execution', () => {
    const registry = createDefaultCommandRegistry(fakeEditor());

    expect(() => registry.state('setHeading', { level: 9 })).toThrow(/Heading level/);
    expect(() => registry.run('setHeading', { level: 'x' })).toThrow(/Heading level/);
  });

  it('returns deterministic command snapshots', () => {
    const registry = createDefaultCommandRegistry(fakeEditor());

    expect(registry.snapshot({ setHeading: { level: 3 } }).map((command) => command.name))
      .toEqual(['focus', 'toggleBold', 'toggleItalic', 'setParagraph', 'setHeading', 'undo', 'redo']);
  });

  it('creates immutable selection snapshots from the editor state', () => {
    const state = createSelectionState({
      state: {
        selection: {
          constructor: { name: 'TextSelection' },
          empty: false,
          from: 2,
          to: 7,
          anchor: 2,
          head: 7,
        },
        doc: {
          textBetween: () => 'Hello',
        },
      },
    });

    expect(state).toEqual({
      type: 'TextSelection',
      empty: false,
      from: 2,
      to: 7,
      anchor: 2,
      head: 7,
      text: 'Hello',
    });
    expect(Object.isFrozen(state)).toBe(true);
  });
});

function fakeEditor({ canRun = true, commandRun = true, active = new Set() } = {}) {
  const calls = [];
  const headingLevels = new Set(
    [...active]
      .filter((value) => value.startsWith('heading:'))
      .map((value) => Number(value.replace('heading:', ''))),
  );

  return {
    calls,
    isDestroyed: false,
    can: () => ({
      chain: () => fakeChain(calls, 'can', canRun),
    }),
    chain: () => fakeChain(calls, 'run', commandRun),
    commands: {
      focus: () => {
        calls.push('command:focus');

        return commandRun;
      },
    },
    isActive: (name, attrs = {}) => {
      if (name === 'heading') {
        return headingLevels.has(attrs.level);
      }

      return active.has(name);
    },
  };
}

function fakeChain(calls, prefix, runResult) {
  return {
    focus() {
      calls.push(`${prefix}:focus`);

      return this;
    },
    toggleBold() {
      calls.push(`${prefix}:toggleBold`);

      return this;
    },
    toggleItalic() {
      calls.push(`${prefix}:toggleItalic`);

      return this;
    },
    setParagraph() {
      calls.push(`${prefix}:setParagraph`);

      return this;
    },
    setHeading({ level }) {
      calls.push(`${prefix}:setHeading:${level}`);

      return this;
    },
    undo() {
      calls.push(`${prefix}:undo`);

      return this;
    },
    redo() {
      calls.push(`${prefix}:redo`);

      return this;
    },
    run() {
      calls.push(`${prefix}:run`);

      return runResult;
    },
  };
}

import { describe, expect, it } from 'vitest';

import {
  Button,
  IconButton,
  Popover,
  Toolbar,
  ToolbarGroup,
  computePopoverStyle,
  createOverlayController,
  createPopoverController,
  normalizePopoverPlacement,
  targetIsInside,
} from '../../resources/js/ui/index.js';

describe('editor UI primitives', () => {
  it('exposes named Vue primitives with stable default props', () => {
    expect(Button.name).toBe('LaravelBlocksButton');
    expect(Button.props.variant.default).toBe('neutral');
    expect(Button.props.size.default).toBe('md');
    expect(IconButton.name).toBe('LaravelBlocksIconButton');
    expect(IconButton.props.label.required).toBe(true);
    expect(Toolbar.name).toBe('LaravelBlocksToolbar');
    expect(Toolbar.props.orientation.default).toBe('horizontal');
    expect(ToolbarGroup.name).toBe('LaravelBlocksToolbarGroup');
    expect(Popover.name).toBe('LaravelBlocksPopover');
    expect(Popover.props.placement.default).toBe('bottom-start');
  });

  it('normalizes and computes deterministic popover placement', () => {
    expect(normalizePopoverPlacement('right-end')).toBe('right-end');
    expect(normalizePopoverPlacement('sideways')).toBe('bottom-start');

    expect(computePopoverStyle({
      anchorRect: {
        bottom: 40,
        height: 20,
        left: 24,
        right: 124,
        top: 20,
        width: 100,
      },
      popoverRect: {
        height: 80,
        width: 180,
      },
      placement: 'bottom-start',
      viewportHeight: 600,
      viewportWidth: 800,
    })).toEqual({
      left: '24px',
      position: 'fixed',
      top: '48px',
    });
  });

  it('detects targets inside anchor or popover elements', () => {
    const child = {};
    const anchor = {
      contains: (target) => target === child,
    };
    const popover = {};

    expect(targetIsInside(child, [anchor, popover])).toBe(true);
    expect(targetIsInside(popover, [anchor, popover])).toBe(true);
    expect(targetIsInside({}, [anchor, popover])).toBe(false);
  });

  it('dismisses overlays on Escape and restores focus to the invoker', () => {
    const ownerDocument = fakeDocument();
    const invoker = fakeElement();
    const reasons = [];
    const controller = createOverlayController({
      ownerDocument,
      containsTarget: () => true,
      onDismiss: (reason) => reasons.push(reason),
    });

    controller.open(invoker);
    expect(controller.isOpen()).toBe(true);
    expect(ownerDocument.listenerCount('keydown')).toBe(1);

    ownerDocument.dispatch('keydown', fakeEvent({ key: 'Escape' }));

    expect(reasons).toEqual(['escape']);
    expect(controller.isOpen()).toBe(false);
    expect(invoker.focusCalls).toBe(1);
    expect(ownerDocument.listenerCount('keydown')).toBe(0);
  });

  it('dismisses overlays on outside pointer interaction', () => {
    const ownerDocument = fakeDocument();
    const invoker = fakeElement();
    const reasons = [];
    const controller = createOverlayController({
      ownerDocument,
      containsTarget: (target) => target === 'inside',
      onDismiss: (reason) => reasons.push(reason),
    });

    controller.open(invoker);
    ownerDocument.dispatch('pointerdown', fakeEvent({ target: 'outside' }));

    expect(reasons).toEqual(['outside-pointer']);
    expect(controller.isOpen()).toBe(false);
    expect(invoker.focusCalls).toBe(1);
  });

  it('opens, positions, closes, and destroys DOM popover controllers', () => {
    const ownerDocument = fakeDocument();
    const anchor = fakeElement({
      rect: {
        bottom: 35,
        height: 24,
        left: 16,
        right: 116,
        top: 11,
        width: 100,
      },
    });
    const popover = fakeElement({
      ownerDocument,
      rect: {
        height: 72,
        width: 160,
      },
    });
    const events = [];
    const controller = createPopoverController({
      anchor,
      onClose: (reason) => events.push(reason),
      ownerDocument,
      placement: 'bottom-start',
      popover,
    });

    controller.open(anchor);

    expect(controller.isOpen()).toBe(true);
    expect(popover.hidden).toBe(false);
    expect(popover.dataset.laravelBlocksPlacement).toBe('bottom-start');
    expect(popover.style).toMatchObject({
      left: '16px',
      position: 'fixed',
      top: '43px',
    });

    ownerDocument.dispatch('pointerdown', fakeEvent({ target: 'outside' }));

    expect(events).toEqual(['outside-pointer']);
    expect(controller.isOpen()).toBe(false);
    expect(popover.hidden).toBe(true);
    expect(anchor.focusCalls).toBe(1);

    controller.destroy();
    expect(popover.dataset.laravelBlocksState).toBe('closed');
  });
});

function fakeDocument() {
  const listeners = new Map();

  return {
    defaultView: {
      innerHeight: 600,
      innerWidth: 800,
    },
    addEventListener(type, listener) {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    },
    dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    },
    listenerCount(type) {
      return (listeners.get(type) ?? []).length;
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter((current) => current !== listener));
    },
  };
}

function fakeElement({ ownerDocument = fakeDocument(), rect = { height: 0, width: 0 } } = {}) {
  return {
    dataset: {},
    focusCalls: 0,
    hidden: true,
    ownerDocument,
    style: {},
    contains: () => false,
    focus() {
      this.focusCalls += 1;
    },
    getBoundingClientRect() {
      return {
        bottom: rect.bottom ?? 0,
        height: rect.height ?? 0,
        left: rect.left ?? 0,
        right: rect.right ?? 0,
        top: rect.top ?? 0,
        width: rect.width ?? 0,
      };
    },
  };
}

function fakeEvent(overrides = {}) {
  return {
    key: '',
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: null,
    ...overrides,
  };
}

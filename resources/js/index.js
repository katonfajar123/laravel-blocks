import { version as vueVersion } from 'vue';

import '../css/laravel-blocks.css';
import {
  bootWhenReady,
  mountLaravelBlocksEditor,
  mountLaravelBlocksEditors,
  readEditorPayload,
} from './editor/mount.js';
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
} from './ui/index.js';
import { CommandRegistry, createDefaultCommandRegistry } from './editor/commands.js';
import {
  emptyDocument,
  normalizeDocument,
  toCanonicalDocument,
  toCanonicalJson,
  toTiptapDocument,
} from './editor/document.js';
import { createSelectionState } from './editor/selection.js';

export const packageMetadata = Object.freeze({
  name: '@katonfajar/laravel-blocks',
  vueMajor: Number.parseInt(vueVersion.split('.')[0], 10),
  vueVersion,
});

export {
  bootWhenReady,
  Button,
  CommandRegistry,
  IconButton,
  Popover,
  Toolbar,
  ToolbarGroup,
  computePopoverStyle,
  createDefaultCommandRegistry,
  createOverlayController,
  createPopoverController,
  createSelectionState,
  emptyDocument,
  mountLaravelBlocksEditor,
  mountLaravelBlocksEditors,
  normalizePopoverPlacement,
  normalizeDocument,
  readEditorPayload,
  targetIsInside,
  toCanonicalDocument,
  toCanonicalJson,
  toTiptapDocument,
};

export const LaravelBlocks = Object.freeze({
  packageMetadata,
  bootWhenReady,
  mountEditor: mountLaravelBlocksEditor,
  mountEditors: mountLaravelBlocksEditors,
  normalizeDocument,
  ui: Object.freeze({
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
  }),
  toCanonicalDocument,
  toCanonicalJson,
});

if (typeof window !== 'undefined') {
  window.LaravelBlocks = LaravelBlocks;
  bootWhenReady();
}

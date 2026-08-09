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
import {
  RichTextToolbar,
  createRichTextToolbarItems,
  richTextToolbarCommands,
  richTextToolbarStyle,
  richTextToolbarVisible,
  runRichTextToolbarCommand,
  selectionAnchorRect,
} from './rich-text/index.js';

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
  RichTextToolbar,
  Toolbar,
  ToolbarGroup,
  computePopoverStyle,
  createDefaultCommandRegistry,
  createOverlayController,
  createPopoverController,
  createRichTextToolbarItems,
  createSelectionState,
  emptyDocument,
  mountLaravelBlocksEditor,
  mountLaravelBlocksEditors,
  normalizePopoverPlacement,
  normalizeDocument,
  richTextToolbarCommands,
  richTextToolbarStyle,
  richTextToolbarVisible,
  readEditorPayload,
  runRichTextToolbarCommand,
  selectionAnchorRect,
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
  richText: Object.freeze({
    RichTextToolbar,
    createRichTextToolbarItems,
    richTextToolbarCommands,
    richTextToolbarStyle,
    richTextToolbarVisible,
    runRichTextToolbarCommand,
    selectionAnchorRect,
  }),
  toCanonicalDocument,
  toCanonicalJson,
});

if (typeof window !== 'undefined') {
  window.LaravelBlocks = LaravelBlocks;
  bootWhenReady();
}

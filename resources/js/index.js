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
  LinkPopover,
  RichTextToolbar,
  createRichTextToolbarItems,
  createDefaultLinkProvider,
  currentLinkForm,
  linkAttributes,
  linkErrorMessage,
  normalizeLinkHref,
  richTextToolbarCommands,
  richTextToolbarStyle,
  richTextToolbarVisible,
  runRichTextToolbarCommand,
  selectionAnchorRect,
  validateLinkHref,
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
  LinkPopover,
  Popover,
  RichTextToolbar,
  Toolbar,
  ToolbarGroup,
  computePopoverStyle,
  createDefaultCommandRegistry,
  createDefaultLinkProvider,
  createOverlayController,
  createPopoverController,
  createRichTextToolbarItems,
  createSelectionState,
  currentLinkForm,
  emptyDocument,
  linkAttributes,
  linkErrorMessage,
  mountLaravelBlocksEditor,
  mountLaravelBlocksEditors,
  normalizeLinkHref,
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
  validateLinkHref,
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
    LinkPopover,
    RichTextToolbar,
    createRichTextToolbarItems,
    createDefaultLinkProvider,
    currentLinkForm,
    linkAttributes,
    linkErrorMessage,
    normalizeLinkHref,
    richTextToolbarCommands,
    richTextToolbarStyle,
    richTextToolbarVisible,
    runRichTextToolbarCommand,
    selectionAnchorRect,
    validateLinkHref,
  }),
  toCanonicalDocument,
  toCanonicalJson,
});

if (typeof window !== 'undefined') {
  window.LaravelBlocks = LaravelBlocks;
  bootWhenReady();
}

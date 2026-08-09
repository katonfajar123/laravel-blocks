import { describe, expect, it } from 'vitest';

import { LaravelBlocks, packageMetadata } from '../../resources/js/index.js';

describe('package frontend entry', () => {
  it('exposes immutable Vue 3 build metadata', () => {
    expect(Object.isFrozen(packageMetadata)).toBe(true);
    expect(packageMetadata.name).toBe('@katonfajar/laravel-blocks');
    expect(packageMetadata.vueMajor).toBe(3);
    expect(packageMetadata.vueVersion).toMatch(/^3\./);
    expect(Object.isFrozen(LaravelBlocks)).toBe(true);
    expect(LaravelBlocks.packageMetadata).toBe(packageMetadata);
    expect(LaravelBlocks.mountEditor).toBeTypeOf('function');
    expect(LaravelBlocks.toCanonicalJson).toBeTypeOf('function');
    expect(LaravelBlocks.ui.Popover.name).toBe('LaravelBlocksPopover');
    expect(LaravelBlocks.ui.createPopoverController).toBeTypeOf('function');
    expect(LaravelBlocks.blockEditor.BlockToolbar.name).toBe('LaravelBlocksBlockToolbar');
    expect(LaravelBlocks.blockEditor.BlockInserter.name).toBe('LaravelBlocksBlockInserter');
    expect(LaravelBlocks.blockEditor.BlockInspector.name).toBe('LaravelBlocksBlockInspector');
    expect(LaravelBlocks.blockEditor.SlashCommandMenu.name).toBe('LaravelBlocksSlashCommandMenu');
    expect(LaravelBlocks.blockEditor.inspectorFieldsForBlock).toBeTypeOf('function');
    expect(LaravelBlocks.blockEditor.slashCommandItems).toBeTypeOf('function');
    expect(LaravelBlocks.blockEditor.createBlockSelectionState).toBeTypeOf('function');
    expect(LaravelBlocks.blockEditor.blockInserterItems).toBeTypeOf('function');
    expect(LaravelBlocks.richText.RichTextToolbar).toBeUndefined();
    expect(LaravelBlocks.richText.LinkPopover.name).toBe('LaravelBlocksLinkPopover');
    expect(LaravelBlocks.richText.createRichTextToolbarItems).toBeTypeOf('function');
    expect(LaravelBlocks.richText.validateLinkHref).toBeTypeOf('function');
  });
});

import { EditorContent, useEditor } from '@tiptap/vue-3';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { h, onBeforeUnmount, shallowRef } from 'vue';

import {
  BlockInserter,
  BlockInspector,
  BlockListView,
  BlockToolbar,
  SlashCommandMenu,
  createBlockSelectionState,
  createEmptyBlockSelection,
  createTopLevelBlockSelectionState,
  createTopLevelHoverBlockSelectionState,
  slashCommandItems,
} from '../block-editor/index.js';
import { createDefaultCommandRegistry } from './commands.js';
import { normalizeDocument, toCanonicalJson, toTiptapDocument } from './document.js';
import { HistoryToolbar } from './HistoryToolbar.js';
import { handleEditorShortcut } from './keyboard-shortcuts.js';
import { createSelectionState } from './selection.js';
import { Icon, IconButton } from '../ui/index.js';

const LaravelBlocksImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },
  renderHTML({ HTMLAttributes }) {
    if (!HTMLAttributes.src) {
      return ['div', {
        'aria-label': 'Empty image block',
        'data-laravel-blocks-image-placeholder': '',
        role: 'img',
      }, 'Image'];
    }

    return ['img', {
      ...this.options.HTMLAttributes,
      ...HTMLAttributes,
      'data-laravel-blocks-image': '',
    }];
  },
});

function syncHiddenInputValue(value, input) {
  input.value = typeof value === 'string' ? value : JSON.stringify(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncHiddenInput(editor, input) {
  syncHiddenInputValue(toCanonicalJson(editor.getJSON()), input);
}

function blockLabel(type) {
  return String(type ?? '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || 'Block';
}

function emptyTopLevelTextBlock(editor) {
  const doc = editor?.state?.doc;

  if (!doc || doc.childCount !== 1) {
    return null;
  }

  const node = doc.child(0);

  if (!node?.isTextblock || node.textContent.trim() !== '') {
    return null;
  }

  return Object.freeze({
    active: true,
    attrs: Object.freeze({ ...(node.attrs ?? {}) }),
    canMoveDown: false,
    canMoveUp: false,
    depth: 1,
    from: 0,
    index: 0,
    label: blockLabel(node.type?.name),
    siblingCount: 1,
    text: '',
    to: node.nodeSize,
    type: node.type?.name ?? 'unknown',
  });
}

export const EditorShell = {
  name: 'LaravelBlocksEditorShell',
  props: {
    document: {
      type: Object,
      required: true,
    },
    input: {
      type: Object,
      required: true,
    },
    manifest: {
      type: Object,
      default: () => ({ manifestVersion: 1, documentSchemaVersion: 1, categories: [], blocks: [] }),
    },
    placeholder: {
      type: String,
      default: 'Start writing or type / to choose a block',
    },
  },
  setup(props, { expose }) {
    const blockSelection = shallowRef(createBlockSelectionState(null));
    const commands = shallowRef(null);
    const documentListOpen = shallowRef(false);
    const editorStateVersion = shallowRef(0);
    const hoverControlsActive = shallowRef(false);
    const hoverSuppressedUntil = shallowRef(0);
    const hoveredBlockSelection = shallowRef(createEmptyBlockSelection());
    const inspectorOpen = shallowRef(false);
    const requestedBlockSelection = shallowRef(createEmptyBlockSelection());
    const selection = shallowRef(createSelectionState(null));
    const slash = shallowRef({
      activeIndex: 0,
      open: false,
      query: '',
    });
    let clearHoverTimer = null;

    function sameBlockSelection(first, second) {
      return Boolean(first?.active) === Boolean(second?.active)
        && Number(first?.from ?? 0) === Number(second?.from ?? 0)
        && Number(first?.to ?? 0) === Number(second?.to ?? 0)
        && Number(first?.index ?? -1) === Number(second?.index ?? -1)
        && String(first?.type ?? '') === String(second?.type ?? '');
    }

    function setHoveredBlock(next) {
      if (sameBlockSelection(hoveredBlockSelection.value, next)) {
        return;
      }

      hoveredBlockSelection.value = next;
    }

    function updateEditorState(currentEditor) {
      blockSelection.value = createBlockSelectionState(currentEditor);
      selection.value = createSelectionState(currentEditor);

      if (requestedBlockSelection.value.active && blockSelection.value.active) {
        requestedBlockSelection.value = blockSelection.value;
      }

      editorStateVersion.value += 1;
    }

    function keyboardSuppressionActive() {
      return hoverSuppressedUntil.value > 0 && Date.now() < hoverSuppressedUntil.value;
    }

    function clearHoveredBlock() {
      setHoveredBlock(createEmptyBlockSelection());
    }

    function cancelClearHoverTimer() {
      if (clearHoverTimer !== null) {
        globalThis.clearTimeout?.(clearHoverTimer);
        clearHoverTimer = null;
      }
    }

    function scheduleClearHoveredBlock() {
      cancelClearHoverTimer();
      clearHoverTimer = globalThis.setTimeout?.(() => {
        clearHoverTimer = null;

        if (!hoverControlsActive.value) {
          clearHoveredBlock();
        }
      }, 240) ?? null;
    }

    function retainHoverControls() {
      hoverControlsActive.value = true;
      cancelClearHoverTimer();
    }

    function releaseHoverControls() {
      hoverControlsActive.value = false;
      scheduleClearHoveredBlock();
    }

    function typingKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) {
        return false;
      }

      return event.key.length === 1 || ['Backspace', 'Delete'].includes(event.key);
    }

    function markKeyboardActivity(event) {
      if (!typingKey(event)) {
        return;
      }

      hoverSuppressedUntil.value = Date.now() + 350;
      clearHoveredBlock();
      requestedBlockSelection.value = createEmptyBlockSelection();

      globalThis.setTimeout?.(() => {
        if (!keyboardSuppressionActive()) {
          hoverSuppressedUntil.value = 0;
        }
      }, 370);
    }

    function hasTextSelection() {
      return Boolean(
        blockSelection.value.active
        && selection.value
        && !selection.value.empty
        && selection.value.text.length > 0,
      );
    }

    function updateHoveredBlock(event) {
      if (keyboardSuppressionActive() || hasTextSelection() || slash.value.open) {
        clearHoveredBlock();

        return;
      }

      setHoveredBlock(createTopLevelHoverBlockSelectionState(
        editor.value,
        editor.value?.view?.dom,
        event.target,
      ));
    }

    function clearRequestedBlockControls() {
      requestedBlockSelection.value = createEmptyBlockSelection();
    }

    function requestBlockControls(block) {
      const result = commands.value?.run?.('selectBlock', { block }) ?? { executed: false };

      if (!result.executed) {
        return false;
      }

      requestedBlockSelection.value = createTopLevelBlockSelectionState(
        editor.value,
        block.index,
      );
      clearHoveredBlock();

      return true;
    }

    function contextualToolbarState() {
      if (slash.value.open) {
        return {
          block: createEmptyBlockSelection(),
          mode: 'block',
        };
      }

      if (hasTextSelection()) {
        return {
          block: blockSelection.value,
          mode: 'inline',
        };
      }

      if (requestedBlockSelection.value.active && !keyboardSuppressionActive()) {
        return {
          block: requestedBlockSelection.value,
          mode: 'block',
        };
      }

      if (
        hoveredBlockSelection.value.active
        && selection.value?.empty
        && !keyboardSuppressionActive()
      ) {
        return {
          block: hoveredBlockSelection.value,
          mode: 'handle',
        };
      }

      return {
        block: createEmptyBlockSelection(),
        mode: 'block',
      };
    }

    function setSlashState(next) {
      slash.value = Object.freeze({
        ...slash.value,
        ...next,
      });
    }

    function closeSlash() {
      setSlashState({
        activeIndex: 0,
        open: false,
        query: '',
      });
    }

    function setDocumentListOpen(open) {
      documentListOpen.value = open;

      if (!open) {
        commands.value?.run?.('focus');
      }

      return documentListOpen.value;
    }

    function slashItems(query = slash.value.query) {
      return slashCommandItems(props.manifest, query);
    }

    function slashTriggerBlock(currentEditor = editor.value) {
      const currentSelection = createSelectionState(currentEditor);
      const currentBlock = createBlockSelectionState(currentEditor);

      if (
        currentEditor
        && currentSelection.empty
        && currentBlock.active
        && currentBlock.depth === 1
        && currentBlock.text.trim() === ''
      ) {
        return currentBlock;
      }

      return emptyTopLevelTextBlock(currentEditor);
    }

    function canOpenSlash(currentEditor = editor.value) {
      return slashTriggerBlock(currentEditor) !== null;
    }

    function openSlash() {
      const currentBlock = slashTriggerBlock(editor.value);

      if (!currentBlock) {
        return false;
      }

      blockSelection.value = currentBlock;
      selection.value = createSelectionState(editor.value);
      setSlashState({
        activeIndex: 0,
        open: true,
        query: '',
      });

      return true;
    }

    function updateSlashQuery(query) {
      setSlashState({
        activeIndex: 0,
        query,
      });
    }

    function moveSlashSelection(direction) {
      const max = Math.max(0, slashItems().length - 1);

      setSlashState({
        activeIndex: Math.min(max, Math.max(0, slash.value.activeIndex + direction)),
      });
    }

    function insertSlashItem(item = slashItems()[slash.value.activeIndex]) {
      const result = commands.value?.run?.('insertManifestBlock', {
        block: blockSelection.value,
        item,
        placement: 'replace',
      }) ?? { executed: false };

      if (result.executed) {
        closeSlash();
      }

      return result;
    }

    function handleSlashKeydown(event) {
      if (!slash.value.open) {
        return false;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlash();

        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSlashSelection(1);

        return true;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSlashSelection(-1);

        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        insertSlashItem();

        return true;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();

        if (slash.value.query === '') {
          closeSlash();
        } else {
          updateSlashQuery(slash.value.query.slice(0, -1));
        }

        return true;
      }

      if (
        event.key.length === 1
        && !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.isComposing
      ) {
        event.preventDefault();
        updateSlashQuery(`${slash.value.query}${event.key}`);

        return true;
      }

      return false;
    }

    const editor = useEditor({
      extensions: [
        StarterKit,
        Highlight.configure({
          HTMLAttributes: {
            class: 'lb-editor-highlight',
          },
        }),
        LaravelBlocksImage.configure({
          allowBase64: false,
        }),
        Link.configure({
          autolink: false,
          linkOnPaste: false,
          openOnClick: false,
        }),
      ],
      content: toTiptapDocument(props.document),
      editorProps: {
        attributes: {
          'aria-label': 'Laravel Blocks content canvas',
          class: 'lb-editor-shell__prosemirror',
          'data-laravel-blocks-canvas': '',
        },
        handleKeyDown: (_, event) => {
          markKeyboardActivity(event);

          if (handleSlashKeydown(event)) {
            return true;
          }

          if (handleEditorShortcut(event, commands.value)) {
            return true;
          }

          if (
            event.key === '/'
            && !event.altKey
            && !event.ctrlKey
            && !event.metaKey
            && !event.isComposing
            && canOpenSlash()
          ) {
            event.preventDefault();

            return openSlash();
          }

          return false;
        },
      },
      onCreate: ({ editor: createdEditor }) => {
        commands.value = createDefaultCommandRegistry(createdEditor);
        updateEditorState(createdEditor);
        syncHiddenInputValue(normalizeDocument(props.document), props.input);
      },
      onBlur: ({ editor: blurredEditor }) => {
        scheduleClearHoveredBlock();
        updateEditorState(blurredEditor);
      },
      onFocus: ({ editor: focusedEditor }) => updateEditorState(focusedEditor),
      onSelectionUpdate: ({ editor: updatedEditor }) => updateEditorState(updatedEditor),
      onTransaction: ({ editor: transactionEditor }) => updateEditorState(transactionEditor),
      onUpdate: ({ editor: updatedEditor }) => syncHiddenInput(updatedEditor, props.input),
    });

    onBeforeUnmount(() => {
      cancelClearHoverTimer();
    });

    expose({
      blockSelection() {
        return blockSelection.value;
      },
      command(name, payload = {}) {
        return commands.value?.state(name, payload) ?? null;
      },
      commandSnapshot(payloads = {}) {
        return commands.value?.snapshot(payloads) ?? [];
      },
      editor() {
        return editor.value ?? null;
      },
      runCommand(name, payload = {}) {
        return commands.value?.run(name, payload) ?? null;
      },
      selection() {
        return selection.value;
      },
      slashCommand() {
        return slash.value;
      },
      toggleDocumentList(force = null) {
        return setDocumentListOpen(
          typeof force === 'boolean' ? force : !documentListOpen.value,
        );
      },
      toggleInspector(force = null) {
        inspectorOpen.value = typeof force === 'boolean' ? force : !inspectorOpen.value;

        return inspectorOpen.value;
      },
    });

    return () => {
      const toolbarState = contextualToolbarState();
      const documentBlockCount = editor.value?.state?.doc?.childCount ?? 0;
      const trailingBlock = createTopLevelBlockSelectionState(
        editor.value,
        documentBlockCount - 1,
      );

      return h('div', {
        class: 'lb-editor-shell',
        'data-laravel-blocks-shell': '',
      }, [
      h('div', {
        class: 'lb-editor-shell__header',
        'data-laravel-blocks-editor-header': '',
      }, [
        h('div', {
        class: 'lb-editor-shell__header-start',
      }, [
          h(HistoryToolbar, {
            commandRegistry: commands.value,
            editor: editor.value,
            stateVersion: editorStateVersion.value,
          }),
        ]),
        h('div', {
          class: 'lb-editor-shell__header-center',
        }, [
          h('span', {
            class: 'lb-editor-shell__document-title',
            'data-laravel-blocks-document-title': '',
          }, 'Document'),
          h('span', {
            class: 'lb-editor-shell__document-shortcut',
          }, 'Ctrl+K'),
        ]),
        h('div', {
          class: 'lb-editor-shell__header-end',
        }, [
          h(IconButton, {
            'aria-expanded': documentListOpen.value ? 'true' : 'false',
            class: 'lb-editor-shell__document-list-toggle',
            label: 'Toggle document list view',
            pressed: documentListOpen.value,
            title: documentListOpen.value ? 'Hide list view' : 'Show list view',
            variant: documentListOpen.value ? 'primary' : 'ghost',
            'data-laravel-blocks-document-list-toggle': '',
            onClick: () => {
              setDocumentListOpen(!documentListOpen.value);
            },
          }, {
            default: () => h(Icon, { name: 'list' }),
          }),
          h(IconButton, {
            'aria-expanded': inspectorOpen.value ? 'true' : 'false',
            class: 'lb-editor-shell__settings',
            label: 'Toggle settings sidebar',
            pressed: inspectorOpen.value,
            title: inspectorOpen.value ? 'Hide settings' : 'Show settings',
            variant: inspectorOpen.value ? 'primary' : 'ghost',
            'data-laravel-blocks-inspector-toggle': '',
            onClick: () => {
              inspectorOpen.value = !inspectorOpen.value;
            },
          }, {
            default: () => h(Icon, { name: 'settings' }),
          }),
        ]),
      ]),
      h(BlockToolbar, {
        block: toolbarState.block,
        commandRegistry: commands.value,
        editor: editor.value,
        mode: toolbarState.mode,
        selection: selection.value,
        suppressed: slash.value.open,
        onHoverControlsEnter: retainHoverControls,
        onHoverControlsLeave: releaseHoverControls,
        onRequestBlockControls: requestBlockControls,
      }),
      h(SlashCommandMenu, {
        activeIndex: slash.value.activeIndex,
        block: blockSelection.value,
        commandRegistry: commands.value,
        editor: editor.value,
        manifest: props.manifest,
        onInsert: () => closeSlash(),
        open: slash.value.open,
        query: slash.value.query,
      }),
      h('div', {
        class: 'lb-editor-shell__workspace',
      }, [
        h(BlockListView, {
          block: blockSelection.value,
          commandRegistry: commands.value,
          editor: editor.value,
          open: documentListOpen.value,
          stateVersion: editorStateVersion.value,
          onClose: () => setDocumentListOpen(false),
        }),
        editor.value
          ? h(EditorContent, {
            editor: editor.value,
            class: 'lb-editor-shell__content',
            onPointerdown: clearRequestedBlockControls,
            onPointerleave: scheduleClearHoveredBlock,
            onPointermove: updateHoveredBlock,
          })
          : h('div', {
            class: 'lb-editor-shell__loading',
            role: 'status',
          }, 'Loading editor...'),
        h(BlockInspector, {
          block: blockSelection.value,
          commandRegistry: commands.value,
          open: inspectorOpen.value,
          manifest: props.manifest,
        }),
      ]),
      h(BlockInserter, {
        block: trailingBlock,
        commandRegistry: commands.value,
        editor: editor.value,
        manifest: props.manifest,
      }),
      ]);
    };
  },
};

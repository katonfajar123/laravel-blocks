import { EditorContent, useEditor } from '@tiptap/vue-3';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { h, shallowRef } from 'vue';

import {
  BlockInserter,
  BlockInspector,
  BlockToolbar,
  SlashCommandMenu,
  createBlockSelectionState,
  slashCommandItems,
} from '../block-editor/index.js';
import { createDefaultCommandRegistry } from './commands.js';
import { normalizeDocument, toCanonicalJson, toTiptapDocument } from './document.js';
import { HistoryToolbar } from './HistoryToolbar.js';
import { handleHistoryShortcut } from './keyboard-shortcuts.js';
import { createSelectionState } from './selection.js';
import { RichTextToolbar } from '../rich-text/index.js';

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
    const editorStateVersion = shallowRef(0);
    const selection = shallowRef(createSelectionState(null));
    const slash = shallowRef({
      activeIndex: 0,
      open: false,
      query: '',
    });

    function updateEditorState(currentEditor) {
      blockSelection.value = createBlockSelectionState(currentEditor);
      selection.value = createSelectionState(currentEditor);
      editorStateVersion.value += 1;
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
          if (handleSlashKeydown(event)) {
            return true;
          }

          if (handleHistoryShortcut(event, commands.value)) {
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
      onSelectionUpdate: ({ editor: updatedEditor }) => updateEditorState(updatedEditor),
      onTransaction: ({ editor: transactionEditor }) => updateEditorState(transactionEditor),
      onUpdate: ({ editor: updatedEditor }) => syncHiddenInput(updatedEditor, props.input),
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
    });

    return () => h('div', {
      class: 'lb-editor-shell',
      'data-laravel-blocks-shell': '',
    }, [
      h('div', {
        class: 'lb-editor-shell__chrome',
        'aria-hidden': 'true',
      }, props.placeholder),
      h(HistoryToolbar, {
        commandRegistry: commands.value,
        editor: editor.value,
        stateVersion: editorStateVersion.value,
      }),
      h(RichTextToolbar, {
        commandRegistry: commands.value,
        editor: editor.value,
        selection: selection.value,
      }),
      h(BlockToolbar, {
        block: blockSelection.value,
        commandRegistry: commands.value,
        editor: editor.value,
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
        editor.value
          ? h(EditorContent, {
            editor: editor.value,
            class: 'lb-editor-shell__content',
          })
          : h('div', {
            class: 'lb-editor-shell__loading',
            role: 'status',
          }, 'Loading editor...'),
        h(BlockInspector, {
          block: blockSelection.value,
          commandRegistry: commands.value,
          manifest: props.manifest,
        }),
      ]),
      h(BlockInserter, {
        block: blockSelection.value,
        commandRegistry: commands.value,
        manifest: props.manifest,
      }),
    ]);
  },
};

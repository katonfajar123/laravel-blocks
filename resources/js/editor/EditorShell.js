import { EditorContent, useEditor } from '@tiptap/vue-3';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { h, shallowRef } from 'vue';

import { BlockInserter, BlockToolbar, createBlockSelectionState } from '../block-editor/index.js';
import { createDefaultCommandRegistry } from './commands.js';
import { normalizeDocument, toCanonicalJson, toTiptapDocument } from './document.js';
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
    const selection = shallowRef(createSelectionState(null));

    function updateEditorState(currentEditor) {
      blockSelection.value = createBlockSelectionState(currentEditor);
      selection.value = createSelectionState(currentEditor);
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
    });

    return () => h('div', {
      class: 'lb-editor-shell',
      'data-laravel-blocks-shell': '',
    }, [
      h('div', {
        class: 'lb-editor-shell__chrome',
        'aria-hidden': 'true',
      }, props.placeholder),
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
      editor.value
        ? h(EditorContent, {
          editor: editor.value,
          class: 'lb-editor-shell__content',
        })
        : h('div', {
          class: 'lb-editor-shell__loading',
          role: 'status',
        }, 'Loading editor...'),
      h(BlockInserter, {
        block: blockSelection.value,
        commandRegistry: commands.value,
        manifest: props.manifest,
      }),
    ]);
  },
};

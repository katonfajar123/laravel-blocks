import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { h } from 'vue';

import { normalizeDocument, toCanonicalJson, toTiptapDocument } from './document.js';

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
    placeholder: {
      type: String,
      default: 'Start writing or type / to choose a block',
    },
  },
  setup(props) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          history: false,
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
      onCreate: () => syncHiddenInputValue(normalizeDocument(props.document), props.input),
      onUpdate: ({ editor: updatedEditor }) => syncHiddenInput(updatedEditor, props.input),
    });

    return () => h('div', {
      class: 'lb-editor-shell',
      'data-laravel-blocks-shell': '',
    }, [
      h('div', {
        class: 'lb-editor-shell__chrome',
        'aria-hidden': 'true',
      }, props.placeholder),
      editor.value
        ? h(EditorContent, {
          editor: editor.value,
          class: 'lb-editor-shell__content',
        })
        : h('div', {
          class: 'lb-editor-shell__loading',
          role: 'status',
        }, 'Loading editor...'),
    ]);
  },
};

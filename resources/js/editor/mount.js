import { createApp } from 'vue';

import { EditorShell } from './EditorShell.js';
import { normalizeDocument } from './document.js';

const API_KEY = '__laravelBlocksEditor';

function payloadElement(root) {
  return root.querySelector('[data-laravel-blocks-payload]');
}

function inputElement(root) {
  return root.querySelector('[data-laravel-blocks-input]');
}

function mountElement(root) {
  return root.querySelector('[data-laravel-blocks-mount]');
}

export function readEditorPayload(root) {
  const element = payloadElement(root);

  if (!element) {
    throw new Error('Laravel Blocks editor payload element is missing.');
  }

  const payload = JSON.parse(element.textContent || '{}');

  return {
    id: String(payload.id || ''),
    name: String(payload.name || ''),
    document: normalizeDocument(payload.document ?? null),
    manifest: payload.manifest && typeof payload.manifest === 'object'
      ? payload.manifest
      : { manifestVersion: 1, documentSchemaVersion: 1, categories: [], blocks: [] },
    placeholder: typeof payload.placeholder === 'string' && payload.placeholder.trim() !== ''
      ? payload.placeholder
      : 'Start writing or type / to choose a block',
  };
}

export function mountLaravelBlocksEditor(root) {
  if (!root || root[API_KEY]) {
    return root?.[API_KEY] ?? null;
  }

  const input = inputElement(root);
  const target = mountElement(root);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Laravel Blocks editor hidden input is missing.');
  }

  if (!(target instanceof HTMLElement)) {
    throw new Error('Laravel Blocks editor mount element is missing.');
  }

  const payload = readEditorPayload(root);
  const app = createApp(EditorShell, {
    document: payload.document,
    input,
    manifest: payload.manifest,
    placeholder: payload.placeholder,
  });

  const component = app.mount(target);

  root.dataset.laravelBlocksMounted = 'true';
  root[API_KEY] = Object.freeze({
    app,
    command(name, payload = {}) {
      return component.command(name, payload);
    },
    commandSnapshot(payloads = {}) {
      return component.commandSnapshot(payloads);
    },
    blockSelection() {
      return component.blockSelection();
    },
    commands: Object.freeze({
      run(name, payload = {}) {
        return component.runCommand(name, payload);
      },
      state(name, payload = {}) {
        return component.command(name, payload);
      },
      snapshot(payloads = {}) {
        return component.commandSnapshot(payloads);
      },
    }),
    editor() {
      return component.editor();
    },
    input,
    payload,
    runCommand(name, payload = {}) {
      return component.runCommand(name, payload);
    },
    selection() {
      return component.selection();
    },
  });

  return root[API_KEY];
}

export function mountLaravelBlocksEditors(ownerDocument = document) {
  return [...ownerDocument.querySelectorAll('[data-laravel-blocks-editor]')]
    .map((root) => mountLaravelBlocksEditor(root))
    .filter(Boolean);
}

export function bootLaravelBlocksEditors() {
  if (typeof document === 'undefined') {
    return [];
  }

  return mountLaravelBlocksEditors(document);
}

export function bootWhenReady() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLaravelBlocksEditors, { once: true });

    return;
  }

  bootLaravelBlocksEditors();
}

import { describe, expect, it } from 'vitest';

import {
  emptyDocument,
  normalizeDocument,
  toCanonicalDocument,
  toCanonicalJson,
  toTiptapDocument,
} from '../../resources/js/editor/document.js';

describe('editor document helpers', () => {
  it('normalizes null to canonical document JSON', () => {
    expect(normalizeDocument(null)).toEqual(emptyDocument);
    expect(toCanonicalJson(null)).toBe('{"type":"doc","attrs":{"schemaVersion":1},"content":[]}');
  });

  it('normalizes canonical JSON strings and strips root attrs before passing content to Tiptap', () => {
    const document = {
      type: 'doc',
      attrs: { schemaVersion: 1 },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };

    expect(normalizeDocument(JSON.stringify(document))).toEqual(document);
    expect(toTiptapDocument(document)).toEqual({
      type: 'doc',
      content: document.content,
    });
  });

  it('adds canonical schema metadata back to Tiptap JSON output', () => {
    expect(toCanonicalDocument({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })).toEqual({
      type: 'doc',
      attrs: { schemaVersion: 1 },
      content: [{ type: 'paragraph' }],
    });
  });

  it('rejects unsupported editor payload boundaries', () => {
    expect(() => normalizeDocument([])).toThrow(/document object/);
    expect(() => normalizeDocument({ type: 'doc', attrs: { schemaVersion: 2 }, content: [] }))
      .toThrow(/unsupported/);
    expect(() => normalizeDocument({ type: 'page', attrs: { schemaVersion: 1 }, content: [] }))
      .toThrow(/root type/);
    expect(() => normalizeDocument({ type: 'doc', attrs: { schemaVersion: 1 }, content: {} }))
      .toThrow(/content must be a list/);
  });
});

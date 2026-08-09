import { describe, expect, it } from 'vitest';

import {
  createDefaultLinkProvider,
  currentLinkForm,
  linkAttributes,
  linkErrorMessage,
  normalizeLinkHref,
  validateLinkHref,
} from '../../resources/js/rich-text/index.js';

describe('rich text link provider boundary', () => {
  it('normalizes shorthand external URLs to https', () => {
    expect(normalizeLinkHref('example.com/docs')).toBe('https://example.com/docs');
    expect(normalizeLinkHref(' https://example.com ')).toBe('https://example.com');
  });

  it('validates safe absolute, relative, and anchor hrefs', () => {
    expect(validateLinkHref('https://example.com')).toMatchObject({
      href: 'https://example.com',
      valid: true,
    });
    expect(validateLinkHref('/docs')).toMatchObject({
      href: '/docs',
      valid: true,
    });
    expect(validateLinkHref('#section')).toMatchObject({
      href: '#section',
      valid: true,
    });
  });

  it('rejects empty, invalid, and unsafe hrefs', () => {
    expect(validateLinkHref('')).toMatchObject({
      reason: 'empty',
      valid: false,
    });
    expect(validateLinkHref('https://exa mple.com')).toMatchObject({
      reason: 'invalid_url',
      valid: false,
    });
    expect(validateLinkHref('javascript:alert(1)')).toMatchObject({
      reason: 'unsafe_scheme',
      valid: false,
    });
  });

  it('creates canonical link attrs with target metadata', () => {
    expect(linkAttributes({
      href: 'example.com',
      openInNewTab: true,
    })).toMatchObject({
      attrs: {
        href: 'https://example.com',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
      valid: true,
    });
  });

  it('exposes provider validation and future async search boundary', async () => {
    const provider = createDefaultLinkProvider({
      search: async (query) => [{ title: query, url: `/search/${query}` }],
    });

    await expect(provider.search('docs')).resolves.toEqual([
      { title: 'docs', url: '/search/docs' },
    ]);
    expect(provider.validate('mailto:hello@example.com')).toMatchObject({
      valid: true,
    });
  });

  it('maps validation reasons to user-facing messages', () => {
    expect(linkErrorMessage('empty')).toContain('URL');
    expect(linkErrorMessage('unsafe_scheme')).toContain('http');
  });

  it('reads the current editor link mark into form state', () => {
    expect(currentLinkForm({
      getAttributes: () => ({
        href: 'https://example.com',
        target: '_blank',
      }),
    })).toEqual({
      href: 'https://example.com',
      openInNewTab: true,
    });
  });
});

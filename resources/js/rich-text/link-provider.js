const absoluteSchemes = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function normalizeLinkHref(value) {
  const raw = String(value ?? '').trim();

  if (raw === '') {
    return '';
  }

  if (raw.startsWith('/') || raw.startsWith('#')) {
    return raw;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

export function validateLinkHref(value) {
  const href = normalizeLinkHref(value);

  if (href === '') {
    return Object.freeze({
      href,
      reason: 'empty',
      valid: false,
    });
  }

  if (href.startsWith('/') || href.startsWith('#')) {
    return Object.freeze({
      href,
      reason: null,
      valid: true,
    });
  }

  try {
    const url = new URL(href);

    if (!absoluteSchemes.has(url.protocol)) {
      return Object.freeze({
        href,
        reason: 'unsafe_scheme',
        valid: false,
      });
    }

    return Object.freeze({
      href,
      reason: null,
      valid: true,
    });
  } catch {
    return Object.freeze({
      href,
      reason: 'invalid_url',
      valid: false,
    });
  }
}

export function linkAttributes({ href, openInNewTab = false } = {}) {
  const validation = validateLinkHref(href);

  if (!validation.valid) {
    return Object.freeze({
      attrs: null,
      ...validation,
    });
  }

  return Object.freeze({
    ...validation,
    attrs: Object.freeze({
      href: validation.href,
      rel: openInNewTab ? 'noopener noreferrer' : null,
      target: openInNewTab ? '_blank' : null,
    }),
  });
}

export function createDefaultLinkProvider({
  search = async () => [],
  validate = validateLinkHref,
} = {}) {
  return Object.freeze({
    async search(query) {
      return search(String(query ?? ''));
    },
    validate,
  });
}

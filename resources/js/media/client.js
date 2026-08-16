export class MediaClientError extends Error {
  constructor(code, message, { fields = {}, retryable = false, status = 0 } = {}) {
    super(message);
    this.name = 'MediaClientError';
    this.code = code;
    this.fields = fields;
    this.retryable = retryable;
    this.status = status;
  }
}

export function normalizeMediaTransport(value) {
  const enabled = value?.enabled === true;

  if (!enabled) {
    return Object.freeze({ enabled: false });
  }

  const browseUrl = typeof value.browseUrl === 'string' ? value.browseUrl.trim() : '';
  const uploadUrl = typeof value.uploadUrl === 'string' ? value.uploadUrl.trim() : '';

  if (browseUrl === '' || uploadUrl === '') {
    return Object.freeze({ enabled: false });
  }

  return Object.freeze({
    browseUrl,
    capabilities: normalizeCapabilities(value.capabilities),
    csrfToken: typeof value.csrfToken === 'string' ? value.csrfToken : '',
    enabled: true,
    uploadUrl,
  });
}

export function normalizeCapabilities(value) {
  const allowedMimeTypes = Array.isArray(value?.allowedMimeTypes)
    ? value.allowedMimeTypes.filter((mimeType) => typeof mimeType === 'string')
    : [];

  return Object.freeze({
    allowedMimeTypes: Object.freeze([...new Set(allowedMimeTypes)]),
    browse: value?.browse !== false,
    delete: value?.delete === true,
    maxUploadBytes: Number.isInteger(value?.maxUploadBytes) ? value.maxUploadBytes : 0,
    mimeFilter: value?.mimeFilter !== false,
    search: value?.search !== false,
    upload: value?.upload !== false,
  });
}

export function normalizeMediaItem(value) {
  if (!value || typeof value !== 'object') {
    throw new MediaClientError('invalid_media_response', 'The media server returned an invalid item.');
  }

  const url = typeof value.url === 'string' ? value.url : '';
  const mimeType = typeof value.mimeType === 'string' ? value.mimeType : '';
  const id = typeof value.id === 'string' ? value.id : '';

  if (id === '' || !/^https?:\/\//i.test(url) || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mimeType)) {
    throw new MediaClientError('invalid_media_response', 'The media server returned an invalid item.');
  }

  return Object.freeze({
    alt: typeof value.alt === 'string' ? value.alt : null,
    bytes: Number.isInteger(value.bytes) && value.bytes >= 0 ? value.bytes : 0,
    caption: typeof value.caption === 'string' ? value.caption : null,
    height: Number.isInteger(value.height) && value.height > 0 ? value.height : null,
    id,
    lastModified: Number.isInteger(value.lastModified) ? value.lastModified : null,
    mimeType,
    originalName: typeof value.originalName === 'string' ? value.originalName : null,
    provider: typeof value.provider === 'string' ? value.provider : '',
    url,
    width: Number.isInteger(value.width) && value.width > 0 ? value.width : null,
  });
}

function errorFromPayload(payload, status) {
  const code = typeof payload?.error?.code === 'string' ? payload.error.code : 'media_request_failed';
  const message = typeof payload?.error?.message === 'string'
    ? payload.error.message
    : 'The media request could not be completed.';

  return new MediaClientError(code, message, {
    fields: payload?.error?.fields && typeof payload.error.fields === 'object'
      ? payload.error.fields
      : {},
    retryable: status === 0 || status === 408 || status === 429 || status >= 500,
    status,
  });
}

async function responsePayload(response) {
  try {
    return await response.json();
  } catch {
    throw new MediaClientError('invalid_media_response', 'The media server returned an unreadable response.', {
      retryable: response.status >= 500,
      status: response.status,
    });
  }
}

function browseUrl(endpoint, query) {
  const url = new URL(endpoint, globalThis.location?.href ?? 'http://localhost');

  if (query.search) {
    url.searchParams.set('search', query.search);
  }

  for (const mimeType of query.mimeTypes ?? []) {
    url.searchParams.append('mimeTypes[]', mimeType);
  }

  url.searchParams.set('page', String(query.page ?? 1));
  url.searchParams.set('perPage', String(query.perPage ?? 24));

  return url.toString();
}

export function createMediaClient(transport, dependencies = {}) {
  const config = normalizeMediaTransport(transport);
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const xhrFactory = dependencies.xhrFactory ?? (() => new XMLHttpRequest());

  if (!config.enabled) {
    throw new MediaClientError('media_transport_disabled', 'The media transport is not enabled.');
  }

  return Object.freeze({
    async browse(query = {}, { signal } = {}) {
      if (typeof fetchImpl !== 'function') {
        throw new MediaClientError('media_transport_unavailable', 'The browser cannot reach the media service.');
      }

      let response;

      try {
        response = await fetchImpl(browseUrl(config.browseUrl, query), {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal,
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new MediaClientError('media_request_cancelled', 'The media request was cancelled.');
        }

        throw new MediaClientError('media_network_error', 'The media library could not be reached.', {
          retryable: true,
        });
      }

      const payload = await responsePayload(response);

      if (!response.ok) {
        throw errorFromPayload(payload, response.status);
      }

      const page = payload?.data?.page;

      if (!page || !Array.isArray(page.items)) {
        throw new MediaClientError('invalid_media_response', 'The media server returned an invalid page.');
      }

      return Object.freeze({
        capabilities: normalizeCapabilities(payload.data.capabilities),
        hasMore: page.hasMore === true,
        items: Object.freeze(page.items.map(normalizeMediaItem)),
        page: Number.isInteger(page.page) ? page.page : 1,
        perPage: Number.isInteger(page.perPage) ? page.perPage : 24,
        provider: typeof payload.data.provider === 'string' ? payload.data.provider : '',
        total: Number.isInteger(page.total) ? page.total : page.items.length,
      });
    },

    upload(file, { onProgress = () => {}, signal } = {}) {
      return new Promise((resolve, reject) => {
        const xhr = xhrFactory();
        const form = new FormData();
        form.append('file', file);
        xhr.open('POST', config.uploadUrl);
        xhr.responseType = 'json';
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');

        if (config.csrfToken) {
          xhr.setRequestHeader('X-CSRF-TOKEN', config.csrfToken);
        }

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          const payload = xhr.response && typeof xhr.response === 'object'
            ? xhr.response
            : (() => {
              try {
                return JSON.parse(xhr.responseText || '{}');
              } catch {
                return {};
              }
            })();

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(errorFromPayload(payload, xhr.status));

            return;
          }

          try {
            resolve(normalizeMediaItem(payload?.data?.item));
          } catch (error) {
            reject(error);
          }
        });
        xhr.addEventListener('error', () => reject(new MediaClientError(
          'media_network_error',
          'The media upload could not reach the server.',
          { retryable: true },
        )));
        xhr.addEventListener('abort', () => reject(new MediaClientError(
          'media_request_cancelled',
          'The media upload was cancelled.',
        )));

        if (signal) {
          if (signal.aborted) {
            xhr.abort();
          } else {
            signal.addEventListener('abort', () => xhr.abort(), { once: true });
          }
        }

        onProgress(0);
        xhr.send(form);
      });
    },
  });
}

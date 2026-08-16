import { describe, expect, it, vi } from 'vitest';

import {
  MediaClientError,
  createMediaClient,
  mediaContextForBlock,
  mediaItemMatchesContext,
  mediaMimeTypes,
  normalizeMediaItem,
  normalizeMediaTransport,
} from '../../resources/js/media/index.js';

const transport = {
  enabled: true,
  browseUrl: 'https://example.test/laravel-blocks/media',
  uploadUrl: 'https://example.test/laravel-blocks/media',
  csrfToken: 'token-123',
  capabilities: {
    browse: true,
    search: true,
    mimeFilter: true,
    upload: true,
    delete: false,
    maxUploadBytes: 1024,
    allowedMimeTypes: ['image/png', 'video/mp4', 'video/webm'],
  },
};

const item = {
  id: 'photo.png',
  provider: 'fixture',
  url: 'https://media.example.test/photo.png',
  mimeType: 'image/png',
  bytes: 128,
  originalName: 'Photo.png',
  width: 20,
  height: 10,
  alt: 'A photo',
  caption: null,
  lastModified: 10,
};

describe('media client', () => {
  it('normalizes only complete enabled transport and safe media values', () => {
    expect(normalizeMediaTransport({ enabled: true })).toEqual({ enabled: false });
    expect(normalizeMediaTransport(transport)).toMatchObject({
      enabled: true,
      csrfToken: 'token-123',
    });
    expect(normalizeMediaItem(item)).toMatchObject(item);
    expect(() => normalizeMediaItem({ ...item, url: 'javascript:alert(1)' }))
      .toThrow(MediaClientError);
  });

  it('routes package media blocks through immutable MIME-specific contexts', () => {
    const imageContext = mediaContextForBlock({ type: 'image' });
    const videoContext = mediaContextForBlock({ type: 'video' });
    const videoItem = {
      ...item,
      id: 'movie.mp4',
      mimeType: 'video/mp4',
      url: 'https://media.example.test/movie.mp4',
    };

    expect(imageContext).toMatchObject({ commandName: 'setImageMedia', noun: 'image' });
    expect(videoContext).toMatchObject({ commandName: 'setVideoMedia', noun: 'video' });
    expect(mediaContextForBlock({ type: 'file' })).toBeNull();
    expect(mediaMimeTypes(videoContext, transport.capabilities)).toEqual(['video/mp4', 'video/webm']);
    expect(mediaItemMatchesContext(videoItem, videoContext)).toBe(true);
    expect(mediaItemMatchesContext(item, videoContext)).toBe(false);
    expect(Object.isFrozen(videoContext)).toBe(true);
  });

  it('browses with bounded query parameters and normalizes the response', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          provider: 'fixture',
          capabilities: transport.capabilities,
          page: {
            items: [item],
            page: 2,
            perPage: 12,
            total: 20,
            hasMore: true,
          },
        },
      }),
    }));
    const client = createMediaClient(transport, { fetchImpl });
    const result = await client.browse({
      mimeTypes: ['image/png'],
      page: 2,
      perPage: 12,
      search: 'hero',
    });
    const requested = new URL(fetchImpl.mock.calls[0][0]);

    expect(requested.searchParams.get('search')).toBe('hero');
    expect(requested.searchParams.getAll('mimeTypes[]')).toEqual(['image/png']);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject(item);
    expect(result.hasMore).toBe(true);
  });

  it('turns safe server error envelopes into retryable typed failures', async () => {
    const client = createMediaClient(transport, {
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 'storage_failure',
            message: 'The media provider is temporarily unavailable.',
          },
        }),
      }),
    });

    await expect(client.browse()).rejects.toMatchObject({
      code: 'storage_failure',
      retryable: true,
      status: 503,
    });
  });
});

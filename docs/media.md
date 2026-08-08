# Media

## Goal

Laravel Blocks must provide a useful default media workflow without coupling documents to one storage provider or media-library package.

## Contract

The initial contract is conceptually:

```php
namespace KatonFajar\LaravelBlocks\Contracts;

use Illuminate\Http\UploadedFile;

interface MediaManager
{
    public function browse(array $filters = []): mixed;

    public function upload(UploadedFile $file): mixed;

    public function delete(mixed $media): void;

    public function url(mixed $media): string;
}
```

This signature is not yet final. Returning `mixed` makes adapters easy but weakens interoperability; a small normalized media value object is preferred for `0.3`.

## Normalized media value

The editor and blocks need stable metadata regardless of adapter. A future value object should cover at least:

- an optional provider-defined stable identifier;
- URL and optional temporary URL expiry;
- MIME type;
- original filename;
- byte size;
- width and height where applicable;
- alt text and caption when stored by the adapter;
- adapter/disk identity when identifiers are not globally unique.

Sensitive storage paths and credentials MUST never enter document JSON.

Depending on the selected provider, an image node MAY store a provider URL or a stable media reference plus presentation metadata. Stable references are preferred when the provider supports them, but URL-only adapters remain valid.

## Database ownership

Laravel Blocks core does not require a media database or media Eloquent model. The default Laravel Filesystem adapter can operate without either. Applications that use an existing Media model, Spatie Media Library, Cloudinary, or another provider retain ownership of that provider's metadata and database schema.

## Default adapter

The default implementation uses Laravel Filesystem with a configured disk and directory:

```php
'media' => [
    'disk' => 'public',
    'directory' => 'laravel-blocks',
    'max_size' => 10 * 1024,
],
```

Files SHOULD receive generated storage names. Original filenames may be retained as metadata but must not be trusted as paths.

## Future adapters

Possible adapters include:

- Spatie Media Library;
- Amazon S3;
- Cloudflare R2;
- Cloudinary;
- application-defined media managers.

These adapters should live outside the core package when they require third-party dependencies.

## Editor operations

The default editor MUST provide a provider-backed media picker with:

- browse and search;
- upload and drag-and-drop upload;
- selection and replacement;
- metadata editing where supported;
- progress, cancellation, and clear failure states;
- restrictions by accepted MIME family and block type;
- permission-aware actions, retry behavior, accessible focus restoration, and alternative-text guidance for images.

Deletion is not a normal block-edit operation. Removing an image block must not automatically delete the underlying media object because it may be reused elsewhere.

## Upload security

The server MUST enforce:

- authenticated and authorized upload endpoints;
- CSRF protection for browser requests;
- maximum request and file sizes;
- MIME detection based on file contents, not only extension or browser headers;
- per-field allowed MIME types;
- generated safe storage paths;
- SVG denial or sanitization;
- rate limits and storage quotas where appropriate;
- image decoding safeguards against decompression bombs;
- response data that omits private paths and credentials.

Malware scanning is deployment-specific but the adapter contract SHOULD allow applications to quarantine or reject files.

## Private media

A document cannot assume every media URL is permanent or public. Private adapters may return signed URLs. Rendering and caching must account for URL expiry. When a provider supplies a stable reference, canonical nodes should retain it instead of the expiring URL; URL-only providers must define a safe refresh or persistence policy.

## Orphan handling

The package should expose reference discovery so an application can identify unused media, but it MUST NOT delete media automatically without an explicit policy. References can exist in drafts, reusable blocks, patterns, revisions, or records outside the current model.

## Missing media

Adapters must define a not-found result. Editor preview should show a recoverable placeholder. Frontend rendering should use configured fallback behavior and preserve accessible alternative text when possible.

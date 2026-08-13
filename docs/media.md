# Media

## Goal

Laravel Blocks must provide a useful default media workflow without coupling documents to one storage provider or media-library package.

## Implemented contract

The package binds this interface as a replaceable singleton:

```php
namespace KatonFajar\LaravelBlocks\Media\Contracts;

use Illuminate\Http\UploadedFile;
use KatonFajar\LaravelBlocks\Media\MediaCapabilities;
use KatonFajar\LaravelBlocks\Media\MediaItem;
use KatonFajar\LaravelBlocks\Media\MediaPage;
use KatonFajar\LaravelBlocks\Media\MediaQuery;

interface MediaProvider
{
    public function name(): string;

    public function capabilities(): MediaCapabilities;

    public function browse(?MediaQuery $query = null): MediaPage;

    public function find(string $id): ?MediaItem;

    public function upload(UploadedFile $file): MediaItem;

    public function delete(string $id): void;
}
```

Resolve it directly or through the facade:

```php
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks;
use KatonFajar\LaravelBlocks\Media\MediaQuery;

$provider = LaravelBlocks::media();
$page = $provider->browse(new MediaQuery(search: 'hero', mimeTypes: ['image/jpeg']));
```

Provider failures use `MediaException` with a machine-readable `reason()` and optional `mediaId()`. Missing `find()` results return `null`; deleting a missing item is an explicit `media_not_found` failure.

## Normalized media value

`MediaItem` provides normalized JSON-serializable metadata regardless of adapter:

- a provider-scoped stable identifier and provider name;
- a public HTTP(S) URL;
- MIME type;
- original filename;
- byte size;
- width and height where applicable;
- alt text and caption when stored by the adapter;
- last-modified time where available.

The current value also reserves nullable alternative text and caption metadata. Sensitive storage paths and credentials are not part of the contract. Private temporary URL expiry and canonical stable media references remain future additions and must not be inferred from the current value.

Depending on the selected provider, an image node MAY store a provider URL or a stable media reference plus presentation metadata. Stable references are preferred when the provider supports them, but URL-only adapters remain valid.

## Database ownership

Laravel Blocks core does not require a media database or media Eloquent model. The default Laravel Filesystem adapter can operate without either. Applications that use an existing Media model, Spatie Media Library, Cloudinary, or another provider retain ownership of that provider's metadata and database schema.

## Default adapter

The default implementation uses Laravel Filesystem with a configured disk and directory:

```php
'media' => [
    'provider' => \KatonFajar\LaravelBlocks\Media\LaravelFilesystemMediaProvider::class,
    'disk' => 'public',
    'directory' => 'laravel-blocks',
    'visibility' => 'public',
    'max_upload_bytes' => 10_485_760,
    'max_image_pixels' => 40_000_000,
    'max_items_per_page' => 100,
    'allowed_mime_types' => [/* trusted MIME allow-list */],
    'extensions' => [/* MIME => generated extension */],
],
```

The disk must provide absolute public HTTP(S) URLs. Files receive random 40-hex-character IDs and trusted extensions selected from content-derived MIME, never from client filenames. Browse is deterministic, supports provider-ID search and MIME filtering, and caps each page at `max_items_per_page`. The zero-database default cannot preserve original-name, dimensions, alt, or caption metadata across a later browse; providers with metadata stores may do so.

Applications replace the default by configuring a container-resolvable `MediaProvider` implementation. Third-party database/storage ownership stays with that provider.

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

The implemented default provider enforces:

- configured file byte limits;
- MIME detection based on file contents, not only extension or browser headers;
- per-field allowed MIME types;
- generated safe storage paths;
- unconditional SVG denial in the default provider;
- image pixel bounds before storage;
- response data that omits private paths and credentials.

M03 must add authenticated and authorized endpoints, CSRF protection, request limits, rate limits, quotas, tenant scoping, and response shaping before exposing this provider to a browser. Calling `upload()` directly does not perform an application authorization decision.

Malware scanning is deployment-specific but the adapter contract SHOULD allow applications to quarantine or reject files.

## Private media

A document cannot assume every media URL is permanent or public. Private adapters may return signed URLs. Rendering and caching must account for URL expiry. When a provider supplies a stable reference, canonical nodes should retain it instead of the expiring URL; URL-only providers must define a safe refresh or persistence policy.

## Orphan handling

The package should expose reference discovery so an application can identify unused media, but it MUST NOT delete media automatically without an explicit policy. References can exist in drafts, reusable blocks, patterns, revisions, or records outside the current model.

## Missing media

The implemented contract returns `null` from `find()` for a missing item and throws `media_not_found` when explicit deletion targets a missing item. Editor preview recovery and frontend fallback behavior remain M03/M04 work.

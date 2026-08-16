# Configuration

## Status

The package merges and publishes a small serializable configuration. Default block and mark registration, document validation limits, renderer unknown-block policy, asset delivery, and the Laravel Filesystem media provider are active; values whose consuming subsystem has not been implemented yet remain inert defaults, not claims that optional persistence or complete editor UX exists.

The implemented file is:

```php
return [
    'blocks' => [
        \KatonFajar\LaravelBlocks\Blocks\Text\Paragraph::class,
        \KatonFajar\LaravelBlocks\Blocks\Text\Heading::class,
        \KatonFajar\LaravelBlocks\Blocks\Text\BulletList::class,
        \KatonFajar\LaravelBlocks\Blocks\Text\OrderedList::class,
        \KatonFajar\LaravelBlocks\Blocks\Text\ListItem::class,
        \KatonFajar\LaravelBlocks\Blocks\Text\Quote::class,
        \KatonFajar\LaravelBlocks\Blocks\Text\Code::class,
        \KatonFajar\LaravelBlocks\Blocks\Media\Image::class,
    ],

    'marks' => [
        'bold',
        'italic',
        'link',
    ],

    'document' => [
        'max_bytes' => 1_048_576,
        'max_nodes' => 10_000,
        'max_depth' => 32,
        'max_text_bytes' => 262_144,
        'max_attribute_bytes' => 65_536,
        'unknown_blocks' => 'throw',
    ],

    'assets' => [
        'auto_inject' => true,
        'base_url' => null,
    ],

    'media' => [
        'provider' => \KatonFajar\LaravelBlocks\Media\LaravelFilesystemMediaProvider::class,
        'disk' => 'public',
        'directory' => 'laravel-blocks',
        'visibility' => 'public',
        'max_upload_bytes' => 10_485_760,
        'max_image_pixels' => 40_000_000,
        'max_items_per_page' => 100,
        'allowed_mime_types' => [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf',
        ],
        'extensions' => [
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif',
            'image/webp' => 'webp', 'image/avif' => 'avif',
            'video/mp4' => 'mp4', 'video/webm' => 'webm',
            'audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/ogg' => 'ogg',
            'application/pdf' => 'pdf',
        ],
        'transport' => [
            'enabled' => true,
            'prefix' => 'laravel-blocks/media',
            'name_prefix' => 'laravel-blocks.media.',
            'middleware' => ['web', 'auth'],
            'abilities' => [
                'browse' => 'laravel-blocks.media.browse',
                'upload' => 'laravel-blocks.media.upload',
            ],
            'browse_requests_per_minute' => 60,
            'upload_requests_per_minute' => 10,
        ],
    ],

    'persistence' => [
        'reusable_blocks' => [
            'enabled' => false,
            'repository' => null,
        ],
        'custom_patterns' => [
            'enabled' => false,
            'repository' => null,
        ],
    ],
];
```

Testbench verifies merge behavior, serialization, default Paragraph/Heading/List/Quote/Code/Image and current editor mark registration, active document limits, renderer and asset behavior, media provider replacement/security/storage operations, installer idempotency, and publish groups. The `document.unknown_blocks` values/default and precompiled asset-loading boundary are frozen contracts.

## Planned expanded configuration

Keys below remain target configuration. Non-frozen keys may change before their owning milestone.

```php
return [
    'document' => [
        'unknown_blocks' => 'throw',
    ],

    'blocks' => [
        'defaults' => true,
        'enabled' => null,
    ],

    'editor' => [
        'fullscreen' => true,
        'slash_commands' => true,
        'drag_and_drop' => true,
        'block_sidebar' => true,
        'document_outline' => true,
        'autosave' => false,
    ],

    'assets' => [
        'auto_inject' => true,
        'base_url' => null,
    ],

    'persistence' => [
        'reusable_blocks' => [
            'enabled' => false,
            'repository' => null,
        ],

        'custom_patterns' => [
            'enabled' => false,
            'repository' => null,
        ],
    ],

    'design' => [
        'colors' => [
            'primary' => '#2563EB',
            'secondary' => '#0F172A',
            'muted' => '#64748B',
        ],

        'spacing' => [
            'xs' => '0.5rem',
            'sm' => '1rem',
            'md' => '2rem',
            'lg' => '4rem',
        ],

        'breakpoints' => [
            'mobile' => 640,
            'tablet' => 768,
            'desktop' => 1024,
        ],
    ],

    'security' => [
        'allow_raw_html' => false,
        'sanitize_output' => true,
    ],
];
```

## Document format vs. persistence

Tiptap JSON is the canonical Laravel Blocks document format. It is not a database driver and is not represented by a configurable `'storage' => 'json'` switch.

The host application chooses where documents live: JSON/JSONB, `TEXT`/`LONGTEXT`, existing models, an external API, or custom persistence. Core configuration does not name an application content model, table, column, or database connection.

The active positive-integer validation limits are:

| Key | Default | Enforced boundary |
| --- | ---: | --- |
| `document.max_bytes` | 1,048,576 | Serialized input/canonical document bytes |
| `document.max_nodes` | 10,000 | All non-root block and text nodes |
| `document.max_depth` | 32 | Direct root children start at depth 1 |
| `document.max_text_bytes` | 262,144 | Cumulative UTF-8 text bytes |
| `document.max_attribute_bytes` | 65,536 | Serialized attributes for each node or mark |

Missing, non-integer, or non-positive values fall back to those defaults. The `document` configuration controls validation and rendering behavior only. It does not cause Laravel Blocks to persist content.

`document.unknown_blocks` accepts exactly `throw`, `placeholder`, or `skip`; `throw` is the deterministic default. The renderer enforces this policy while still rejecting malformed known content and malformed unknown recovery nodes. Schema version is a document contract and MUST NOT be configurable per application.

The implemented asset resolver uses `assets.base_url` when applications need a CDN or non-default public path; otherwise URLs point at `/vendor/laravel-blocks`. The implemented `assets.auto_inject` editor behavior loads published, versioned package CSS and deferred JavaScript once per page when enabled. `base_url` and auto-injection opt-out are advanced deployment controls; they do not make host Node.js, npm, Vue, Tiptap, or Vite setup part of the default installation.

## Optional shared persistence

The `persistence` section applies only to optional shared resources such as reusable blocks or editor-managed custom patterns. Both are disabled by default in the proposed configuration.

An application that enables them must either:

- bind a repository implementation backed by its existing infrastructure; or
- explicitly select a package-provided database repository and publish its namespaced migration.

The core installer MUST NOT enable these features, publish their migrations, or run `php artisan migrate`. A custom repository may use Eloquent, another database, an API, or any application-defined store.

## Media provider

The active `media` section configures the default `LaravelFilesystemMediaProvider`. It requires a public Laravel disk whose `url()` result is an absolute HTTP(S) URL. `directory` is a normalized relative path; IDs accepted by this provider are single safe filenames confined below it. `max_upload_bytes`, `max_image_pixels`, and `max_items_per_page` must be positive integers.

Upload MIME is detected from file content through `ext-fileinfo`; the client MIME and original extension are never trusted for storage naming. Every allowed MIME needs a package- or application-controlled extension mapping. SVG is always rejected by this provider because core does not ship an SVG sanitizer. A custom sanitizing provider may implement a different policy.

Replace the provider with a class implementing `KatonFajar\LaravelBlocks\Media\Contracts\MediaProvider`:

```php
'media' => [
    'provider' => App\Media\ApplicationMediaProvider::class,
    // Other keys are consumed only by the default Filesystem provider.
],
```

The provider binding, transport, and normalized results require no Laravel Blocks media table. `media.transport` controls route enablement, URI/name prefixes, host middleware, per-action Gate ability names, and numeric per-minute browse/upload throttles. The defaults register named GET/POST routes at `/laravel-blocks/media` behind `web`, `auth`, explicit package authorization, and throttling.

The host must define both configured abilities; undefined abilities deny access. Keep `web` or provide equivalent session/CSRF protection when changing middleware. Tenant resolution and storage quotas are not inferred by core—add host tenant middleware and/or bind a tenant-scoped provider. Set `transport.enabled` to `false` to omit both routes and the editor picker payload.

## Block selection

The active `blocks` list registers package defaults and controls editor manifest order. Published configuration should use block class strings:

```php
'blocks' => [
    Paragraph::class,
    Heading::class,
    BulletList::class,
    OrderedList::class,
    ListItem::class,
    Quote::class,
    Code::class,
    Image::class,
],
```

Applications can remove entries to ship a smaller authoring surface. Setting `blocks` to an empty array disables package defaults so a service provider can register application blocks explicitly. Application service providers remain the right place for registrations that need runtime objects, callbacks, model classes, or container resolution.

The active `marks` list registers the current editor mark schemas used by the bundled toolbar:

```php
'marks' => [
    'bold',
    'italic',
    'link',
],
```

These schemas allow Paragraph, Heading, Quote-backed text, and list-backed text documents containing Bold, Italic, and absolute `http`, `https`, `mailto`, or `tel` Link marks to validate. Code explicitly accepts no marks. Link mark HTML rendering and relative/anchor URL validation remain separate renderer work.

## Per-editor configuration

Global config supplies defaults. A target fluent API may specialize a particular editor:

```php
LaravelBlocks::make('content')
    ->blocks([
        Paragraph::class,
        Heading::class,
        Image::class,
        Quote::class,
    ])
    ->media()
    ->slashCommands()
    ->dragAndDrop()
    ->patterns()
    ->reusableBlocks()
    ->autosave();
```

The Blade component remains the preferred simple API. Fluent configuration must not create state that leaks between requests, fields, or concurrent workers.

## Design tokens

Editor design controls SHOULD store stable token keys rather than arbitrary computed CSS values. Rendering maps those keys to application-controlled styles.

Changing a token value can update all rendered content without rewriting documents. Removing or renaming a token requires an alias or document-schema transform policy.

## Publishing

The B01 package foundation registers:

```bash
php artisan vendor:publish --tag=laravel-blocks-config
```

Published config should remain small and well-commented. Advanced extensibility belongs in service providers or dedicated classes, not closures inside configuration files.

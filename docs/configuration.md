# Configuration

## Status

The package merges and publishes a small serializable configuration. Document validation limits are active; values whose consuming subsystem has not been implemented yet remain inert defaults, not claims that the renderer, assets, or optional persistence exist.

The implemented file is:

```php
return [
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

Testbench verifies merge behavior, serialization, active document limits, and the `laravel-blocks-config` publish group. The `document.unknown_blocks` values/default and precompiled asset-loading boundary are frozen contracts; their runtime consumers arrive with the renderer and asset-distribution work.

## Planned expanded configuration

Keys below are target configuration, not implemented B01 behavior. Non-frozen keys may change before their owning milestone.

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

    'media' => [
        'disk' => 'public',
        'directory' => 'laravel-blocks',
        'max_size' => 10 * 1024,
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

`document.unknown_blocks` accepts exactly `throw`, `placeholder`, or `skip`; `throw` is the deterministic default. Schema version is a document contract and MUST NOT be configurable per application.

The future `assets.auto_inject` runtime behavior MUST load published, versioned package CSS and deferred JavaScript once per page. `base_url` and auto-injection opt-out are advanced deployment controls; they do not make host Node.js, npm, Vue, Tiptap, or Vite setup part of the default installation.

## Optional shared persistence

The `persistence` section applies only to optional shared resources such as reusable blocks or editor-managed custom patterns. Both are disabled by default in the proposed configuration.

An application that enables them must either:

- bind a repository implementation backed by its existing infrastructure; or
- explicitly select a package-provided database repository and publish its namespaced migration.

The core installer MUST NOT enable these features, publish their migrations, or run `php artisan migrate`. A custom repository may use Eloquent, another database, an API, or any application-defined store.

The `media.disk` setting configures the default Laravel Filesystem adapter. It does not require a Laravel Blocks media table; metadata persistence remains provider-dependent.

## Block selection

Applications should be able to opt into a curated subset. The final API may use block classes directly:

```php
'blocks' => [
    'defaults' => false,
    'enabled' => [
        Paragraph::class,
        Heading::class,
        Image::class,
        Quote::class,
    ],
],
```

Application service providers remain the right place for registrations that need runtime objects, callbacks, model classes, or container resolution.

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

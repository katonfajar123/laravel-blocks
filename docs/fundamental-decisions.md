# Fundamental decisions

## Status

This document records the contracts frozen by `B00 — Implementation Readiness`. They are implementation inputs, not suggestions. A later change requires an explicit architecture decision, synchronized documentation and changelog updates, and a document-schema transform when persisted content is affected.

Laravel Blocks implementation has begun. “Frozen” means each implementation batch must target these contracts; it does not claim that unrelated or later product surfaces are shipped.

## Product contract

Laravel Blocks is a complete Gutenberg-style visual editing experience for Laravel, not a Tiptap wrapper and not an SDK that asks consuming developers to assemble an editor themselves.

The default path is:

```bash
composer require katonfajar/laravel-blocks
php artisan laravel-blocks:install
```

```blade
<x-laravel-blocks::editor
    name="content"
    :value="$post->content"
/>
```

That component MUST render the complete default editing experience defined by the [Editor UX contract](editor-ux-contract.md). Gutenberg is the behavior and quality benchmark; Laravel Blocks does not embed Gutenberg, React, or the `@wordpress/*` package graph.

Benchmark parity means comparable discoverability, interaction quality, editing speed, accessibility, and block-management capability where applicable. It does not mean visual parity. Laravel Blocks MUST follow its own [design principles](design-principles.md), tokens, components, icons, motion, and visual identity.

## Compatibility and ownership

The package baseline is:

- PHP `^8.2`;
- Illuminate `^11.0|^12.0|^13.0`;
- Laravel 11, 12, and 13 as tested host targets;
- Vue 3 and Tiptap 3 as package-internal editor dependencies.

Laravel 13 inherits PHP 8.3+ from its framework constraint. Core code targets the lowest common Laravel 11 API and requires only Illuminate components that implementation proves it uses.

The host application owns its models, content tables, database connections, authorization, content lifecycle, and physical persistence. Core MUST NOT require a package database, content model, table, or migration. JSON/JSONB, `TEXT`/`LONGTEXT`, existing models, external APIs, and custom persistence are equal supported boundaries as long as they losslessly round-trip the canonical document.

Reusable blocks, editor-managed custom patterns, and future shared revision metadata MAY use optional persistence. A package table adapter is explicit, namespaced, replaceable, and never enabled by the core installer.

## Package skeleton boundary

B01 implements a Composer library with these fixed identities:

```text
Composer name      katonfajar/laravel-blocks
Package type       library
License            MIT
PHP namespace      KatonFajar\LaravelBlocks\
Service provider   KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider
```

PSR-4 maps the package namespace to `src/`, and Laravel package discovery registers the service provider. Runtime Composer dependencies start with PHP `^8.2` and only the `illuminate/*` components directly used by the implemented batch, each constrained to `^11.0|^12.0|^13.0`. The package MUST NOT require `laravel/framework` merely for convenience.

The foundational directories are `src/`, `resources/`, `config/`, `tests/`, and `workbench/`; `dist/` becomes the checked release-asset boundary in B07. B01 creates no `database/migrations` content, application model, or later-batch placeholder.

As a reusable Composer library, the repository does not commit `composer.lock`; compatibility CI resolves supported dependency combinations. The maintainer frontend toolchain commits `package-lock.json` so the precompiled release bundle is reproducible and uses `npm ci` after the initial lock is generated.

## Canonical document v1

The canonical root is a Tiptap JSON document with its schema version in root `attrs`:

```json
{
  "type": "doc",
  "attrs": {
    "schemaVersion": 1
  },
  "content": []
}
```

The following rules are fixed for schema v1:

- `type` MUST be `doc` at the root;
- `attrs.schemaVersion` MUST be the integer `1`;
- `content` MUST be an ordered array of valid nodes;
- rendered HTML is derived output and MUST NOT be accepted as a document;
- unknown future schema versions fail with a typed document exception;
- schema upgrades transform JSON directly and never require a database migration or HTML round-trip.

### Public value normalization

The editor component, content component, renderer, and document rule accept an associative array, a non-blank JSON string, or `null`. Internal services operate on `Document`.

`Document::from(...)` is the single normalization boundary:

- `null` becomes the canonical empty v1 document;
- an array is normalized and copied into an immutable `Document` value;
- a non-blank JSON string is decoded with `JSON_THROW_ON_ERROR`, then normalized;
- a missing root `content` normalizes to `[]`, while `toArray()` and `toJson()` always emit the canonical v1 shape;
- blank or malformed JSON, a non-object JSON value, an invalid version, or an unsupported schema version throws `DocumentException` with a machine-readable reason and document path.

The browser editor serializes its hidden form input as one JSON string. The host decides whether to retain that string or decode it for JSON/JSONB storage. Core will provide a `BlockDocument` Laravel validation rule; a package Eloquent cast is optional convenience and MUST NOT become a persistence requirement.

## Stable initial schema names

The first stored node names are:

```text
doc
text
paragraph
heading
bulletList
orderedList
listItem
blockquote
codeBlock
image
```

The first stored mark names are:

```text
bold
italic
underline
strike
code
highlight
link
superscript
subscript
keyboard
```

Persisted names are identifiers, not localized labels or PHP class names. Once a name is emitted by a usable release, renaming it requires a forward document-schema transform.

## Shared block attributes

Selectable block attributes reserve `design` and `advanced` alongside their declared semantic attributes:

```json
{
  "type": "hero",
  "attrs": {
    "heading": "Laravel Blocks",
    "design": {},
    "advanced": {}
  }
}
```

- semantic Content fields map to declared direct attributes, such as `attrs.heading`, or to Tiptap child `content` when the block schema declares inline content;
- `design` contains validated design-token references and constrained presentation values.
- `advanced.anchor`, when present, is a validated unique anchor.
- `advanced.className`, when present, is an ordered array of normalized class tokens.
- `advanced.visibility`, when present, maps configured condition or breakpoint identifiers to booleans; absent keys use application defaults.
- `advanced.attributes`, when present, contains only allow-listed custom attributes.

`design` and `advanced` normalize to empty objects when omitted. Root `doc`, inline `text`, and structural `listItem` nodes do not receive them. A block exposes only keys declared by its `supports()` contract, the names `design` and `advanced` are reserved against custom fields, and undeclared attributes fail server validation.

## PHP block API

The primary extension surface is an abstract `Block` base class. It provides shared defaults and one source of truth for registration, validation, editor metadata, and rendering.

Implemented contract:

```php
abstract class Block
{
    abstract public function name(): string;

    abstract public function label(): string;

    abstract public function view(): string;

    public function description(): ?string
    {
        return null;
    }

    public function category(): string
    {
        return 'custom';
    }

    public function keywords(): array
    {
        return [];
    }

    public function icon(): ?string
    {
        return null;
    }

    public function fields(): array
    {
        return [];
    }

    public function supports(): array
    {
        return [];
    }

    public function schema(): BlockSchema
    {
        return new BlockSchema;
    }

    public function editorComponent(): ?string
    {
        return null;
    }
}
```

`schema()` returns a safe leaf `BlockSchema` by default, and `editorComponent()` returns `null`. The registry resolves block instances from the Laravel container, rejects duplicate stable names, and never persists a PHP class name in document JSON.

The implementation lives under `KatonFajar\LaravelBlocks\Blocks`. Every block also exposes a final `metadata()` method that captures its immutable `BlockMetadata` once per instance. Metadata contains descriptive PHP-side values; manifest serialization and filtering remain a separate boundary.

`BlockRegistry::register(...)` accepts one block instance, one `class-string<Block>`, or an array of either. Class strings resolve through Laravel's container, names must be non-empty lower-camel identifiers, bulk registration is atomic, insertion order is deterministic, and duplicate or unknown names raise typed exceptions carrying `blockName()` context.

`BlockSchema`, `AttributeRule`, and `MarkSchema` are the implemented executable server-validation declarations. They constrain attributes, nesting, child counts, and inline marks independently of the future Field Engine and editor manifest. `LaravelBlocks::validate(...)` returns an immutable validated `Document`; failures expose a machine-readable reason and document path through `DocumentValidationException`.

## Editor manifest v1

PHP is authoritative for registered blocks. It serializes a versioned, JSON-safe manifest for the editor:

```json
{
  "manifestVersion": 1,
  "documentSchemaVersion": 1,
  "categories": [
    {
      "name": "design",
      "label": "Design"
    }
  ],
  "blocks": [
    {
      "name": "hero",
      "label": "Hero",
      "description": null,
      "category": "design",
      "keywords": [],
      "icon": "layout",
      "fields": [
        {
          "name": "heading",
          "path": "attrs.heading",
          "type": "text",
          "group": "content",
          "label": "Heading",
          "help": null,
          "default": null,
          "required": true,
          "constraints": {
            "maxLength": 150
          },
          "ui": {}
        }
      ],
      "supports": {
        "inserter": true,
        "multiple": true,
        "reusable": true,
        "design": {},
        "advanced": {}
      },
      "editor": {
        "mode": "generated",
        "component": null
      }
    }
  ]
}
```

The envelope keys `manifestVersion`, `documentSchemaVersion`, `categories`, and `blocks` are required. Every field entry MUST include its stable `name`, JSON `path`, `type`, UI `group` (`content`, `design`, or `advanced`), localized label/help metadata, default, required state, JSON-safe constraint hints/options, and `ui` metadata. Server rules remain authoritative. PHP callbacks, class/view names, secrets, authorization data, executable validation logic, and arbitrary module URLs MUST NOT leak into the manifest.

`blocks[].name` is identical to the persisted node `type`. The client MUST NOT invent block definitions or validation rules that disagree with the PHP registry. Manifest version changes are independent from document-schema version changes.

An editor that receives an unsupported manifest major version MUST refuse to mount with a clear diagnostic rather than guessing at fields or silently dropping blocks.

The implemented manifest bridge provides immutable manifest value objects plus `LaravelBlocks::editorManifest()`. It serializes registered blocks in deterministic registry order, emits first-seen categories once, keeps the manifest declarative, and rejects unsupported or non-serializable fields/supports through typed manifest exceptions.

## Generated inspector contract

A normal PHP block automatically receives:

- registry and inserter presence;
- a default editable preview;
- Content, Design, and Advanced Inspector tabs generated from its fields and supports;
- client feedback backed by server-authoritative validation;
- serialization into its registered node shape;
- Blade rendering through its registered view.

Consumer-authored Vue is not required for this path. An advanced block MAY return a registered component name from `editorComponent()` and provide a custom Tiptap NodeView. That escape hatch MUST retain the stable node name, manifest, command layer, schema, validation, and serialization contracts. Opting into application-authored editor JavaScript may require an application build integration; the default editor never does.

## Renderer contract

Both public render paths use the same renderer:

```php
LaravelBlocks::render($document);
```

```blade
<x-laravel-blocks::content :content="$document" />
```

`LaravelBlocks::render(array|string|null $document, ?RenderContext $context = null)` returns an immutable `RenderedContent` that implements `Illuminate\Contracts\Support\Htmlable`. Internal renderer services accept `Document`; `RenderedContent::toHtml()` is the only trusted-output signal and MUST only contain output produced by the validated renderer pipeline.

Unknown or currently unavailable node types use exactly one configured policy:

- `throw` — default; throw a typed `UnknownBlockException` with a document path;
- `placeholder` — emit a safe, non-sensitive diagnostic placeholder without rendering node data;
- `skip` — omit the complete unknown-node subtree only when the application explicitly selects tolerant rendering.

Malformed documents, unsafe attributes, and authorization failures are validation/security errors; the unknown-block policy MUST NOT turn them into trusted output. The editor preserves unknown node JSON and shows a non-editable recovery placeholder so an unavailable extension does not silently destroy content.

## Precompiled asset contract

All essential editor JavaScript, CSS, Vue, Tiptap, ProseMirror, positioning logic, and UI primitives MUST ship precompiled in the Composer distribution:

```text
dist/
|-- laravel-blocks.js
|-- laravel-blocks.css
`-- manifest.json
```

`laravel-blocks:install` idempotently publishes versioned assets to `public/vendor/laravel-blocks`, publishes configuration, and changes no database schema. The Blade editor component loads those package assets without depending on the host Vite graph.

A consuming application MUST NOT need Node.js, npm/pnpm/yarn, Vue, Tiptap, ProseMirror, Floating UI, Vite configuration, or a frontend build for the default editor. Package maintainers own source compilation, asset hashing/versioning, browser support, and release-artifact verification.

The implemented B07 boundary commits the `dist/` artifact, generates deterministic SHA-256 manifest metadata during the maintainer build, registers an asset publish group, validates manifest/file integrity at runtime, and exposes asset URLs through the package service/facade plus a small Blade asset component. The implemented editor shell mounts Vue/Tiptap from that bundle, synchronizes a canonical hidden input, and routes current mutations through the shared command layer; editor/assets/content components are package-owned surfaces while frontend block views remain the supported override path. Complete editor UI polish remains a later milestone.

## Command and UI boundaries

All mutation surfaces call one command layer over one selection state. Toolbars, popovers, menus, slash commands, the Inserter, Inspector, List View, keyboard shortcuts, and drag/drop MUST NOT implement competing mutations directly against editor state.

The internal boundaries are:

```text
Core
|-- Block Registry
|-- Document Schema
|-- Validator
`-- Renderer

Editor Engine
|-- Tiptap / ProseMirror
|-- Selection State
|-- Command Registry
`-- History

Editor UI
|-- UI primitives and overlays
|-- block-editor components
`-- rich-text controls

Laravel Bridge
|-- Service Provider and Facade
|-- Blade components
|-- PHP Blocks and Fields
`-- asset and manifest delivery
```

The detailed required behavior is normative in the [Editor UX contract](editor-ux-contract.md).

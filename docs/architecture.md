# Architecture

## Status

This page defines the target architecture. The contracts frozen in [Fundamental decisions](fundamental-decisions.md) are implementation inputs; later batch details may evolve only within those boundaries.

## System context

```text
Laravel application
    |
    +-- <x-laravel-blocks::editor>
    |       |
    |       +-- compiled Editor UI kit and content canvas
    |       +-- Tiptap 3 extensions and node views
    |       +-- ProseMirror document state
    |       +-- shared selection, commands, history, and overlays
    |       +-- block/field definitions serialized by Laravel
    |
    +-- structured Tiptap JSON
    |       |
    |       +-- host-owned JSON / JSONB column
    |       +-- host-owned TEXT / LONGTEXT column
    |       +-- existing application models
    |       +-- external API or custom persistence
    |       +-- API/headless consumers
    |       +-- search/indexing pipelines
    |       +-- document schema transforms
    |
    +-- <x-laravel-blocks::content>
            |
            +-- schema validator
            +-- block registry
            +-- attribute validator
            +-- sanitizer
            +-- Blade renderer
```

## Architectural layers

### Laravel package layer

The PHP layer owns:

- package bootstrapping and asset/view discovery;
- the block and field registries;
- block definitions and validation rules;
- document validation and document-schema transforms;
- server-side rendering;
- media manager contracts;
- Blade component and dynamic block resolution;
- optional editor-managed custom-pattern and reusable-block persistence contracts;
- configuration, commands, events, and authorization hooks.

### Editor engine layer

The internal editor engine owns:

- document state and transactions;
- node and mark extensions;
- Vue node views;
- block insertion, selection, movement, duplication, and nesting;
- the shared selection, command, and history layers;
- serializing the current document to Tiptap JSON.

### Editor UI layer

The package-owned Editor UI layer owns:

- the content canvas, block wrappers, insertion points, and visible selection/drop states;
- contextual block and rich-text toolbars;
- Popover, Tooltip, Dropdown, ContextMenu, Modal, Sidebar, and form primitives;
- the Inserter, slash commands, Block Appender, Inspector, and Document/List View;
- media picking, responsive layout, focus management, and accessible keyboard behavior;
- generated controls driven by the PHP block manifest.

The default UI MUST meet the complete [Editor UX contract](editor-ux-contract.md). Individual blocks MUST reuse the shared command and UI layers instead of implementing private state mutations or one-off overlays.

Vue, Tiptap, ProseMirror, the positioning dependency, UI primitives, and editor CSS are internal build dependencies. All essential assets MUST ship precompiled so the host project needs no Node.js, package-manager dependencies, Vue/Tiptap installation, Vite configuration, or frontend build for the default editor.

### Rendering layer

The renderer transforms persisted JSON into frontend output:

```text
JSON
  -> validate document shape and supported schema
  -> resolve node type in BlockRegistry
  -> validate and normalize attributes
  -> authorize or reject privileged behavior
  -> sanitize values and permitted HTML
  -> render overrideable Blade view/component
  -> HTML
```

Editor node views and frontend Blade views are deliberately separate. Interactive editor markup MUST NOT define the frontend HTML contract.

## Persistence boundary

Laravel Blocks sits inside an existing Laravel application. Core does not own or require the application's database.

```text
EXISTING LARAVEL APPLICATION
|
|-- Existing models and database
|-- Existing authentication and authorization
|-- Existing business logic and content lifecycle
|
`-- Laravel Blocks
    |-- Editor
    |-- Block and field registries
    |-- Validator, serializer, and renderer
    |-- Media contract
    `-- Optional shared persistence
        |-- Reusable blocks
        `-- Editor-managed custom patterns
```

The host application owns:

- models and content tables;
- database connections and physical column types;
- content lifecycle and publication state;
- application authorization and tenancy;
- persistence through Eloquent, query builders, external APIs, or custom infrastructure.

Laravel Blocks owns:

- block editing and editor UX;
- the canonical Tiptap JSON document schema;
- block and field registries;
- validation, normalization, serialization, and rendering;
- custom block APIs and media contracts;
- optional shared-content repository contracts.

Core MUST NOT require package tables, package Eloquent models, or database migrations. JSON and JSONB are recommended for new application fields, but valid Tiptap JSON stored in `TEXT`, `LONGTEXT`, an existing model, an external API, or a custom persistence implementation is equally supported.

Features that require shared state, such as reusable blocks or editor-managed custom patterns, MAY provide optional persistence. Any package-owned migrations for those features MUST be explicitly published or enabled, use namespaced tables, and remain replaceable through repository contracts. The core installer MUST NOT publish or run them automatically.

### Core and optional capability boundary

| Capability | Core requirement |
| --- | --- |
| Laravel 11, 12, and 13 | Yes |
| PHP 8.2+ | Yes |
| Structured Tiptap JSON | Yes |
| Blade renderer | Yes |
| Custom PHP and nested blocks | Yes |
| Built-in block catalog | Yes |
| Package-owned database | No |
| Package-owned content model | No |
| Required database migrations | No |
| Required application Eloquent model | No |

Reusable blocks, editor-managed custom-pattern persistence, media metadata databases, and future shared revision storage are optional and provider-dependent.

## Core services

### `BlockRegistry`

The block registry is the central catalog for built-in and application blocks. It maps a stable document node name to a block definition and rejects every duplicate name. No implicit replacement mechanism exists.

The public block definition is a container-resolved abstract `Block` base class. The registry accepts block instances or class strings, maps stable document names to resolved instances, and rejects duplicates.

Implemented registry responsibilities:

```php
final class BlockRegistry
{
    /**
     * @param class-string<Block>|Block|array<array-key, class-string<Block>|Block> $blocks
     */
    public function register(string|Block|array $blocks): void
    {
        // Resolve through the container, validate, and atomically store by stable name.
    }

    public function get(string $name): Block
    {
        // Return the block or throw UnknownBlockException.
    }

    public function has(string $name): bool
    {
        // Report whether the stable name is registered.
    }

    public function metadata(string $name): BlockMetadata
    {
        // Return the immutable metadata snapshot for the registered block.
    }

    /** @return array<string, Block> */
    public function all(): array
    {
        // Return blocks in deterministic registration order.
    }
}
```

Registration order is deterministic. Names must be non-empty lower-camel identifiers. A failed bulk registration changes no registry state, and duplicate/unknown exceptions expose the relevant name through `blockName()`. The registry is a singleton shared by the package service and facade.

`BlockMetadata` is an immutable per-instance snapshot of descriptive PHP metadata. It does not serialize PHP classes, callbacks, or arbitrary module URLs to the editor; the manifest boundary remains responsible for selecting safe client-facing fields.

### Field registry

Field definitions bridge PHP block configuration into editor controls and server validation. A field type MUST describe at least its key, editor representation, default value, serialization rules, and validation constraints.

### Editor manifest

PHP serializes the registry to declarative Editor Manifest v1 with required `manifestVersion`, `documentSchemaVersion`, `categories`, and `blocks` keys. Each block exposes its stable name, localized discovery metadata, JSON-safe fields, supports, and generated/custom-component editor mode.

The manifest MUST NOT expose PHP class/view names, callbacks, executable rules, secrets, authorization decisions, or arbitrary module URLs. Its client constraints are UX hints; server validation remains authoritative. The exact frozen envelope is documented in [Fundamental decisions](fundamental-decisions.md#editor-manifest-v1).

The implemented bridge exposes `LaravelBlocks::editorManifest()` through the same package service and facade as registration, validation, and rendering. The generator serializes registered blocks in deterministic registry order, deduplicates categories by first occurrence, merges direct `attrs.*` schema constraints into field hints, and fails with typed manifest errors when a field or support value is not declarative JSON.

Field entries may currently be associative manifest arrays or objects implementing the manifest-field provider contract. The complete Field Engine and generated Inspector controls remain later milestones; this bridge only establishes the safe catalog consumed by those layers.

### Document validator

The implemented validation pipeline normalizes through `Document`, then applies `DocumentValidator`, `NodeValidator`, `MarkValidator`, and `AttributeValidator`. Blocks expose an executable `BlockSchema`; marks use `MarkSchema` and a singleton `MarkRegistry`. These declarations constrain attributes, parents, children, marks, and child-count bounds without exposing executable PHP rules to the editor manifest.

`LaravelBlocks::validate(...)` and the facade accept arrays, JSON strings, `Document`, or `null`, and return a validated immutable `Document`. A failure raises `DocumentValidationException` with a machine-readable `reason()` and precise `documentPath()`. Validation always rejects malformed structure, unknown node/mark types, undeclared attributes, invalid nesting, and configured resource-limit violations before rendering. The renderer's future unknown-block tolerance policy does not weaken this authoritative validation entry point.

### Schema migrator

The migrator converts older persisted document contracts to the current contract without requiring HTML round-trips. This is a document-data transform, not a Laravel database migration. Schema v1 stores the integer version at root `attrs.schemaVersion`.

### Renderer

The implemented renderer walks the document tree and delegates known nodes to registered block Blade views. `LaravelBlocks::render(...)` and `<x-laravel-blocks::content>` return trusted output through an immutable `RenderedContent` implementing Laravel `Htmlable`. Unknown blocks use the deterministic configured policy `throw`, `placeholder`, or `skip`; `throw` is the default.

### Media manager

The media manager separates block documents from storage implementations. Depending on the provider, nodes store a URL or stable media reference plus presentation metadata; the adapter resolves references or URLs and performs authorized browse/upload/delete operations.

## Package bootstrap

Laravel package discovery will register `KatonFajar\LaravelBlocks\LaravelBlocksServiceProvider`. The service provider MUST:

- merge package configuration;
- bind registries, renderer, validator, and media contracts;
- load namespaced views and Blade components;
- register commands and routes when relevant;
- publish configuration, views, and versioned compiled assets;
- register the asset publish tag and inject published CSS/deferred JavaScript once per page through the editor component;
- register separate publish groups for optional feature migrations without publishing or running them during core installation.

This follows Laravel's documented package discovery and resource-loading mechanisms.

The implemented asset boundary commits `dist/laravel-blocks.js`, `dist/laravel-blocks.css`, and `dist/manifest.json` as the Composer distribution artifact. The service provider registers a `laravel-blocks-assets` publish group, and `AssetManifest` validates the versioned manifest, checksum, integrity, byte size, base URL, and missing/corrupt metadata before returning asset URLs. The package asset Blade component emits the CSS and deferred module script once per page.

The implemented editor shell renders `<x-laravel-blocks::editor>` as a normalized document payload, hidden canonical JSON input, and package-owned Vue/Tiptap mount. The shell proves no-host-build mounting and document synchronization.

The implemented editor engine also exposes a shared internal selection and command layer around the mounted Tiptap instance. Command metadata reports active/enabled state and deterministic disabled reasons, while command execution routes focus, bold, italic, link, paragraph, heading, top-level block duplicate/delete/insert/move, manifest block insertion, undo, and redo through one registry. This is the shared mutation boundary for toolbars, menus, shortcuts, inserter, and future inspector controls.

The implemented UI infrastructure adds package-owned Button, IconButton, Toolbar, ToolbarGroup, Popover, overlay, and positioning primitives. Popover infrastructure now supports anchor-based placement, Escape dismissal, outside-pointer dismissal, and focus restoration through the precompiled bundle; feature-specific surfaces such as rich-text toolbar, link popover, Inserter, slash command, Inspector, and block menus remain later milestones.

The implemented rich-text surface adds the first selection bubble toolbar. It appears for non-empty text selections, uses the shared command layer and UI primitives, supports visible Bold and Italic actions, updates canonical hidden JSON, and restores focus to the editor canvas after button activation. Link editing, full mark coverage, keyboard shortcuts, mixed-state polish, and schema-filtered mark availability remain later milestones.

The implemented link surface adds the first external-link editing path. The selected-text toolbar opens a link popover with URL input, open-in-new-tab toggle, Apply, Unlink, validation feedback, Escape cancellation, preserved selection, and focus recovery. The JavaScript link-provider boundary normalizes and validates safe external, root-relative, and anchor links while leaving internal search/autocomplete and public provider APIs to later milestones.

The implemented block-editor surface adds the first top-level block control path. The editor derives the current block from the Tiptap selection, draws a visible selection frame, shows a contextual toolbar with the block label and Move Up/Down controls, and exposes an options menu for Duplicate, Insert before, Insert after, and Delete. These controls are limited to top-level blocks; nested wrappers, drag/drop, List View, keyboard reordering, multi-select, and complete block-specific controls remain later milestones.

The implemented inserter surface reads the PHP-generated editor manifest payload and renders a basic Block Appender plus searchable categorized Inserter. Supported manifest entries currently map to bundled Tiptap nodes for `paragraph`, `heading`, `blockquote`, and `codeBlock`; unsupported entries remain visible but disabled with a reason. Slash commands, patterns, reusable blocks, recent/favorites, nested insertion rules, and async provider behavior remain later milestones.

## Compatibility baseline

The frozen package baseline is:

```text
PHP                 ^8.2
Illuminate          ^11.0 | ^12.0 | ^13.0
Vue                  ^3
Tiptap               ^3
ProseMirror          via @tiptap/pm
```

PHP 8.2 is the shared language baseline for Laravel 11 and 12. Laravel 13 applications require PHP 8.3 or newer through their own framework constraints. The actual combinations MUST be proven by CI before the first release.

### Framework compatibility strategy

Core code MUST target APIs available in Laravel 11 and still supported by Laravel 12 and 13. Version-specific behavior should be isolated behind a small compatibility layer rather than distributed conditionals throughout blocks and services.

The package MUST depend only on the `illuminate/*` components it directly uses, not `laravel/framework`. See [Compatibility](compatibility.md) for the Composer constraints and CI matrix.

## Dependency boundaries

Core MUST NOT depend on:

- Filament;
- Livewire;
- Inertia;
- Tailwind CSS;
- a specific media library or cloud vendor;
- application Eloquent models.

Optional integrations belong in adapters or application-owned blocks. Core MAY expose contracts and events that adapters consume.

## Proposed repository layout

```text
laravel-blocks/
|-- .github/
|-- config/
|   `-- laravel-blocks.php
|-- database/                  # optional shared-feature persistence only
|   `-- migrations/
|-- docs/
|-- resources/
|   |-- css/
|   |-- js/
|   |   |-- blocks/
|   |   |-- editor/
|   |   |-- ui/
|   |   |-- block-editor/
|   |   |-- rich-text/
|   |   |-- extensions/
|   |   `-- stores/
|   `-- views/
|       |-- blocks/
|       `-- components/
|-- src/
|   |-- Blocks/
|   |-- Commands/
|   |-- Contracts/
|   |-- Documents/
|   |-- Facades/
|   |-- Fields/
|   |-- Http/
|   |-- Manifest/
|   |-- Media/
|   |-- Rendering/
|   |-- Support/
|   |-- View/
|   `-- LaravelBlocksServiceProvider.php
|-- dist/
|   |-- laravel-blocks.js
|   |-- laravel-blocks.css
|   `-- manifest.json
|-- tests/
|-- composer.json
|-- package.json
|-- phpunit.xml
`-- vite.config.js
```

The exact layout may follow Laravel's official package skeleton when bootstrapped. Architectural boundaries matter more than preserving this tree literally.

## Key decisions

| Decision | Rationale |
| --- | --- |
| Tiptap JSON is canonical | Preserves document structure and supports rendering, APIs, search, and document-schema evolution |
| Host application owns persistence | Core works with existing models, columns, APIs, and custom repositories without required migrations |
| Blade renders frontend HTML | Keeps output Laravel-native and overrideable |
| Vue stays internal | Avoids imposing the editor's frontend framework on consumers |
| Blocks are registry-driven | Gives validation, editor metadata, and rendering one source of truth |
| PHP-first custom blocks | Matches Laravel developer workflows and reduces required JavaScript |
| Dynamic blocks store configuration | Queries stay fresh and database results are not duplicated into documents |
| Media uses a contract | Prevents lock-in to one storage or media package |
| Design controls use tokens | Produces consistent output instead of arbitrary style values |
| Editor UX is core | A polished canvas, shared UI primitives, toolbars, Inserter, Inspector, List View, and accessibility ship with the package |
| One command layer owns mutations | Every toolbar, menu, shortcut, Inspector control, and drag action stays behaviorally consistent |

## References

- [Laravel 11 release notes](https://laravel.com/docs/11.x/releases)
- [Laravel 12 release notes](https://laravel.com/docs/12.x/releases)
- [Laravel 13 release notes](https://laravel.com/docs/13.x/releases)
- [Laravel package development](https://laravel.com/docs/13.x/packages)
- [WordPress Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [WordPress block-editor package](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/)
- [Tiptap core concepts](https://tiptap.dev/docs/editor/core-concepts/introduction)
- [Tiptap Vue 3 integration](https://tiptap.dev/docs/editor/getting-started/install/vue3)
- [Tiptap Vue node views](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue)

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
- the sticky document header and unified contextual toolbar;
- Popover, Tooltip, Dropdown, ContextMenu, Modal, Sidebar, and form primitives;
- the Inserter, slash commands, block insertion affordances, Inspector, and Document/List View;
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
  -> render package or application block Blade view
  -> HTML
```

Editor node views and frontend block Blade views are deliberately separate. Interactive editor markup MUST NOT define the frontend HTML contract, and frontend block view overrides MUST NOT replace the editor shell.

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

Field entries may currently be associative manifest arrays or objects implementing the manifest-field provider contract. The editor has a basic generated Inspector renderer for declarative manifest fields, while the complete Field Engine remains a later milestone.

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
- load namespaced renderer views and package-owned Blade components;
- register commands and routes when relevant;
- publish configuration, frontend block renderer views, and versioned compiled assets;
- register the asset publish tag and inject published CSS/deferred JavaScript once per page through the editor component;
- register separate publish groups for optional feature migrations without publishing or running them during core installation.

This follows Laravel's documented package discovery and resource-loading mechanisms.

The implemented asset boundary commits `dist/laravel-blocks.js`, `dist/laravel-blocks.css`, and `dist/manifest.json` as the Composer distribution artifact. The service provider registers a `laravel-blocks-assets` publish group, and `AssetManifest` validates the versioned manifest, checksum, integrity, byte size, base URL, and missing/corrupt metadata before returning asset URLs. The package asset Blade component emits the CSS and deferred module script once per page.

The implemented editor shell renders `<x-laravel-blocks::editor>` as a normalized document payload, hidden canonical JSON input, and package-owned Vue/Tiptap mount. The editor, assets, and content components are class-based package-owned surfaces, so application namespace view overrides cannot replace the master editor shell or renderer entrypoint. Only frontend block renderer views are published as supported overrides.

The implemented editor engine also exposes a shared internal selection and command layer around the mounted Tiptap instance. Command metadata reports active/enabled state and deterministic disabled reasons, while command execution routes focus, bold, italic, link, paragraph, heading, list, quote, code, top-level block duplicate/delete/insert/move/reorder, manifest block insertion, simple block-attribute updates, undo, and redo through one registry. This is the shared mutation boundary for the sticky header, contextual toolbar, menus, shortcuts, Inserter, slash commands, Inspector controls, and top-level drag/drop.

The implemented UI infrastructure adds package-owned Button, IconButton, Toolbar, ToolbarGroup, Popover, overlay, and positioning primitives. Popover infrastructure now supports anchor-based placement, Escape dismissal, outside-pointer dismissal, focus restoration, and overlay suppression through the precompiled bundle; the sticky header, unified contextual toolbar, link popover, Inserter, slash command, Inspector, and block-menu surfaces use those primitives on their basic paths.

The implemented contextual toolbar consolidates block and rich-text controls into one intent-gated surface with a stable group order. It stays hidden during ordinary collapsed-cursor typing, includes inline controls in the same complete toolbar for non-empty text selections, and opens for block-level work from the lightweight hover handle. Its groups adapt to the active block: supported text blocks expose Bold, Italic, and Link, while Heading additionally exposes H1-H6 level controls and Code omits unsupported marks. It uses the shared command layer and UI primitives, updates canonical hidden JSON, hides while higher-priority overlays such as the Inserter are open, keeps hover/menu handoff stable, and restores focus without forced scroll jumps. Full mark coverage, keyboard shortcuts, mixed-state polish, nested contexts, multi-block selection, and manifest-derived command filtering remain later milestones.

The implemented link surface adds the first external-link editing path. The unified contextual toolbar opens a link popover with URL input, open-in-new-tab toggle, Apply, Unlink, validation feedback, Escape cancellation, preserved selection, and focus recovery. The JavaScript link-provider boundary normalizes and validates safe external, root-relative, and anchor links while leaving internal search/autocomplete and public provider APIs to later milestones.

The implemented block-editor surface adds the first top-level block control path. The editor derives the current block from the Tiptap selection for command state and a separate top-level block from pointer hover, avoids a hard active content stroke, and does not show block chrome during normal typing. Hover exposes one lightweight handle; activating it opens the same complete contextual toolbar used for selected text, with Transform To, drag/move, applicable inline or Heading controls, and an options menu for Move Up/Down, Duplicate, Insert before, Insert after, and Delete. The drag handle provides basic top-level pointer reorder with insertion feedback and JSON synchronization. These controls are limited to top-level blocks; nested wrappers, nested drag/drop, keyboard reordering, multi-select, and complete block-specific controls remain later milestones.

The implemented Document/List View surface exposes a sticky-header toggle and package-owned side panel that lists top-level blocks in canonical document order with labels, icons, previews, and selected state. Selection and Move Up/Down controls route through the shared command registry and keep the hidden canonical JSON synchronized. Nested tree semantics, expand/collapse, list-view drag/drop, locked/hidden/reusable indicators, announcements, and complete accessibility polish remain later milestones.

The implemented inserter surface reads the PHP-generated editor manifest payload and renders one standalone plus button after the final top-level block. It opens a searchable icon-grid Inserter with a Browse all affordance and inserts after that final block. Supported manifest entries currently map to bundled Tiptap nodes for `paragraph`, `heading`, `bulletList`, `orderedList`, `blockquote`, and `codeBlock`; unsupported entries remain visible but disabled with a reason, while manifest entries with `supports.inserter: false` are hidden for structural nodes. Patterns, reusable blocks, recent/favorites, nested insertion rules, and async provider behavior remain later milestones.

The implemented slash-command surface reuses that manifest index for `/` discovery in an empty top-level text block. It supports local query filtering, ArrowUp/ArrowDown, Enter, Escape, Backspace, pointer insertion, disabled explanations, focus restoration, and hidden JSON synchronization. Non-empty slash replacement, nested insertion, IME polish, Home/End navigation, recent/favorites, and provider-backed commands remain later milestones.

The implemented Inspector surface renders a basic sidebar for the selected top-level block, but it is closed by default and opens only through the explicit settings control in the sticky header. It resolves the selected block's manifest definition, displays Content, Design, and Advanced tabs, maps simple manifest fields to bundled controls, and sends `attrs.*` updates through the shared command registry. Complete Field Engine controls, schema-driven design/advanced supports, validation feedback, document settings, custom extension points, and responsive drawer polish remain later milestones.

The implemented history surface adds visible Undo and Redo controls to the sticky header and maps Ctrl/Cmd+Z plus Ctrl/Cmd+Shift+Z to the same command-registry path. These controls update canonical hidden JSON and restore canvas focus on the covered primary paths; the complete shortcut map, announcements, and cross-surface history polish remain later milestones.

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
|       `-- components/ # package-owned editor/content/assets components
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
| Blade renders frontend HTML | Keeps output Laravel-native while limiting supported overrides to frontend block views |
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

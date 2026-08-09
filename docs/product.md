# Product definition

## One sentence

Laravel Blocks is a complete Gutenberg-style visual editing experience for Laravel that builds rich, structured content from text, media, layouts, Blade components, dynamic blocks, and custom Laravel blocks.

Short tagline:

> The block editor Laravel deserves.

Technical tagline:

> Structured content. Native Laravel. Fully extensible.

## Product identity

| Item | Value |
| --- | --- |
| Product name | Laravel Blocks |
| Repository | `katonfajar123/laravel-blocks` |
| Composer package | `katonfajar/laravel-blocks` |
| PHP namespace | `KatonFajar\LaravelBlocks` |

## Problem

Laravel developers can assemble rich-text editors, but creating a durable block editor still requires substantial application-specific work: editor setup, block registration, structured storage, validation, server rendering, media handling, nested content, and extension APIs.

Laravel Blocks owns that shared infrastructure while leaving application-specific content and presentation under the developer's control.

## Primary users

- Laravel package and application developers who need structured editorial content.
- Teams that want Blade-native frontend rendering without coupling their application UI to Vue.
- Product teams that need custom, domain-specific content blocks backed by PHP or Eloquent.
- Applications that may later expose the same content through an API or headless frontend.

The author using the editor may be non-technical, but the installing and extending persona is a Laravel developer.

## Goals

Laravel Blocks MUST:

- make the basic Blade form and render path small and predictable;
- ship a polished content canvas, contextual controls, shared overlays, Inserter, Inspector, List View, media UI, and keyboard interactions as core product behavior;
- produce, validate, serialize, and consume structured Tiptap JSON rather than treating presentation HTML as the editor document;
- render content through validated Laravel-owned block definitions;
- allow custom blocks without requiring consumer-authored Vue components for common cases;
- support nested content as a first-class document capability;
- expose replaceable contracts for infrastructure such as media management;
- keep frontend block output overrideable through normal Laravel conventions;
- keep the default editor shell, chrome, controls, and interaction model package-owned;
- ship useful defaults without forcing all blocks into every editor;
- integrate without required package tables, migrations, or content models;
- preserve a framework-agnostic boundary for consuming Laravel applications.

The complete normative experience is defined in the [Editor UX contract](editor-ux-contract.md). Passing document or renderer tests without that visual editing experience does not satisfy the product goal.

## Non-goals

Laravel Blocks is not:

- a CMS;
- a complete website or landing-page builder;
- a generic WYSIWYG or rich-text wrapper;
- a pixel-for-pixel WordPress Gutenberg clone;
- a frontend CSS framework;
- a replacement for an application's authorization or content workflow;
- an owner of the application's content model, tables, database connection, or persistence lifecycle;
- coupled to Filament, Livewire, Inertia, or Tailwind.

Those ecosystems may receive separate adapters after the core is stable.

## Product principles

### Simple use cases stay simple

The default integration MUST be one Blade editor component, normal Laravel persistence, and one content renderer component. It MUST produce the complete default editor without consumer-authored frontend assembly.

### Structured content is the asset

Tiptap JSON is the canonical document and HTML is a derived rendering output. The host application chooses JSON/JSONB, `TEXT`/`LONGTEXT`, an external API, or custom physical persistence.

### The application owns persistence

Core must install without database tables or migrations. Existing models and content fields remain application-owned. Only optional shared features may use explicitly enabled, replaceable persistence contracts.

### Laravel owns the server boundary

Registration, validation, authorization hooks, dynamic data resolution, media contracts, Blade rendering, and configuration belong to the PHP package.

### The editor is bundled infrastructure

Vue 3, Tiptap 3, ProseMirror, positioning logic, UI primitives, and editor CSS are implementation choices inside the precompiled editor. A consuming application MUST NOT need Node.js, npm, Vue, Tiptap, ProseMirror, Vite configuration, or a frontend build for the default editor.

### The editor surface is product-owned

Laravel Blocks, not the consuming application, owns the default editor shell, canvas structure, toolbar positions, Inserter, slash menu, Inspector, popovers, modals, selection UI, keyboard behavior, responsive behavior, icons, design tokens, and editor control classes. These are product surfaces, not view/CSS override contracts.

Applications extend what the editor can edit: blocks, fields, patterns, media providers, dynamic data, and frontend rendering views. Laravel Blocks decides how those capabilities appear inside the default editor.

### Capability parity, not visual parity

Gutenberg is the benchmark for applicable discoverability, interaction quality, editing speed, accessibility, and block-management capability. Laravel Blocks MUST keep its own design system, tokens, components, icons, motion, and visual identity. It copies lessons, not screenshots.

### Extensibility starts in PHP

A developer MUST be able to define the common case—a block's name, fields, validation, and view—in PHP and receive a generated Inspector without writing Vue. Advanced JavaScript NodeViews remain an explicit escape hatch, not the default requirement.

### Safe defaults beat unrestricted controls

Design controls SHOULD use configured tokens for colors, spacing, and breakpoints. Raw HTML and arbitrary attributes are denied or sanitized by default.

### Stored content deserves compatibility

Even before `1.0`, changes to persisted node names or attributes require an explicit document-schema transform. Public PHP APIs may move faster, but existing documents must not silently break.

## Differentiation

The defining combination is:

```text
Gutenberg-inspired editing UX
  + Tiptap editing engine
  + ProseMirror document model
  + Laravel-native PHP block API
  + Blade rendering
  + Eloquent-backed dynamic blocks
```

The differentiator is not merely providing blocks. It is connecting structured editor nodes to Laravel concepts without turning the consuming application into a JavaScript editor project.

## Scope boundary for `1.0`

`1.0` means:

- the public PHP registration and rendering APIs are stable;
- the document schema has a supported compatibility policy;
- the 50 planned core blocks are available or explicitly removed from scope before release;
- accessibility, security, performance, and upgrade paths are documented and tested;
- an application can use the core package without an ecosystem adapter.

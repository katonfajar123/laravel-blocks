# Installation and quick start

## Availability

> [!WARNING]
> Laravel Blocks has not been released. The package foundation, canonical document boundary, block registry, schema validator, Blade renderer, manifest bridge, compiled asset distribution boundary, minimal editor shell, shared command layer, rich-text/link controls, basic top-level block controls, basic manifest inserter/appender, basic slash commands, a basic manifest-generated Inspector, basic undo/redo controls, top-level drag/drop, Document/List View, and default Paragraph/Heading blocks exist; the installer command, complete editor UX, validation rule, and remaining built-in block catalog remain milestone targets.

## Proposed requirements

- PHP 8.2 or newer;
- Laravel 11, 12, or 13;
- Composer 2;
- a supported browser for the editor UI.

Laravel 13 itself requires PHP 8.3 or newer. See the [compatibility matrix](compatibility.md) for valid Laravel/PHP combinations.

Node, Vue, Tiptap, ProseMirror, positioning logic, UI primitives, and editor CSS are package development dependencies. All essential assets MUST ship precompiled in the Composer distribution. A consuming application MUST NOT need Node.js, npm/pnpm/yarn, Vue, Tiptap, ProseMirror, Vite configuration, or a frontend build for the default editor.

## Target installation

```bash
composer require katonfajar/laravel-blocks
php artisan laravel-blocks:install
```

The installer MUST:

1. publish the package configuration idempotently;
2. publish versioned `laravel-blocks.js`, `laravel-blocks.css`, and their asset manifest to `public/vendor/laravel-blocks`;
3. report the next integration steps;
4. remain safe to run more than once;
5. leave the application's database schema unchanged.

Package discovery MUST register the service provider automatically. The Blade editor component MUST load the published CSS and deferred JavaScript once per page and MUST NOT call the consuming application's `@vite` pipeline.

Core installation MUST NOT publish or run database migrations automatically. Optional shared features document their own explicit persistence setup separately.

## Persistence ownership

Laravel Blocks does not create a content model, choose a database connection, or require a particular column type. The host application owns its content and may persist editor documents in:

- JSON or JSONB columns;
- `TEXT` or `LONGTEXT` columns;
- existing Eloquent models and tables;
- external APIs;
- custom persistence implementations.

Structured Tiptap JSON remains the canonical document format in every case. Physical storage is an application concern.

## Existing application fields

An existing application does not need a schema redesign. This structure is valid:

```text
posts
|-- id
|-- title
|-- slug
`-- content LONGTEXT
```

The editor accepts the existing serialized JSON string:

```blade
<x-laravel-blocks::editor
    name="content"
    :value="$post->content"
/>
```

After document validation, the application may continue storing that field as canonical JSON. Target API:

```php
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Rules\BlockDocument;

$validated = $request->validate([
    'content' => ['nullable', new BlockDocument],
]);

$post->update([
    'content' => Document::from($validated['content'] ?? null)->toJson(),
]);
```

No package migration or package-owned Eloquent model is involved.

## JSON columns for new applications

JSON or JSONB is recommended for a new content field because the database can enforce valid JSON and the application can query it where supported. It is not required.

```php
Schema::table('posts', function (Blueprint $table): void {
    $table->json('content')->nullable();
});
```

Use Laravel's array cast:

```php
protected function casts(): array
{
    return [
        'content' => 'array',
    ];
}
```

Because a normal browser form submits a JSON string, normalize it before assigning it to an attribute cast as `array`. Target API:

```php
use KatonFajar\LaravelBlocks\Documents\Document;
use KatonFajar\LaravelBlocks\Rules\BlockDocument;

$validated = $request->validate([
    'content' => ['nullable', new BlockDocument],
]);

$content = Document::from($validated['content'] ?? null)->toArray();

$post->update([
    'content' => $content,
]);
```

## Add the editor

```blade
<form method="POST" action="{{ route('posts.update', $post) }}">
    @csrf
    @method('PUT')

    <x-laravel-blocks::editor
        name="content"
        :value="old('content', $post->content)"
    />

    <button type="submit">Save</button>
</form>
```

The component MUST accept an associative array, non-blank JSON string, or `null` as its initial value and normalize it through `Document::from(...)`. A normal browser form submits canonical document JSON as a string. The application decides whether to retain that string or normalize it to an array for its persistence layer.

The current implementation mounts a package-owned Vue/Tiptap shell, emits an escaped manifest/document payload with default Paragraph/Heading blocks, auto-loads compiled assets when enabled, synchronizes a hidden input to canonical document JSON, and includes the shared command layer, basic rich-text/link controls, basic top-level block controls, a basic manifest-driven appender/inserter, basic slash commands, a basic manifest-generated Inspector, basic visible undo/redo controls with Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, top-level drag/drop, and Document/List View. It does not yet include nested controls, the complete shortcut map, complete built-in block catalog, or polished editing controls.

The component MUST mount the complete package-owned canvas, toolbars, overlays, Inserter, Inspector, List View, media UI, and accessible interaction layer defined by the [Editor UX contract](editor-ux-contract.md). No consumer frontend assembly is part of the quick start.

The implemented `LaravelBlocks::validate(...)` boundary MUST run before accepted content is rendered, even if the field contains syntactically valid JSON. The planned `BlockDocument` Laravel rule will adapt that same validator to form-request validation. A future Eloquent cast MAY be offered as convenience, but it is not required and does not own application persistence.

## Render content

```blade
<x-laravel-blocks::content :content="$post->content" />
```

Equivalent implemented PHP API:

```php
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks;

$html = LaravelBlocks::render($post->content);
```

The Blade component uses the same renderer path as the facade. Current rendering includes package-owned Paragraph and Heading views plus any application blocks registered with safe Blade views. The remaining built-in block catalog arrives in later batches.

## Publish configuration and renderer views

Target commands:

```bash
php artisan vendor:publish --tag=laravel-blocks-config
php artisan vendor:publish --tag=laravel-blocks-renderer-views
```

Published block views live under:

```text
resources/views/vendor/laravel-blocks/blocks/
```

Applications may override presentation there without forking the package.

The editor shell, assets component, content component, toolbar, Inserter, slash menu, Inspector, popovers, core control classes, and bundled editor layout are not published as supported overrides. They remain package-owned so `<x-laravel-blocks::editor>` behaves like one consistent editor product across applications.

## Optional feature persistence

Reusable blocks, editor-managed custom patterns, and future shared revision metadata may require shared persistence. If an application enables such a feature, it may bind its own repository or explicitly publish a namespaced package migration.

Running `php artisan migrate` is therefore a feature-specific application decision, never a core installation step. Built-in and developer-registered patterns require no database.

## Minimal smoke test

Once `0.1` exists, a successful installation MUST prove all of the following:

- the editor loads without requiring the host Vite configuration;
- a paragraph can be entered and submitted;
- no package table or migration is required for core editing and rendering;
- an existing `TEXT` or `LONGTEXT` field round-trips valid document JSON;
- an optional JSON/JSONB field round-trips without double encoding;
- the saved document reloads into the editor;
- the content component renders escaped, valid HTML;
- malformed or unsupported documents fail according to the configured policy.

## Planned diagnostic command

```bash
php artisan laravel-blocks:doctor
```

It should report PHP and Laravel compatibility, published configuration/assets, writable storage, media-disk configuration, and registered blocks without mutating the application.

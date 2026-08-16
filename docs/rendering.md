# Rendering

## Status

The core renderer is implemented for registered block nodes, escaped text, deterministic unknown-block policies, typed view failures, package-owned Paragraph, Heading, Bullet List, Ordered List, List Item, Quote, Code, Image, and Video views, default validation schemas for the current editor marks, `LaravelBlocks::render(...)`, and `<x-laravel-blocks::content>`.

The Image renderer emits an escaped `<img>` only for a validated HTTP(S) source and uses empty alternative text when `alt` is absent. The Video renderer emits an escaped `<video>` with native controls, inline playback, metadata preload, optional poster/title, and no autoplay. Valid `src: null` editor placeholders emit no frontend element. The remaining built-in block views, mark-specific rich-text HTML output, provider-reference media resolution, dynamic block authorization, and render caching remain later milestone work.

## Principle

Frontend HTML is a derived representation of validated structured content. The editor's DOM and its Vue node views are not the frontend rendering contract.

## Target APIs

Blade component:

```blade
<x-laravel-blocks::content :content="$post->content" />
```

Facade:

```php
use KatonFajar\LaravelBlocks\Facades\LaravelBlocks;

$content = LaravelBlocks::render($post->content);
```

`LaravelBlocks::render(array|string|null $document, ?RenderContext $context = null)` returns an immutable `RenderedContent` value implementing `Illuminate\Contracts\Support\Htmlable`. Internal renderer services accept the normalized `Document`. `RenderedContent::toHtml()` is the only trusted-output signal; callers do not receive an ambiguous trusted string.

`null` normalizes to the canonical empty document and returns an empty `RenderedContent` value.

## Pipeline

```text
input array, JSON string, or null
  -> normalize
  -> detect and migrate supported schema version
  -> validate document structure and limits
  -> walk nodes recursively
  -> resolve each node in BlockRegistry
  -> validate and normalize block attributes
  -> authorize privileged block behavior
  -> resolve media, relations, or dynamic data
  -> render block view
  -> sanitize where the block contract requires it
  -> compose HTML
```

No code path may bypass known-node validation merely because the content originated from the package editor. Unknown recovery policies are limited to `throw`, `placeholder`, and `skip`, and they never interpret unknown node attributes or content as HTML.

## Static blocks

Static blocks render from their node content and attributes. Examples include Paragraph, Heading, Quote, Button, and Separator.

Text content is escaped. Mark-specific HTML output is added by the rich-text and built-in mark implementation so supported marks can be converted to a controlled set of elements and attributes. URLs pass through a scheme and attribute policy before they reach rendering.

## Container blocks

Container blocks render children through the same renderer rather than concatenating stored HTML. They control wrapper semantics and child layout while preserving recursive validation.

A block view should receive a safe child-rendering value, not an unrestricted callback capable of rendering arbitrary content outside the current node.

## Blade component blocks

Only application-registered component aliases may render. Props are constructed from declared fields and normalized values. The component name in persisted JSON is treated as an identifier that must match the registration; it is never passed directly to an unrestricted dynamic-component call.

## Dynamic blocks

Dynamic blocks resolve current application data from stored configuration. They require a render context that may include locale, authenticated actor, route or tenant data, preview state, and cache policy.

A dynamic block MUST define behavior when its required context is unavailable. Rendering in queues, feeds, static exports, and public pages may not have the same request state as the editor preview.

## Render context

The renderer should use an explicit context value rather than reading arbitrary globals throughout block implementations. Proposed concerns include:

- locale;
- current actor or authorization resolver;
- preview vs. published mode;
- tenant/site identifier;
- requested responsive or output variant;
- recursion and query budgets;
- cache namespace.

Exact API design is deferred until dynamic blocks in `0.6`.

## Frontend block view overrides

Package defaults:

```text
resources/views/blocks/
```

Published application overrides:

```text
resources/views/vendor/laravel-blocks/blocks/
```

Target publish command:

```bash
php artisan vendor:publish --tag=laravel-blocks-renderer-views
```

Only frontend block renderer views are a supported override surface. The editor, assets, and content Blade components remain package-owned and are resolved by class-based components rather than application override files.

Block view names and their input variables become compatibility-sensitive after `1.0`. Overrides should receive documented view models instead of an unstructured bag of internals.

## Unknown blocks

The `document.unknown_blocks` setting accepts exactly:

- `throw` — the deterministic default; raise `UnknownBlockException` with type and path;
- `placeholder` — render package-owned escaped diagnostic markup containing no node attributes or content;
- `skip` — omit the complete unknown-node subtree without promoting its children.

The editor retains unknown raw node JSON through a non-editable recovery adapter. No unknown node is interpreted as HTML.

## Invalid content and failures

Malformed JSON, unsupported schema versions, known-node validation failures, authorization failures, block implementation failures, and view failures throw typed exceptions. The unknown-block setting MUST NOT suppress these failures or convert unsafe data into trusted output.

Public errors avoid document values, class names, filesystem paths, queries, and stack traces. Development diagnostics identify the rule and exact node path while redacting field values.

## Caching

Static documents may cache final HTML using a key derived from:

- normalized document content;
- schema version;
- renderer/package version;
- relevant configuration and locale;
- registered block implementation versions where practical.

Dynamic blocks require their own cache dependencies. Full-document caching MUST NOT freeze dynamic output accidentally. A first implementation may decline to cache documents containing dynamic nodes.

## API and headless output

Consumers may need either canonical JSON or rendered HTML. APIs SHOULD label these separately and MUST NOT replace canonical JSON with editor-generated HTML.

Server-side Blade rendering is not automatically portable to non-Laravel clients. Custom blocks that need headless support should expose a documented JSON representation or client renderer in addition to their Blade view.

## Plain text

Search indexing, excerpts, word counts, and feeds need a deterministic plain-text projection. Each non-text block SHOULD define whether it contributes alt text, captions, labels, resolved dynamic text, or nothing. Stripping HTML from a full render is not a sufficient universal strategy.

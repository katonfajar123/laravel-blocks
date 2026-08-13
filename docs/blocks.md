# Built-in blocks

## Status

The product scope contains 50 built-in blocks, delivered incrementally. Paragraph, Heading, Bullet List, Ordered List, structural List Item, Quote, and Code are implemented as the initial package-owned text blocks and are registered by default. The remaining catalog blocks arrive in later batches.

## Catalog

| # | Category | Block | Purpose | Planned milestone |
| -: | --- | --- | --- | --- |
| 1 | Text | Paragraph | Standard rich-text paragraph | `0.1` |
| 2 | Text | Heading | Heading levels H1–H6 | `0.1` |
| 3 | Text | Bullet List | Unordered list | `0.1` |
| 4 | Text | Ordered List | Numbered list | `0.1` |
| 5 | Text | Quote | Standard block quote | `0.1` |
| 6 | Text | Pullquote | Large editorial quotation | `0.8` |
| 7 | Text | Code | Code block | `0.1` |
| 8 | Text | Preformatted | Preformatted plain text | `0.8` |
| 9 | Text | Table | Rows, columns, and table content | `0.8` |
| 10 | Text | Details | Expandable disclosure content | `0.8` |
| 11 | Text | Footnote | Structured note and reference | `0.8` |
| 12 | Text | Text Box | Styled text container | `0.8` |
| 13 | Media | Image | Single managed image | `0.1` |
| 14 | Media | Gallery | Multiple images | `0.3` |
| 15 | Media | Video | Uploaded or remote video | `0.3` |
| 16 | Media | Audio | Audio player | `0.8` |
| 17 | Media | File | Downloadable file | `0.3` |
| 18 | Media | Cover | Media background with nested overlay content | `0.3` |
| 19 | Media | Media & Text | Two-column media and text composition | `0.8` |
| 20 | Media | Embed | Allow-listed external embed | `0.8` |
| 21 | Media | External Image | Image loaded from a remote URL | `0.8` |
| 22 | Media | Icon | Sanitized SVG or registered icon | `0.8` |
| 23 | Design | Button | Single call-to-action link | `0.8` |
| 24 | Design | Buttons | Group of buttons | `0.8` |
| 25 | Design | Columns | Multi-column parent layout | `0.4` |
| 26 | Design | Column | Child container for Columns | `0.4` |
| 27 | Design | Group | Generic nested block group | `0.4` |
| 28 | Design | Row | Horizontal layout | `0.4` |
| 29 | Design | Stack | Vertical layout | `0.4` |
| 30 | Design | Grid | Responsive grid layout | `0.4` |
| 31 | Design | Container | Constrained-width wrapper | `0.8` |
| 32 | Design | Section | Semantic section wrapper | `0.8` |
| 33 | Design | Separator | Horizontal divider | `0.8` |
| 34 | Design | Spacer | Token-constrained vertical space | `0.8` |
| 35 | Design | Page Break | Logical content or print break | `0.8` |
| 36 | Laravel | Blade Component | Registered Blade component and validated props | `0.6` |
| 37 | Laravel | Dynamic Block | Server-rendered, application-defined dynamic block | `0.6` |
| 38 | Laravel | Raw HTML | Sanitized custom HTML, disabled by default | `0.8` |
| 39 | Laravel | Shortcode | Explicitly registered Laravel Blocks shortcode | `0.8` |
| 40 | Dynamic | Latest Posts | Recent configured model/content records | `0.8` |
| 41 | Dynamic | Post List | Configurable content collection | `0.8` |
| 42 | Dynamic | Query Loop | Constrained application-defined query loop | `0.8` |
| 43 | Dynamic | Breadcrumbs | Context-aware breadcrumb output | `0.8` |
| 44 | Interactive | Accordion | Expandable groups | `0.8` |
| 45 | Interactive | Tabs | Tabbed nested content | `0.8` |
| 46 | Content | FAQ | Structured questions and answers | `0.8` |
| 47 | Content | Alert / Callout | Informational, warning, error, or success message | `0.8` |
| 48 | Content | Card | Image, title, content, and link | `0.8` |
| 49 | Marketing | Call to Action | Heading, description, and action | `0.8` |
| 50 | Interactive | Form | Basic application-configured form | `0.8` |

Milestone assignments after `0.4` may move as the PHP extension APIs become concrete. The final `0.8` catalog must be audited before `1.0`; a lower-quality block should be removed from the promise rather than shipped as a checkbox.

## Frozen initial node names

| Document node | Editor presence |
| --- | --- |
| `paragraph` | Inserter block |
| `heading` | Inserter block |
| `bulletList` | Inserter block |
| `orderedList` | Inserter block |
| `blockquote` | Inserter block |
| `codeBlock` | Inserter block |
| `image` | Inserter block |
| `listItem` | Structural child, not an Inserter item |

The schema also reserves `doc` and `text`. These lower-camel identifiers are persisted contracts; labels remain localizable. Renaming a stored identifier after content is emitted requires a forward document-schema transform.

## Implemented initial text blocks

| Document node | PHP class | Renderer view | Manifest behavior |
| --- | --- | --- | --- |
| `paragraph` | `KatonFajar\LaravelBlocks\Blocks\Text\Paragraph` | `laravel-blocks::blocks.paragraph` | Text category, Inserter/slash enabled, no Inspector fields |
| `heading` | `KatonFajar\LaravelBlocks\Blocks\Text\Heading` | `laravel-blocks::blocks.heading` | Text category, Inserter/slash enabled, Content field `attrs.level` with H1-H6 values |
| `bulletList` | `KatonFajar\LaravelBlocks\Blocks\Text\BulletList` | `laravel-blocks::blocks.bullet-list` | Text category, Inserter/slash enabled, no Inspector fields |
| `orderedList` | `KatonFajar\LaravelBlocks\Blocks\Text\OrderedList` | `laravel-blocks::blocks.ordered-list` | Text category, Inserter/slash enabled, no Inspector fields |
| `listItem` | `KatonFajar\LaravelBlocks\Blocks\Text\ListItem` | `laravel-blocks::blocks.list-item` | Structural child for list blocks, hidden from Inserter/slash |
| `blockquote` | `KatonFajar\LaravelBlocks\Blocks\Text\Quote` | `laravel-blocks::blocks.quote` | Text category, Inserter/slash enabled, one or more supported block children |
| `codeBlock` | `KatonFajar\LaravelBlocks\Blocks\Text\Code` | `laravel-blocks::blocks.code` | Text category, Inserter/slash enabled, plain unmarked text with optional language metadata |

Paragraph allows top-level, list-item, and Quote placement; Heading and both List blocks allow top-level and Quote placement. Paragraph and Heading accept text children, the current editor marks (`bold`, `italic`, `link`), and optional empty `design` and `advanced` attribute objects. Heading requires `attrs.level` to be one of `1` through `6`. Bullet List and Ordered List require one or more `listItem` children; `listItem` is structural, may only appear inside lists, and currently accepts paragraph children only.

Quote matches the bundled Tiptap `block+` structure for the currently supported catalog: it requires one or more Paragraph, Heading, Bullet List, Ordered List, Quote, or Code children. Code accepts only unmarked text, may be empty, and accepts an optional nullable `attrs.language` string of at most 100 characters. Its Blade renderer emits escaped `<pre><code>` output and an escaped `language-*` class when language metadata is present. Syntax highlighting, a language picker, citations, Quote variants, nested-block toolbar controls, mark-specific server HTML rendering, and the complete built-in mark catalog remain separate follow-up work.

## Registration

The shipped configuration registers the first text blocks in this order:

```php
use KatonFajar\LaravelBlocks\Blocks\Text\BulletList;
use KatonFajar\LaravelBlocks\Blocks\Text\Code;
use KatonFajar\LaravelBlocks\Blocks\Text\Heading;
use KatonFajar\LaravelBlocks\Blocks\Text\ListItem;
use KatonFajar\LaravelBlocks\Blocks\Text\OrderedList;
use KatonFajar\LaravelBlocks\Blocks\Text\Paragraph;
use KatonFajar\LaravelBlocks\Blocks\Text\Quote;

return [
    'blocks' => [
        Paragraph::class,
        Heading::class,
        BulletList::class,
        OrderedList::class,
        ListItem::class,
        Quote::class,
        Code::class,
    ],
];
```

Applications can choose a subset by overriding `blocks` in the published config. An empty list disables package defaults so the application can register its own blocks in a service provider. Configuration order determines registry and Inserter order unless a later explicit sort value is supplied.

## Block contract

Every core block MUST document and test:

- stable node name;
- category, label, description, keywords, and icon;
- allowed parents and children;
- supported marks;
- attribute schema and defaults;
- field validation rules;
- editor node-view behavior;
- frontend Blade output;
- sanitization and URL policy;
- accessibility behavior;
- document-schema transforms for breaking attribute changes.

## Dynamic blocks

Dynamic blocks store only validated configuration. They resolve current data at render time. Built-in dynamic blocks MUST NOT accept arbitrary model classes, raw SQL, unconstrained columns, or user-supplied Blade view names from document JSON.

## Interactive blocks

Accordion, Tabs, and Form require frontend behavior. Their HTML MUST remain usable without JavaScript where practical, and package scripts MUST be progressively enhanced, namespaced, and optional on pages that contain no interactive blocks.

## Raw HTML

Raw HTML is a privileged escape hatch:

- disabled by default;
- subject to an allow-list sanitizer;
- never executable in editor preview;
- separately authorized if enabled;
- unsuitable for scripts, event-handler attributes, or arbitrary iframes.

## Form block

The Form block is not a general form builder. Its `1.0` scope should be limited to application-registered form definitions or a constrained set of fields and handlers. Submission routes, CSRF, rate limiting, validation, authorization, storage, notifications, and spam protection remain server responsibilities.

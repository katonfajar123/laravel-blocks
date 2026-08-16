# Document schema

## Canonical format

Structured Tiptap JSON is the canonical document exchanged by the editor, validator, renderer, and host persistence. Laravel Blocks core does not persist application content or own its model, table, or API. Rendered HTML is not the canonical editor value.

A minimal document:

```json
{
  "type": "doc",
  "attrs": {
    "schemaVersion": 1
  },
  "content": [
    {
      "type": "paragraph",
      "attrs": {
        "design": {},
        "advanced": {}
      },
      "content": [
        {
          "type": "text",
          "text": "A modern block editor for Laravel."
        }
      ]
    }
  ]
}
```

This aligns with Tiptap's JSON document model: a document is a schema-constrained tree of nodes, with marks applied to supported inline content.

## Persistence

A host application chooses the physical persistence mechanism. Supported choices include:

- JSON or JSONB columns;
- `TEXT` or `LONGTEXT` columns containing serialized document JSON;
- existing application models and tables;
- external APIs;
- custom persistence implementations.

For a new relational schema, a JSON/JSONB column is recommended but not required:

```php
$table->json('content')->nullable();
```

The application may cast that field to an array:

```php
protected function casts(): array
{
    return [
        'content' => 'array',
    ];
}
```

An existing `TEXT` or `LONGTEXT` field may retain the serialized JSON string without an array cast. No package migration is needed in either case.

The editor component, content component, renderer, and `BlockDocument` validation rule MUST accept an associative array, non-blank JSON string, or `null` at their public boundary, then normalize immediately through `Document::from(...)`. `null` becomes the canonical empty v1 document. Malformed/blank JSON, a non-object root, and invalid or unsupported schema versions raise a typed document error and MUST never be treated as HTML.

`Document::toArray()` and `Document::toJson()` always emit the canonical v1 root. A browser editor submits that JSON as a string; the host persistence layer decides whether to retain the string or decode it into an object for storage.

## Implemented normalization boundary

B02 implements the public normalization boundary:

```php
use KatonFajar\LaravelBlocks\Documents\Document;

$document = Document::from($arrayOrJsonOrNull);

$array = $document->toArray();
$json = $document->toJson();
```

The immutable `Document` always exposes this exact root order and shape:

```json
{"type":"doc","attrs":{"schemaVersion":1},"content":[]}
```

Normalization currently enforces:

- a JSON input must be non-blank, valid JSON, and an object rather than an array or scalar;
- a PHP array input must be an associative root rather than a list;
- root `type` is exactly `doc`;
- root `attrs` contains only integer `schemaVersion: 1`;
- root `content` is an ordered array and defaults to `[]` when omitted;
- no custom envelope/root keys are accepted;
- child payloads are copied through JSON serialization so callers cannot mutate Document state;
- `Document::from(...)` preserves child node and mark semantics without validating them; callers use the separate implemented `DocumentValidator` boundary when authoritative semantic validation is required.

All normalization failures extend `DocumentException` and expose `reason()` plus a JSONPath-style `documentPath()`. Implemented reasons are:

| Reason | Path | Meaning |
| --- | --- | --- |
| `blank_json` | `$` | String input contains no JSON value |
| `malformed_json` | `$` | JSON decoding failed |
| `root_not_object` | `$` | Public root is a JSON array/scalar or PHP list |
| `invalid_root_type` | `$.type` | Root type is absent or not `doc` |
| `invalid_root_attributes` | `$.attrs` | Root attrs is not object-shaped |
| `missing_schema_version` | `$.attrs.schemaVersion` | Required version is absent |
| `invalid_schema_version` | `$.attrs.schemaVersion` | Version is not an integer |
| `unsupported_schema_version` | `$.attrs.schemaVersion` | Integer version is not supported |
| `invalid_content` | `$.content` | Root content is not an ordered array |
| `unexpected_root_key` | `$` | Root contains a non-canonical key |
| `unexpected_root_attribute` | `$.attrs` | Root attrs contains a key other than `schemaVersion` |
| `not_json_serializable` | `$.content` | Child payload cannot round-trip through JSON |

`UnsupportedSchemaVersionException` additionally exposes the rejected integer through `schemaVersion()`. These normalization errors remain distinct from the implemented `DocumentValidationException` failures for block, node, mark, attribute, nesting, and resource-limit rules.

## Node rules

Every persisted node MUST:

- contain a stable schema `type`; currently available types resolve through the registry, while unavailable historical types use the documented unknown-block recovery and rendering policy;
- conform to that type's allowed content expression;
- contain only declared, JSON-serializable attributes;
- satisfy server-side validation independently of editor validation;
- preserve children in `content` when the block supports nesting.

Text nodes use Tiptap's normal form:

```json
{
  "type": "text",
  "text": "Laravel Blocks",
  "marks": [
    { "type": "bold" },
    {
      "type": "link",
      "attrs": { "href": "https://example.com" }
    }
  ]
}
```

Marks MUST be allow-listed and their attributes validated, especially URLs and inline styles.

## Built-in and custom nodes

Simple text blocks SHOULD follow Tiptap conventions where possible:

```json
{
  "type": "heading",
  "attrs": {
    "level": 2,
    "design": {},
    "advanced": {}
  },
  "content": [
    { "type": "text", "text": "Laravel Blocks" }
  ]
}
```

Laravel-specific nodes store configuration, not rendered HTML or runtime query results:

```json
{
  "type": "bladeComponent",
  "attrs": {
    "component": "product-card",
    "props": {
      "product": 82
    },
    "design": {},
    "advanced": {}
  }
}
```

```json
{
  "type": "latestProperties",
  "attrs": {
    "limit": 6,
    "propertyType": "house",
    "design": {},
    "advanced": {}
  }
}
```

The implemented initial Image block uses a URL-only leaf node. A newly inserted placeholder is valid with nullable attributes:

```json
{
  "type": "image",
  "attrs": {
    "src": null,
    "alt": null,
    "title": null
  }
}
```

A non-null `src` must be an HTTP(S) URL. The bundled Inspector edits source, alternative text, and title; the frontend renderer omits placeholders until a source exists.

The implemented Video block is also a URL-based leaf node. Its placeholder keeps every attribute nullable:

```json
{
  "type": "video",
  "attrs": {
    "src": null,
    "poster": null,
    "title": null,
    "captionSrc": null,
    "captionLanguage": null,
    "captionLabel": null
  }
}
```

Non-null `src`, `poster`, and `captionSrc` values must be HTTP(S) URLs. `title` is limited to 500 characters, `captionLanguage` to 35 characters, and `captionLabel` to 200 characters. Caption attributes are additive and optional, so existing Video documents remain valid. The editor renders an atomic placeholder until a source is chosen; the frontend renderer then emits native controls without autoplay and, when `captionSrc` exists, one default captions track with deterministic `und` and `Captions` fallbacks.

Later media-provider nodes MAY store a provider URL or a stable media reference plus content metadata. For example, an ID-based provider may produce:

```json
{
  "type": "image",
  "attrs": {
    "mediaId": 21,
    "alt": "Laravel Blocks",
    "caption": null,
    "design": {},
    "advanced": {}
  }
}
```

Stable references are preferred when the media provider supports them, especially for private or replaceable URLs. URL-only providers remain valid.

## Nested content

Layout nodes contain child blocks as document nodes rather than serialized HTML:

```text
section
`-- container
    `-- columns
        |-- column
        |   |-- heading
        |   |-- paragraph
        |   `-- button
        `-- column
            `-- image
```

Each container block MUST declare its allowed children. The validator MUST enforce parent/child constraints on the server, not only in ProseMirror.

Examples:

- `columns` accepts one or more `column` children;
- `column` accepts normal content blocks;
- leaf blocks such as `image` and `video` accept no child content;
- `list` accepts list-item children rather than arbitrary layout blocks.

## Content, design, and advanced settings

Block settings are presented in three editor groups:

- **Content**: semantic values that define the block's content or behavior.
- **Design**: constrained presentation choices, preferably references to configured tokens.
- **Advanced**: anchor ID, CSS class, visibility, and permitted custom attributes.

Selectable block nodes reserve `design` and `advanced` beside their declared semantic attributes:

```json
{
  "type": "heading",
  "attrs": {
    "level": 2,
    "design": {},
    "advanced": {}
  },
  "content": []
}
```

Content fields map to declared direct attributes or Tiptap child `content`. `design` contains only declared, validated design-token references and constrained presentation values. `advanced` contains only enabled shared settings: a validated anchor, normalized class tokens, configured visibility keys, and allow-listed custom attributes.

The reserved objects normalize to `{}` when absent. Root `doc`, inline `text`, and structural `listItem` nodes do not receive them. The block's `supports()` metadata determines permitted keys; undeclared values fail server validation.

## Schema versioning

Schema v1 stores its required integer version at root `attrs.schemaVersion`:

```json
{
  "type": "doc",
  "attrs": {
    "schemaVersion": 1
  },
  "content": []
}
```

The editor and PHP renderer use the same contract:

- version detection is deterministic;
- transforms operate on JSON without rendering to HTML;
- unknown future versions fail safely;
- transforms are testable and idempotent.

## Unknown blocks

Applications may remove a block from configuration while older documents still contain it. The renderer therefore needs a configurable policy:

| Policy | Intended use |
| --- | --- |
| `throw` | Default; raise `UnknownBlockException` with the type and document path |
| `placeholder` | Render a package-owned escaped diagnostic containing no node content or attributes |
| `skip` | Explicitly omit the complete unknown-node subtree without promoting children |

Unknown blocks MUST NOT be interpreted as raw HTML. The original JSON MUST remain recoverable in the editor so temporarily unavailable extensions do not destroy content.

## Stable v1 names

The emitted v1 node identifiers are `doc`, `text`, `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `image`, and `video`. The first marks are `bold`, `italic`, `underline`, `strike`, `code`, `highlight`, `link`, `superscript`, `subscript`, and `keyboard`.

These lower-camel identifiers are persisted contract values, not localized labels or PHP class names. Changing an emitted name requires a forward document-schema transform.

## Validation boundary

The implemented server validator enforces:

- JSON syntax and total document size;
- schema version;
- document depth and node count;
- node and mark names;
- parent/child structure;
- field types, required values, lengths, ranges, and allowed options;
- URL types and allowed schemes;
- configured document, node, depth, text, and attribute byte limits.

Later media, dynamic-block, and renderer layers add provider-reference, component/model allow-list, authorization, and output-sanitization checks at their own trust boundaries.

`Block::schema()` returns an immutable `BlockSchema` defining declared `AttributeRule` values, allowed parents, children, marks, and child-count bounds. The safe default is a leaf block with no attributes or children. Marks are registered separately through immutable `MarkSchema` definitions so inline formatting remains explicit and independently validated.

Attribute rules currently cover strings, integers, numbers, booleans, URLs with allowed schemes, nested objects, and homogeneous lists. They support required/nullable state, lengths, numeric ranges, allow-listed scalar values, nested properties, and list item constraints. Undeclared attributes fail rather than passing through implicitly.

The public entry point is:

```php
$document = LaravelBlocks::validate($value);
```

It accepts an array, JSON string, `Document`, or `null` and returns the same canonical immutable document shape after validation. `DocumentValidationException` exposes a stable `reason()` and JSON-like `documentPath()`, for example `unknown_node_type` at `$.content[0].type`. Client-side validation improves feedback but is never a security boundary.

## Derived outputs

The canonical document may produce multiple derived forms:

```text
Tiptap JSON
|-- sanitized Blade HTML
|-- REST / JSON API response
|-- headless frontend rendering
|-- plain-text search index
|-- content outline and reading metrics
`-- migrated future schema
```

Derived output may be cached, but it MUST be invalidated when the source document, block implementation, relevant dynamic data, or rendering configuration changes.

## Reference

- [Tiptap core concepts and JSON format](https://tiptap.dev/docs/editor/core-concepts/introduction)

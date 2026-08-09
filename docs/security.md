# Security

## Trust model

All document JSON is untrusted input, including content created by the official editor. Client-side schemas and controls improve authoring but do not replace server validation, sanitization, authorization, or resource limits.

## Primary risks

- cross-site scripting through text, links, raw HTML, SVG, embeds, or custom attributes;
- server-side request forgery through remote media or embed discovery;
- arbitrary Blade component, view, class, or method resolution;
- unconstrained Eloquent queries and data exposure from dynamic blocks;
- malicious uploads and unsafe filenames;
- denial of service through huge, deeply nested, or recursive documents;
- authorization bypass in preview, media, reusable blocks, and dynamic content;
- stale caches exposing content across users, tenants, or visibility states.

## Document validation

The server MUST enforce:

- accepted schema versions;
- maximum serialized bytes;
- maximum nodes, depth, text length, and attribute sizes;
- registered node and mark types;
- declared nesting rules;
- strict field types and allow-listed options;
- safe defaults for missing optional values;
- rejection of undeclared attributes where practical.

Limits must apply recursively and before expensive rendering or database work.

The implemented defaults are 1 MiB serialized document data, 10,000 non-root nodes, depth 32, 256 KiB cumulative text, and 64 KiB serialized attributes per node or mark. Applications may lower or raise these positive integer limits through `laravel-blocks.document`; invalid configured values fall back to the safe package defaults. Raw JSON size is checked before decoding, and canonical array/`Document` inputs are checked after normalization.

Registered blocks and marks declare executable server schemas. Validation rejects unknown or reserved nested root nodes, undeclared attributes, unsafe URL schemes, disallowed/duplicate marks, invalid parent-child relationships, and resource-limit violations with typed reasons and document paths. Rendering never bypasses known-node validation, and renderer fallback settings do not convert malformed content into trusted output.

## Editor manifest and recovery placeholders

Editor Manifest v1 is declarative JSON. It MUST NOT expose PHP class or view names, callbacks, executable validation logic, secrets, authorization decisions, filesystem paths, or arbitrary JavaScript module URLs. Client constraints improve feedback; server validation and authorization remain authoritative.

An unknown-block recovery placeholder MUST NOT echo the node's attributes or content. `skip` omits the complete subtree, while `throw` reports only the stable type and document path through a typed exception.

## Escaping and sanitization

Normal text and attributes render through Blade escaping. A block may produce trusted HTML only from its own package/application template and normalized inputs.

Rich-text marks and custom attributes use allow lists. URL-bearing values must enforce allowed schemes such as `https`, `http`, `mailto`, and `tel` only where relevant. `javascript:`, data URLs, browser event attributes, and CSS capable of executing or exfiltrating data must be rejected.

Sanitization is defense in depth; it does not justify rendering arbitrary views or executing user-provided code.

## Raw HTML

Raw HTML is disabled by default:

```php
'security' => [
    'allow_raw_html' => false,
    'sanitize_output' => true,
],
```

If enabled, it MUST pass through an allow-list HTML sanitizer. Scripts, style-based execution, event-handler attributes, unsafe URLs, unapproved iframes, and dangerous SVG content remain forbidden. Enabling raw HTML SHOULD require a separate application authorization ability.

## Blade components and views

Documents may select only aliases pre-registered in application code. Never treat a node attribute as an arbitrary Blade view, component class, PHP class, method, template source, or filesystem path.

Props must come from declared fields and pass normalization. Relation fields resolve against registered model definitions and apply application policy before data is exposed.

## Dynamic queries

Dynamic blocks must use application-defined queries. Documents may supply bounded options such as an allow-listed type or capped result limit; they may not supply raw SQL, model class names, column names, scopes, eager-load paths, or callable names.

Each render should enforce query and recursion budgets to prevent a valid-looking document from causing unbounded work.

## Embeds and remote URLs

Embed providers and iframe origins are allow-listed. Prefer provider-specific URL parsing and safe iframe templates over accepting iframe HTML.

If the server fetches remote metadata, it must defend against SSRF: restrict schemes, resolve and reject private/reserved addresses, cap redirects and response sizes, set timeouts, and avoid forwarding credentials.

Remote images should normally render as URLs without server fetching. Any proxy or import feature inherits the same SSRF controls.

## Media uploads

See [Media](media.md) for the full upload policy. Authorization, MIME inspection, size limits, safe generated paths, SVG policy, rate limiting, and storage visibility are mandatory server responsibilities.

## Preview endpoints

Server-rendered editor previews MUST require authorization equivalent to viewing the underlying draft plus permission to resolve every privileged block. Requests require CSRF protection for session-authenticated browsers, strict payload limits, and rate limits.

Preview HTML should render in an appropriately isolated container. If arbitrary application components can execute scripts, consider a sandboxed origin or iframe rather than injecting preview output directly into the editor document.

## Reusable blocks and multitenancy

Reusable block lookup, media lookup, cache keys, and relation fields must include tenant/site scope where the host application uses it. An opaque identifier alone is not authorization.

## Error handling

Public rendering errors must not expose document JSON, database IDs beyond intended output, class names, filesystem paths, queries, or stack traces. Development diagnostics should identify the node path and rule while redacting sensitive field values.

## Custom block responsibility

Application-authored blocks run trusted application code, but their stored attributes remain untrusted. The package should provide safe helpers and validation contracts; it cannot make an intentionally unsafe custom Blade view safe automatically.

## Security release gate

Before `1.0`, tests must cover at least:

- script and event-handler injection;
- malicious URL schemes and encoded variants;
- raw HTML sanitizer bypass corpus;
- unsafe embeds and SSRF inputs;
- SVG upload behavior;
- arbitrary component/view resolution attempts;
- excessive depth, node counts, text, and attributes;
- recursive reusable blocks;
- dynamic-query bounds;
- tenant and authorization cache isolation.

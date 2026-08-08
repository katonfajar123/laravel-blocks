# Patterns and reusable blocks

Patterns and reusable blocks solve different problems and MUST remain distinct in both storage and the editor.

## Patterns

A pattern is a named document fragment used as a starting template. Inserting it copies its nodes into the current document. The inserted nodes are then independent.

Examples:

- Hero Centered;
- Hero Split;
- Feature Grid;
- Article CTA;
- FAQ Section;
- Pricing;
- Contact Section.

Conceptual pattern:

```text
Hero Split
`-- Section
    `-- Container
        `-- Columns
            |-- Column
            |   |-- Heading
            |   |-- Paragraph
            |   `-- Buttons
            `-- Column
                `-- Image
```

Pattern registration MUST include a stable name, localized label and description, categories, keywords, preview metadata, and a valid JSON fragment.

Patterns MUST be validated against the active block registry when registered and again when inserted. If required blocks are unavailable, the editor MUST explain why the pattern is disabled.

Built-in and developer-defined patterns are registered JSON fragments and require no database. Insertion copies their nodes into the current document, so later edits to the source pattern do not affect documents that already used it.

Editor-managed custom patterns MAY use optional shared persistence when an application wants authors to create or manage them at runtime. That persistence uses a replaceable repository contract and does not change copy-on-insert semantics.

## Reusable blocks

A reusable block is shared content stored separately and referenced by one or more documents. Editing the shared record may update every linked use.

Examples:

- Newsletter CTA;
- Download Ebook;
- Contact Sales.

A reference node MUST store a stable reusable-block identifier, not duplicate the shared document:

```json
{
  "type": "reusableBlock",
  "attrs": {
    "reference": "01JEXAMPLE8V6QCRZQ4",
    "design": {},
    "advanced": {}
  }
}
```

The exact identifier type and node name are open decisions for `0.7`.

## Required editor actions

When reusable blocks are enabled, the editor MUST support:

- save selected block or fragment as reusable;
- insert a linked reusable block;
- edit the shared source with an explicit scope warning;
- detach a use into independent document nodes;
- show missing, deleted, or unauthorized references safely;
- prevent accidental recursive references.

## Persistence

Reusable blocks are optional and require shared persistence through a replaceable repository or storage contract. An application may provide its own implementation or explicitly select a future package-provided table repository. A stored record will likely need:

- stable ID;
- name and optional description;
- structured JSON document/fragment;
- schema version;
- revision timestamps and optional author IDs;
- scope such as tenant, site, or global;
- optimistic locking or another conflict policy.

Package migrations are always opt-in and are needed only when the application explicitly selects the package-provided table repository. They MUST be published separately, use namespaced tables, and never run during core installation. Applications with custom repositories require no package migration.

Detaching a reusable block replaces its reference with copied normal nodes. The detached content then belongs entirely to the host document and no longer follows updates to the shared source.

## Rendering

The renderer resolves reusable references recursively through a bounded context. It MUST detect direct and indirect cycles and enforce maximum depth and total-node limits.

Caching needs dependencies from the parent document to every referenced reusable block. Updating a reusable block must invalidate linked rendered output or use versioned cache keys.

## Authorization

Create, browse, update, delete, and insert permissions may differ. A user who can insert a reusable block is not automatically allowed to edit its shared source.

Frontend rendering needs a defined policy when a reference exists but the current render context may not access it. Public published content should not leak a private reusable block through a stale cache.

## Comparison

| Behavior | Pattern | Reusable block |
| --- | --- | --- |
| Inserted document remains linked to shared source | No | Yes |
| Inserted content is independent | Yes | No, unless detached |
| Source edits affect existing documents | No | Yes |
| Useful for layout starters | Yes | Sometimes |
| Useful for globally managed content | No | Yes |
| Requires reference resolution at render time | No | Yes |

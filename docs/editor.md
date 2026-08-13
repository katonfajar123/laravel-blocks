# Editor

## Experience

Laravel Blocks takes inspiration from Gutenberg's block-oriented editing model without copying its interface pixel for pixel. Authors write directly in a document, insert blocks through `/` or an inserter, select a block to edit its settings, and rearrange the document without manipulating HTML.

The default editor is governed by the normative [Editor UX contract](editor-ux-contract.md). It MUST ship as a complete visual editing experience; consumers do not assemble the canvas, toolbars, overlays, Inspector, or movement UI themselves.

The default empty state MUST communicate one action:

```text
Start writing or type / to choose a block
```

## Block insertion

The block Inserter, Block Appender, and slash menu MUST share the same registry-backed catalog. They MUST support:

- search by label and keyword;
- block categories;
- keyboard navigation and selection;
- recent blocks;
- favorites;
- disabled-state explanations when a block is not allowed at the current depth;
- application-provided blocks alongside built-in blocks.

Initial categories are Text, Media, Design, Laravel, Dynamic, Interactive, Content, and Marketing. Category names are presentation metadata and do not form part of the stored schema.

The current implementation includes a manifest-driven trailing Inserter and slash command menu. These surfaces read the editor manifest payload, group or filter blocks by category/search query, insert supported Tiptap nodes through the shared command layer, and show disabled unsupported manifest blocks with a reason. One standalone plus button sits after the final top-level block and opens the icon-grid Inserter with search and a Browse all affordance; it is not part of the header or contextual toolbar. The slash menu opens as a compact keyboard-first list from `/` in an empty top-level text block. Slash commands support query typing, ArrowUp/ArrowDown, Enter, Escape, Backspace, and pointer insertion, and replace the triggering empty block with the selected supported node. The bundle currently maps `paragraph`, `heading`, `bulletList`, `orderedList`, `blockquote`, and `codeBlock`; package manifest entries marked `supports.inserter: false` are hidden from the Inserter/slash surfaces for structural nodes such as `listItem`. Patterns, reusable blocks, recent/favorites, nested insertion rules, Home/End behavior, IME polish, and async provider behavior remain later milestones.

## Block operations

The default `1.0` editor MUST include:

- drag and drop;
- keyboard movement;
- move up and down;
- insert before and after;
- duplicate and delete;
- copy and paste;
- copy block styles;
- nested blocks;
- reusable blocks;
- patterns;
- undo and redo.

Operations MUST preserve a valid document tree. Dragging MUST show a precise insertion indicator, invalid targets, and autoscroll where needed. An invalid drop target MUST be visibly rejected rather than repaired silently after the drop, and movement MUST have Move Up/Down plus keyboard alternatives.

The current implementation includes basic top-level block controls gated by explicit user intent. A collapsed cursor, including one inside an empty block, does not show the contextual toolbar. Hovering a top-level block shows one lightweight handle; activating it opens the single complete contextual toolbar with Transform To, drag/move controls, applicable block-specific controls, and an options menu for Move Up/Down, Duplicate, Insert before, Insert after, and Delete. Heading blocks expose H1-H6 in that toolbar, supported text blocks include Bold, Italic, and Link, and Code omits unsupported marks. These actions execute through the shared command registry, keep handle/menu handoff stable, avoid forced scroll jumps, and update canonical hidden JSON.

Pointer drag/drop is currently a basic top-level foundation: the contextual drag handle can move one selected top-level block before or after another top-level block, shows an insertion indicator, rejects no-op or off-canvas drops without changing the document, and keeps the hidden canonical JSON synchronized. Nested drag/drop, autoscroll, multi-select, touch polish, keyboard reordering, announcements, copy/paste, and block-specific command filtering remain later milestones.

## Inline rich text

Text-capable nodes MUST support:

- bold, italic, underline, and strikethrough;
- inline code and highlight;
- configured text colors;
- links;
- superscript and subscript;
- keyboard markup;
- clear formatting.

A selection bubble menu MUST provide fast access to frequent marks. Link editing MUST use a selection-anchored popover with validation, target control, apply/unlink behavior, Escape cancellation, and predictable focus restoration. The editor schema, not the toolbar, determines which marks a node accepts.

The current implementation routes Bold, Italic, and Link through the unified contextual toolbar rather than a second text-only toolbar. A non-empty text selection opens the same complete toolbar composition used for block controls, with only the groups valid for the selected block. Link editing uses selection state, routes actions through the shared command layer, updates canonical hidden JSON, and restores focus to the editor canvas.

The Link control opens a selection-anchored popover with URL input, open-in-new-tab toggle, Apply, Unlink, inline validation feedback, Escape cancellation, and preserved-selection mutation. The current provider boundary validates safe external, root-relative, and anchor links; internal-link search/autocomplete, remaining marks, keyboard shortcuts, mixed-selection state, and schema-filtered mark availability remain later milestones.

## Settings

The generated Settings Inspector MUST use three consistent tabs (or the equivalent accessible tab selector in a responsive drawer):

| Group | Contains |
| --- | --- |
| Content | Semantic values, text, media, links, and behavior |
| Design | Token-based color, spacing, typography, sizing, alignment, and borders |
| Advanced | Anchor, CSS class, responsive visibility, and allow-listed attributes |

For an Image block this MUST expose the applicable controls from:

```text
Content:  image, alt text, caption, link
Design:   width, height, aspect ratio, object fit, alignment, radius
Advanced: anchor ID, CSS class, visibility, custom attributes
```

Unavailable settings MUST be omitted instead of displayed as non-functional controls. PHP Field definitions and block supports MUST generate normal Inspector controls without consumer-authored Vue.

The current implementation includes the first manifest-generated Inspector sidebar for the selected top-level block, but it is closed by default and opens only from the explicit settings control in the sticky header. It renders the Content, Design, and Advanced tabs, derives basic controls from declarative manifest fields, updates simple `attrs.*` values through the shared command registry, and keeps canonical hidden JSON synchronized. The current control set is intentionally basic and top-level only; the complete Field Engine, media/repeater/relation controls, validation feedback, custom Inspector extension points, document settings, and polished responsive drawer behavior remain later milestones.

## Document tools

The `1.0` document tools MUST include:

- document outline and heading navigation;
- word, character, block, and estimated reading-time counts;
- JSON preview;
- HTML preview;
- Laravel-rendered frontend preview;
- desktop, tablet, and mobile preview sizes;
- fullscreen and distraction-free modes;
- autosave and draft recovery;
- command palette and keyboard-shortcut reference.

Document/List View MUST mirror the nested block tree, synchronize selection with the canvas, support expand/collapse, provide accessible tree navigation, and expose the same valid reordering commands as direct canvas manipulation.

The current implementation includes a basic Document/List View foundation. The sticky header exposes a List View toggle, the package-owned panel renders top-level blocks in document order with labels, icons, text previews, and selected state, and list item selection focuses the matching canvas block through the shared command registry. The panel also exposes Move Up/Down controls for each top-level block and updates canonical hidden JSON through the same move commands as the contextual toolbar and drag/drop foundation. This is intentionally top-level only; nested tree semantics, expand/collapse, list-view drag/drop, multi-select, locked/hidden/reusable indicators, announcements, and polished responsive/accessibility behavior remain later milestones.

JSON preview is a diagnostic view of the canonical value. HTML preview MUST use the package's safe renderer; it must not independently trust editor-generated HTML.

## Toolbar model

The interface MUST expose applicable commands through:

- a sticky document header for global controls such as Undo, Redo, and Settings;
- one contextual toolbar for the active block and text selection;
- the settings sidebar;
- slash commands;
- a command palette;
- keyboard shortcuts.

These are multiple entry points to the same command and selection layers. They MUST NOT implement conflicting behavior independently.

The current implementation includes the internal selection snapshot and shared command registry plus a sticky header, one intent-gated adaptive contextual toolbar, Transform To/options menus, link popover, a basic trailing manifest Inserter, basic slash commands, basic generated Inspector controls, a basic top-level Document/List View, and visible header Undo/Redo controls. Undo and Redo execute through the command registry from the sticky header and from Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. The default editor surface is full-width and clean; collapsed typing does not open block chrome, the standalone plus remains after the final block, and the Inspector and List View do not open automatically. The full shortcut map, nested controls, advanced drag/drop, and complete block operation UI remain later milestones.

## Shared UI infrastructure

Laravel Blocks MUST provide namespaced Button, IconButton, Toolbar, Popover, Tooltip, Dropdown, ContextMenu, Modal, Sidebar, Tabs, form-control, Snackbar, Spinner, and CommandMenu primitives. Blocks MUST reuse them instead of creating private overlay behavior.

Popovers MUST be anchor-aware and collision-aware, preserve the editor selection, remain within the viewport, support role-appropriate keyboard navigation and Escape, dismiss predictably, and restore focus to the invoking control or selection. Only true dialogs trap focus. See the detailed [Popover and overlay contract](editor-ux-contract.md#popover-and-overlay-contract).

The current implementation includes the first Button, IconButton, Toolbar, ToolbarGroup, Popover, overlay, and positioning primitives. Rich-text, link, block toolbar, options menu, inserter, slash menu, and Inspector surfaces now use those foundations on basic paths; full context-menu semantics and complete responsive/accessibility polish remain later milestones.

## Autosave and recovery

Autosave is opt-in by default because the host application owns routes, authorization, and revision policy. The package SHOULD expose events or callbacks and a small transport contract rather than assuming a post model.

Draft recovery SHOULD use a distinct local key per application, route, model identifier, field name, and user where available. It MUST never overwrite newer server content without confirmation.

## Preview

Three preview concepts must stay distinct:

- **Editor view**: interactive Vue node views optimized for authoring.
- **HTML preview**: rendered output from the Laravel renderer.
- **Responsive frame**: a viewport simulation, not a guarantee of device behavior.

Dynamic and Blade component blocks SHOULD preview through an authorized server endpoint so editor code does not reimplement PHP behavior.

## Accessibility requirements

Before `1.0`, the editor MUST provide:

- complete keyboard access to insertion, selection, movement, settings, and dialogs;
- visible focus states;
- semantic controls with accessible names;
- appropriate focus management and restoration for popovers, tooltips, menus, context menus, modals, drawers, and sidebars;
- accessible tree semantics and keyboard navigation in Document/List View;
- announcements for block moves, insertions, and deletion;
- reduced-motion support;
- sufficient color contrast in light and dark modes;
- accessible error messages tied to the relevant block or field;
- a non-drag alternative for reordering;
- responsive layouts that preserve essential commands;
- touch, zoom, IME composition, bidirectional text, and localization-expansion support.

Accessibility is a release criterion, not a polish-only milestone.

## Localization

All user-facing editor strings MUST come from a translation catalog. Block definitions SHOULD provide translation keys or resolvable labels. Persisted JSON MUST contain stable identifiers, not localized node names.

## Read-only mode

Read-only editor mode MAY be useful for review workflows, but frontend content should normally use the Blade renderer rather than booting Tiptap. Read-only mode MUST disable mutation commands and network writes, not only hide toolbars.

## Events

Exact event names are not yet locked. The editor will need documented hooks for at least:

- ready;
- document changed;
- block inserted, updated, moved, and deleted;
- validation failed;
- upload started, completed, and failed;
- autosave requested, completed, and failed;
- preview requested.

Events containing document data MUST clearly document whether the payload is mutable, normalized, and schema-validated.

# Editor UX contract

## Status and intent

This page is the normative `1.0` experience contract for the default editor rendered by `<x-laravel-blocks::editor>`. Features land incrementally, but none of the requirements below are optional polish.

Laravel Blocks MUST ship a complete Gutenberg-style editing experience. It MUST NOT stop at a textarea, a JSON form control, a Tiptap mount point, or an SDK from which every consuming application must build its own editor.

WordPress Gutenberg is the behavioral and quality benchmark. Laravel Blocks adopts the useful interaction model—not its React source tree, stored format, or package dependencies. The implementation remains Vue 3 + Tiptap 3 + Laravel-owned UI primitives and PHP APIs.

Capability maturity must be supported by comparison and browser evidence. Visual decisions follow [Laravel Blocks design principles](design-principles.md): comparable ergonomics, independent visual language.

The default editor surface is package-owned. Consumers MUST NOT be expected or supported to replace the editor shell, canvas structure, toolbar layout, Inserter, slash menu, Inspector, popovers, modals, selection UI, core `.lb-*` control classes, responsive behavior, or keyboard behavior through Blade view overrides or arbitrary CSS overrides.

Consumers extend the editor by describing capabilities—blocks, fields, patterns, media providers, and dynamic data. Laravel Blocks renders those capabilities through the master editor UI.

## Default product promise

After the package is installed, this alone MUST mount the complete default experience:

```blade
<x-laravel-blocks::editor
    name="content"
    :value="$post->content"
/>
```

The experience MUST provide three coordinated regions:

1. an Inserter for discovering blocks, patterns, and enabled reusable content;
2. a Content Canvas for direct visual editing and block manipulation;
3. a Settings Inspector for the selected block and document.

The editor may adapt or collapse regions responsively, but it MUST preserve their capabilities and state.

## V1 required capabilities

Here, **V1** means the `1.0` product contract. Delivery is incremental according to the public [roadmap](roadmap.md).

| UX capability | V1 |
| --- | ---: |
| Content canvas | ✅ |
| Direct inline editing | ✅ |
| Block selection | ✅ |
| Block toolbar | ✅ |
| Floating/bubble toolbar | ✅ |
| Popover system | ✅ |
| Link popover | ✅ |
| Slash commands | ✅ |
| Plus block inserter | ✅ |
| Block search | ✅ |
| Block categories | ✅ |
| Block appender | ✅ |
| Drag and drop | ✅ |
| Move up/down controls | ✅ |
| Context menu | ✅ |
| Settings Inspector | ✅ |
| Content/Design/Advanced tabs | ✅ |
| Nested blocks | ✅ |
| Document/List View | ✅ |
| Undo and redo | ✅ |
| Keyboard shortcuts | ✅ |
| Media picker | ✅ |
| Patterns | ✅ |
| Reusable blocks | ✅ |
| Responsive UI | ✅ |
| Accessible keyboard navigation | ✅ |

Reusable-block UI is required when that optional capability is enabled. Core editing remains database-free, and the default editor MUST explain an unavailable optional repository rather than pretending the feature is active.

## Content Canvas contract

The canvas MUST:

- provide direct `contenteditable` text editing for text-capable nodes;
- make hover, focus, selected, multi-selected, nested, disabled, insertion-point, drag, and invalid-drop states visually distinguishable;
- keep selection synchronized with the toolbar, Inspector, breadcrumbs, and List View;
- preserve the document selection while a contextual overlay is used;
- provide an empty state that says `Start writing or type / to choose a block` or its translation;
- show validation failures next to the affected block without discarding its data;
- remain usable at supported mobile, tablet, and desktop widths;
- avoid presenting raw JSON as the normal authoring surface.

A package can pass schema tests and still fail this contract. If the default result feels like a decorated textarea with JSON behind it, the product is not complete.

## Selection and command contract

One selection model and one command layer own all editor mutations. The command registry covers at least:

```text
toggleMark
setBlockType
insertBlock
insertBefore
insertAfter
duplicateBlock
deleteBlock
moveBlock
wrapBlocks
undo
redo
```

The sticky document header, unified contextual toolbar, popovers, context menu, slash menu, Inserter, Inspector, List View, drag/drop, and keyboard shortcuts MUST call those shared commands. A UI component MUST NOT create a private alternative mutation path. Rich-text and block-specific controls may appear inside the same contextual toolbar; they MUST NOT become competing persistent toolbar surfaces in the default editor.

Commands MUST expose availability, active state, disabled reason, and success/failure so every UI surface presents consistent feedback.

## Laravel Blocks UI primitives

The editor MUST use shared, namespaced primitives rather than one-off overlays and controls inside individual blocks.

Required UI primitives:

```text
Button             IconButton          Toolbar
ToolbarGroup       Popover             Dropdown
DropdownMenu       ContextMenu         Tooltip
Modal              Drawer              Sidebar
Tabs               Toggle              Select
Combobox           ColorPicker         Slider
NumberInput        TextInput           Textarea
Snackbar           Spinner             CommandMenu
```

Required block-editor components:

```text
BlockCanvas        BlockWrapper        BlockToolbar
BlockPopover       BlockMover          BlockOptionsMenu
BlockInserter      BlockAppender       BlockInspector
BlockBreadcrumb    DocumentListView
```

Required rich-text components:

```text
RichTextToolbar    LinkPopover         ColorPopover
MoreFormatsMenu    SelectionBubbleMenu
```

Primitives MUST share design tokens, focus behavior, accessible naming, layering, disabled states, error states, and keyboard conventions. They are internal package infrastructure; consumers do not have to install a separate UI library.

## Popover and overlay contract

`Popover` is infrastructure, not a block-specific popup. Every contextual overlay MUST:

- anchor to a text selection, block, control, or virtual reference;
- choose and update placement when its anchor or scroll container moves;
- shift or flip to remain inside the usable viewport;
- constrain or resize content rather than clipping essential actions;
- use the shared portal/slot and deterministic z-index system;
- preserve editor selection when interacting with its controls;
- support `Escape` dismissal and context-appropriate outside-click dismissal;
- move initial focus only when the interaction requires it;
- restore focus predictably to the invoking control or editor selection;
- expose the correct dialog, menu, listbox, toolbar, or tooltip semantics;
- support arrow-key navigation, Home/End, Enter/Space, and typeahead where the role requires them;
- avoid a modal when a small anchored interaction is sufficient;
- remain operable by keyboard, screen reader, touch, and pointer.

Only true dialogs trap focus. Tooltips MUST never contain required interactive actions. Nested overlays MUST close in stack order without losing the editor selection.

## Rich-text interaction contract

Selecting text MUST expose a contextual toolbar for the marks supported by that node. V1 includes:

```text
Bold              Italic             Underline
Strikethrough     Inline code        Highlight
Link              Superscript        Subscript
Keyboard text     Clear formatting
```

The toolbar reflects active mixed state and disabled state. It MUST NOT expose a mark forbidden by the selected node schema.

Activating Link opens an anchored popover—not a full-screen modal—with:

- a URL or replaceable internal-link search input;
- the current link value when editing;
- an explicit `Open in new tab` setting;
- apply, edit, and unlink actions;
- URL validation and safe-scheme feedback;
- Enter to apply and Escape to cancel while restoring the text selection.

## Block toolbar contract

Ordinary collapsed cursor focus inside a non-empty text block MUST NOT expose the block selection frame or a persistent block toolbar. Contextual block chrome appears only from intentional triggers:

- a non-empty text selection exposes one contextual toolbar containing the applicable block and inline controls;
- an empty focused text block keeps the toolbar hidden; the trailing document appender remains the insertion path;
- pointer hover over a block exposes one lightweight block handle that opens the contextual toolbar when activated;
- explicit block or multi-block selection exposes block-level actions when that selection mode is implemented.

Selecting a block MUST expose a toolbar composed from shared controls plus block-specific commands. It includes, where supported:

- drag handle and Move Up/Down controls;
- block type or transform control;
- alignment and block-specific primary actions;
- a More menu for lower-frequency operations.

The common More menu MUST support, when valid:

```text
Duplicate
Insert before
Insert after
Copy
Move up
Move down
Create reusable block
Delete
```

Unsupported commands are omitted or shown disabled with an explanation according to the shared command state. Destructive actions follow a consistent confirmation and undo policy.

### Heading defaults

A selected Heading MUST provide a level/transform menu covering Paragraph and Heading 1–6, plus the supported inline and alignment actions. Changing the level is a schema-valid command, not a visual font-size mutation.

### Image defaults

A selected Image MUST provide its applicable Align, Replace, Crop, Link, and More actions. Its Inspector MUST expose Content controls for media, alternative text, caption, and link; Design controls for dimensions, aspect ratio, fit, alignment, and radius; and Advanced controls supported by the shared schema.

## Inserter and appender contract

The plus Inserter, block appender, and slash menu MUST read the same registry-backed catalog as the PHP manifest.

The Inserter MUST provide:

- search by localized label, description, and keyword;
- categorized Blocks, Patterns, and enabled Reusable content views;
- keyboard and screen-reader navigation;
- recent and favorite blocks when those datasets exist;
- built-in and application PHP blocks in the same discovery flow;
- an explanation when a block or pattern is invalid at the current insertion point;
- an insertion preview or description sufficient to distinguish similar items;
- focus return to the inserted block.

The default block appender MUST be a standalone plus control after the final block. It MUST NOT be rendered as a contextual toolbar or as a second permanent header Inserter, and it MUST expose valid empty and trailing insertion without permanently cluttering the canvas.

## Slash-command contract

Typing `/` at a valid text insertion point opens a filtered command menu. Continuing to type filters by label and keywords; for example `/hea` selects Heading.

The slash menu MUST support Up/Down, Home/End, Enter, Escape, pointer selection, empty results, disabled explanations, IME composition, and focus restoration. Confirming a command replaces only the triggering slash query and inserts the selected valid node.

## Drag, drop, and movement contract

Block movement MUST provide:

- a visible drag handle;
- a drag preview that identifies the moved block(s);
- a precise insertion indicator before, after, or inside a valid container;
- immediate invalid-target feedback;
- nested-container hit testing;
- edge auto-scroll;
- document-valid transactional movement;
- Move Up/Down controls and keyboard reordering as full alternatives.

A drop MUST NOT silently land at a different ambiguous target. Failed movement preserves the original document and announces the reason.

## Inspector contract

The Settings Inspector MUST synchronize with the current block selection and render applicable controls through three named tabs: Content, Design, and Advanced. A responsive layout MAY move the tab list into a drawer or an equivalent accessible tab selector, but it MUST preserve the three-tab model and current tab state.

| Group | Responsibility |
| --- | --- |
| Content | Semantic values, text, media, links, and behavior |
| Design | Token-based color, spacing, typography, dimensions, alignment, and borders |
| Advanced | Anchor, normalized classes, responsive visibility, and allow-listed attributes |

PHP `Field` definitions and block `supports()` metadata MUST generate the normal Inspector UI automatically. A developer defining Text, Textarea, Media, Link, or Select fields MUST NOT have to write a Vue form.

Generated controls MUST include labels, help, defaults, required state, errors, conditional visibility, disabled reasons, normalization, and serialization behavior from the manifest. Hidden values follow an explicit preserve-or-clear policy. Unsupported controls MUST be omitted, not displayed as inert UI.

A tab with no controls supported by the selected block MAY be omitted; controls MUST NOT be moved into a different semantic tab merely to keep all three visible.

## Document/List View contract

Document/List View MUST mirror the nested document tree and make complex layouts manageable. It MUST:

- display block label, icon, hierarchy, and selection;
- synchronize selection and focus with the canvas;
- expand and collapse containers;
- reveal the selected block automatically without destroying the user's expansion choices;
- support keyboard navigation and accessible tree semantics;
- provide the same valid move/reorder commands as the canvas;
- indicate locked, invalid, hidden, reusable, and missing blocks;
- remain usable when deep nesting makes direct canvas drag/drop difficult.

## History and keyboard contract

Undo and redo MUST operate on editor transactions across toolbar, Inspector, insertion, movement, formatting, and drag/drop actions. UI-only state such as opening a tooltip does not create content history.

V1 MUST document and implement platform-correct shortcuts for undo, redo, duplicate, delete, select all, link, common marks, slash insertion, escape-to-parent selection, arrow navigation, and keyboard movement. Shortcuts MUST avoid browser/assistive-technology conflicts and be discoverable in a keyboard reference.

## Media picker contract

The default editor MUST provide a provider-backed media picker with:

- browse, search, upload, drag/drop upload, and selection;
- progress, cancellation, retry, validation, and clear failure states;
- replace and metadata editing where the provider allows them;
- alt-text guidance for images;
- permission-aware actions and provider capabilities;
- URL-only and stable-reference provider support;
- focus restoration to the invoking block.

The media picker uses the replaceable PHP media contract. It does not require a Laravel Blocks media table.

## Patterns and reusable content

Patterns are discoverable in the Inserter and copy their blocks into the current document. After insertion, those blocks are independent and fully editable. Built-in and developer-registered patterns require no database.

Reusable blocks remain references to shared content. When the optional repository capability is enabled, the editor MUST support discovery, insertion, permission-aware editing, and Detach to independent blocks. Copy semantics and reference semantics MUST never be presented as the same action.

## Responsive and accessibility contract

The editor MUST remain functional in its documented responsive range. A narrow layout MAY convert the Inspector to a drawer and move secondary actions into menus, but it MUST NOT remove essential editing capabilities.

Before `1.0`, automated and manual acceptance MUST cover:

- keyboard-only authoring and reordering;
- visible focus and focus restoration;
- popover, menu, context-menu, modal, drawer, and tooltip semantics;
- screen-reader labels, state, errors, and live announcements;
- accessible tree navigation in List View;
- a non-drag movement path;
- sufficient contrast and non-color state indicators;
- reduced motion;
- touch targets and zoom;
- IME composition, bidirectional text, and localization expansion.

Accessibility failures block release; they are not deferred cosmetic debt.

## Precompiled delivery contract

All essential editor JavaScript, CSS, Vue, Tiptap, ProseMirror, positioning logic, icons, and UI primitives MUST ship precompiled with the Composer package.

The consuming application MUST NOT require:

```text
Node.js
npm / pnpm / yarn
Vue
Tiptap
ProseMirror
Floating UI
Vite configuration
a frontend build
```

for the default editor. Package maintainers build and verify `dist/laravel-blocks.js`, `dist/laravel-blocks.css`, and the versioned asset manifest before release.

## Acceptance rule

A feature is not accepted because a command exists in JavaScript. Its visible state, pointer behavior, keyboard behavior, focus lifecycle, screen-reader behavior, error recovery, responsive behavior, and browser tests must satisfy this contract.

The default editor is release-ready only when a Laravel developer can install the Composer package, render the Blade component, and immediately provide authors with a polished visual editor without assembling a frontend editor stack.

## Benchmark references

- [WordPress Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [WordPress block-editor package](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/)
- [WordPress components package](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-components/)
- [WordPress RichText reference](https://developer.wordpress.org/block-editor/reference-guides/richtext/)
- [WordPress block patterns](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-patterns/)

These references establish the benchmark only. Laravel Blocks owns its implementation and public contracts.

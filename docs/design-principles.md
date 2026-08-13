# Laravel Blocks design principles

## Purpose

Laravel Blocks uses Gutenberg as an interaction and capability benchmark while maintaining an independent visual identity. Familiar behavior lowers the learning curve; a Laravel Blocks-owned design system prevents the product from becoming a visual WordPress clone.

The governing rule is:

> Comparable editing capability and ergonomics, independent visual language.

## Core principles

### 1. Familiar interaction, independent identity

Selection, insertion, contextual controls, nested editing, and keyboard behavior SHOULD feel learnable to authors familiar with modern block editors. Component shapes, styling, icons, spacing, and motion MUST be designed for Laravel Blocks.

### 2. Simple and calm

Default screens MUST minimize cognitive load. The editor presents the primary action and current context before exposing secondary configuration.

### 3. Content remains visually dominant

The canvas and authored content are the visual center. Editor chrome MUST support writing rather than compete with it through excessive color, borders, panels, or persistent controls.

### 4. Controls appear contextually

Block-specific controls appear when a block or selection needs them. Global controls remain stable. Contextual UI MUST NOT cause disruptive layout shifts or hide the user's current selection.

### 5. Avoid excessive permanent chrome

Frequently needed document controls MAY remain visible. Infrequent block actions belong in contextual toolbars, menus, Inspector tabs, or discoverable commands rather than permanent button rows.

Laravel Blocks uses a two-toolbar default model:

- one sticky document header for global actions such as Inserter, Undo, Redo, and Settings;
- one contextual toolbar for the active block and text selection.

Block-specific, rich-text, and transform controls MUST consolidate into that contextual toolbar instead of competing through separate always-visible rows. The Settings Inspector MUST stay closed until the author explicitly opens it.

### 6. Prefer popovers over modals for small actions

Links, compact choices, transforms, and contextual settings use anchored popovers. Modals are reserved for workflows that need focused space, such as a media library or destructive confirmation.

### 7. Use progressive disclosure

The common path is immediately usable. Advanced settings appear only when relevant and are grouped into Content, Design, and Advanced. Hidden complexity MUST remain discoverable and accessible.

### 8. Preserve keyboard and pointer parity

Every essential pointer interaction has a keyboard path. Focus, active state, disabled reasons, shortcuts, announcements, and non-drag movement are designed with the component—not added after visual completion.

### 9. Use no WordPress visual assets

Laravel Blocks MUST NOT ship WordPress CSS, Dashicons, Gutenberg screenshots as implementation templates, copied component styling, or visual assets derived from WordPress. Generic interaction conventions are not permission to reproduce the screen pixel for pixel.

### 10. Laravel Blocks owns its design tokens

All editor components consume package-owned semantic tokens. Tokens express Laravel Blocks intent and MUST NOT alias WordPress CSS variables or depend on a consuming application's Tailwind theme.

## Design token families

The UI system owns at least these token families:

| Family | Responsibility |
| --- | --- |
| Radius | Control, menu, popover, panel, and modal corner hierarchy |
| Spacing | Internal control spacing, component gaps, canvas rhythm, and panel density |
| Typography | Editor UI families, sizes, weights, line heights, and labels |
| Neutral colors | Canvas, surfaces, borders, text, muted text, and disabled states |
| Accent colors | Selection, focus, primary actions, links, and semantic emphasis |
| Semantic colors | Success, warning, danger, info, and validation states |
| Elevation | Toolbar, popover, dropdown, drawer, and modal layering |
| Toolbar metrics | Height, control size, group spacing, divider, and responsive density |
| Control density | Comfortable default plus documented compact behavior where needed |
| Motion | Duration, easing, entrance/exit, reorder feedback, and reduced-motion fallback |
| Focus | Visible ring, offset, contrast, and focus-within treatment |
| Z-index | Canvas, sticky toolbar, popover, dropdown, drawer, modal, and toast order |

Exact token values are introduced with the relevant UI implementation. Minor token decisions must preserve these principles; changing the product's visual direction requires explicit maintainer approval.

Current editor chrome uses a rounded floating control language: contextual toolbars and compact popovers use large radii in the 16-24px range, thin low-contrast borders, and soft elevation instead of hard strokes or heavy shadows. Active controls use a high-contrast amber state with dark text, while inactive controls stay muted slate with subtle hover fill. Toolbar groups use thin dividers to separate command families without making the chrome visually louder than the canvas.

Editor icons are stroke-based SVGs with round caps/joins and are organized as one isolated icon module per symbol behind the shared `Icon` primitive. The icon registry may aggregate those modules for rendering, but new icons should not be added as anonymous path arrays in a monolithic sprite file.

## Interaction styling rules

- Hover MUST enhance discoverability but MUST NOT be the only way to reveal an essential keyboard action.
- Focus MUST remain visible even when hover and selected states overlap.
- Selected blocks MUST be clear without visually overpowering their content; hard strokes around authored content are not the default selection treatment.
- Toolbars MUST group related actions and preserve a consistent height and target size.
- Popovers MUST look anchored to their invoking context without covering the selected content unnecessarily.
- Menus MUST use consistent active, destructive, disabled, shortcut, and submenu treatments.
- Inspector controls MUST use the same field rhythm, labels, help, errors, and disabled states across built-in and PHP-generated blocks.
- Drag/drop MUST show the moving object and exact insertion target; color alone is insufficient.
- Empty, loading, error, and recovery states MUST use the same component vocabulary as successful states.

## Visual identity boundary

| Learn from the benchmark | Own independently |
| --- | --- |
| Contextual toolbar behavior | Toolbar shape, spacing, surfaces, and icons |
| Inserter discoverability | Inserter layout details, typography, and visual grouping |
| Popover ergonomics | Popover radius, elevation, motion, and control styling |
| Inspector information architecture | Tab styling, panel surfaces, and field appearance |
| List View hierarchy and navigation | Tree visuals, indentation, icons, and selection styling |
| Media workflow capability | Media-library composition and visual language |
| Keyboard/accessibility conventions | Focus visuals and Laravel Blocks shortcut presentation |

Similarity in behavior is acceptable when it follows a well-understood interaction convention. Similarity in visual composition MUST have an explicit Laravel Blocks rationale, not “Gutenberg looks like this.”

## Content and preview fidelity

The editor distinguishes package UI from authored content:

- application content styles belong inside the canvas or preview boundary;
- package controls use Laravel Blocks tokens;
- frontend Blade rendering remains the authoritative output preview;
- editor-only selection handles, labels, placeholders, and overlays MUST NOT leak into frontend markup;
- visual approximation in a generic NodeView MUST clearly indicate when server-rendered output may differ.

The `.lb-*` editor control classes, toolbar structure, Inspector layout, overlay markup, and package design tokens are implementation-owned unless a future documented theming API exposes a specific token or option. Applications should not treat internal editor CSS selectors as a stable customization contract.

## Responsive behavior

Responsive design preserves capability rather than merely shrinking controls:

- secondary actions MAY collapse into menus;
- the Inspector MAY become a drawer;
- toolbars MAY reposition or scroll according to a documented pattern;
- the canvas MUST retain a usable editing width;
- no essential command may disappear solely because the viewport is narrow;
- touch targets, zoom, safe areas, and virtual keyboards are part of acceptance.

## Motion

Motion communicates relationship, state change, insertion, movement, and overlay origin. It MUST be brief, interruptible, and non-essential to comprehension. Reduced-motion mode removes or simplifies spatial animation without removing state feedback.

## Accessibility as design quality

Accessibility is part of interaction design and visual quality. A visually attractive component is incomplete when keyboard order, focus return, semantics, contrast, zoom, touch targets, announcements, IME, or bidirectional input fail.

## Evaluation questions

Every UI implementation asks:

1. Is the authored content still dominant?
2. Is the next likely action discoverable without permanent clutter?
3. Do pointer, keyboard, touch, and assistive-technology users receive equivalent capability?
4. Are focus, selected, disabled, loading, error, and recovery states explicit?
5. Does the component reuse Laravel Blocks primitives and tokens?
6. Does it preserve the shared selection and command contracts?
7. Is any visual decision copied from Gutenberg without a Laravel Blocks rationale?
8. Does browser evidence justify the claimed maturity?

If the last question cannot be answered with evidence, the capability is not polished or release-ready.

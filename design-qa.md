**Design QA**

- Source visual truth: Gutenberg toolbar and trailing plus screenshots supplied in the maintainer conversation on 2026-08-13.
- Implementation screenshots: `test-results/unified-toolbar-heading.png` and `test-results/trailing-appender.png`.
- Viewport: 1280 x 720 CSS pixels, device scale factor 1.
- Source dimensions: multiple cropped desktop reference images; implementation dimensions: 1280 x 720 pixels. The review compares component structure and interaction state because the source crops do not provide a full-page viewport.
- State: selected Heading level 4 with complete contextual toolbar; trailing plus after a final Paragraph block.
- Full-view evidence: the implementation renders one bordered contextual toolbar above the active Heading and one standalone plus after the final block. No header plus, empty toolbar, or selection-frame toolbar is present.
- Focused-region evidence: the toolbar keeps one continuous frame and stable group order: Transform, drag/move, Heading level, inline controls, More. The trailing plus is a single icon control aligned to the right-bottom edge of the final block.

**Findings**

- No actionable P0, P1, or P2 mismatch remains for the requested toolbar structure and plus placement.
- Typography uses the existing Laravel Blocks UI system instead of copying Gutenberg styling.
- Spacing and border treatment preserve Laravel Blocks tokens while matching the compact reference density.
- Colors remain neutral and accessible within the existing editor palette.
- Icons use the package icon library; no screenshot assets are embedded in production UI.
- Copy remains concise and block-specific; Heading level is represented as H1-H6.

**Interaction Evidence**

- Playwright verifies collapsed typing and empty focus keep the toolbar hidden.
- Hover exposes one lightweight handle; activation opens the single complete toolbar.
- Heading level mutation, Paragraph transform, Code mark omission, movement, More options, link editing, dismissal, focus recovery, and scroll preservation pass.
- The trailing plus opens the manifest Inserter and inserts after the actual final block.
- Browser console produced no errors during the verified scenarios.

**Comparison History**

- Iteration 1: complete toolbar width was clipped by the generic popover max-width and sat too close to Heading content.
- Fix: applied content-sized toolbar width, viewport cap, and increased block offset.
- Iteration 2: visual capture shows the complete toolbar frame with all groups contained and clear separation from content.

**Follow-up Polish**

- P3: add dedicated alignment controls when that command family is implemented.

final result: passed

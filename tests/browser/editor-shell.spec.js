import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

let server;
let baseUrl;

const emptyDocument = {
  type: 'doc',
  attrs: { schemaVersion: 1 },
  content: [],
};

const existingDocument = {
  type: 'doc',
  attrs: { schemaVersion: 1 },
  content: [{
    type: 'paragraph',
    content: [{ type: 'text', text: 'Existing value' }],
  }],
};

const packageDefaultManifest = {
  manifestVersion: 1,
  documentSchemaVersion: 1,
  categories: [
    { name: 'text', label: 'Text' },
  ],
  blocks: [
    {
      name: 'paragraph',
      label: 'Paragraph',
      description: 'Write a text paragraph.',
      category: 'text',
      icon: 'paragraph',
      keywords: ['text', 'copy', 'body'],
      supports: { inserter: true },
    },
    {
      name: 'heading',
      label: 'Heading',
      description: 'Introduce a section with a heading.',
      category: 'text',
      icon: 'heading',
      fields: [{
        constraints: { allowedValues: [1, 2, 3, 4, 5, 6] },
        default: 2,
        group: 'content',
        help: 'Choose the heading level.',
        label: 'Level',
        name: 'level',
        path: 'attrs.level',
        required: true,
        type: 'select',
        ui: {},
      }],
      keywords: ['title', 'headline', 'section'],
      supports: { inserter: true },
    },
  ],
};

const manifest = {
  ...packageDefaultManifest,
  categories: [
    ...packageDefaultManifest.categories,
    { name: 'design', label: 'Design' },
  ],
  blocks: [
    ...packageDefaultManifest.blocks,
    {
      name: 'bulletList',
      label: 'List',
      description: 'Create a bulleted list',
      category: 'text',
      keywords: ['list'],
      supports: { inserter: true },
    },
    {
      name: 'featureCard',
      label: 'Feature Card',
      category: 'design',
      supports: { inserter: true },
    },
  ],
};

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (url.pathname === '/dist/laravel-blocks.js') {
      response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      response.end(await readFile(path.resolve('dist/laravel-blocks.js'), 'utf8'));

      return;
    }

    if (url.pathname === '/dist/laravel-blocks.css') {
      response.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
      response.end(await readFile(path.resolve('dist/laravel-blocks.css'), 'utf8'));

      return;
    }

    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(editorFixture());

      return;
    }

    if (url.pathname === '/default') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(editorFixture(packageDefaultManifest));

      return;
    }

    response.writeHead(404);
    response.end('Not found');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('mounts null and JSON editor roots and synchronizes hidden document JSON', async ({ page }) => {
  await page.goto(baseUrl);

  await expect(page.locator('#editor-null[data-laravel-blocks-mounted="true"]')).toHaveCount(1);
  await expect(page.locator('#editor-json[data-laravel-blocks-mounted="true"]')).toHaveCount(1);
  await expect(page.locator('#editor-json [data-laravel-blocks-canvas]')).toContainText('Existing value');

  expect(JSON.parse(await page.locator('#editor-null [data-laravel-blocks-input]').inputValue()))
    .toEqual(emptyDocument);
  expect(JSON.parse(await page.locator('#editor-json [data-laravel-blocks-input]').inputValue()))
    .toEqual(existingDocument);

  await page.locator('#editor-null [data-laravel-blocks-canvas]').click();
  await page.keyboard.type('Hello shell');

  await expect.poll(async () => JSON.parse(
    await page.locator('#editor-null [data-laravel-blocks-input]').inputValue(),
  )).toEqual({
    type: 'doc',
    attrs: { schemaVersion: 1 },
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello shell' }],
    }],
  });
});

test('executes editor mutations through the shared command API', async ({ page }) => {
  await page.goto(baseUrl);

  const root = page.locator('#editor-null');
  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');

  await expect(root).toHaveAttribute('data-laravel-blocks-mounted', 'true');
  await canvas.click();
  await page.keyboard.type('Command title');

  const headingResult = await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('setHeading', { level: 2 }));

  expect(headingResult).toMatchObject({
    name: 'setHeading',
    executed: true,
  });

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Command title' }],
  });

  const paragraphResult = await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .commands
    .run('setParagraph'));

  expect(paragraphResult).toMatchObject({
    name: 'setParagraph',
    executed: true,
  });

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Command title' }],
  });

  await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('toggleBold'));
  await page.keyboard.type(' Bold');

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Command title' },
      { type: 'text', marks: [{ type: 'bold' }], text: ' Bold' },
    ],
  });

  await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('toggleBold'));
  await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('toggleItalic'));
  await page.keyboard.type(' Italic');

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Command title' },
      { type: 'text', marks: [{ type: 'bold' }], text: ' Bold' },
      { type: 'text', marks: [{ type: 'italic' }], text: ' Italic' },
    ],
  });

  const beforeUndo = await editorInputValue(page, '#editor-null');

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('undo'))).toMatchObject({
    name: 'undo',
    executed: true,
  });
  await expect.poll(() => editorInputValue(page, '#editor-null')).not.toBe(beforeUndo);

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('redo'))).toMatchObject({
    name: 'redo',
    executed: true,
  });
  await expect.poll(() => editorInputValue(page, '#editor-null')).toBe(beforeUndo);

  const selection = await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .selection());
  const snapshot = await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .commandSnapshot({ setHeading: { level: 2 } }));

  expect(selection).toMatchObject({
    empty: true,
  });
  expect(snapshot.map((command) => command.name)).toEqual([
    'focus',
    'selectBlock',
    'toggleBold',
        'toggleItalic',
        'setLink',
        'unsetLink',
        'duplicateBlock',
        'deleteBlock',
        'insertBlockBefore',
        'insertBlockAfter',
        'moveBlockUp',
        'moveBlockDown',
        'moveBlockToIndex',
        'insertManifestBlock',
        'updateBlockAttrs',
        'setParagraph',
        'setHeading',
        'setBlockquote',
        'setCodeBlock',
        'toggleBulletList',
        'undo',
    'redo',
  ]);
});

test('uses visible history controls and platform history shortcuts', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const header = page.locator('#editor-null [data-laravel-blocks-editor-header]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-history-toolbar]');
  const undo = page.locator('#editor-null [data-laravel-blocks-history-command="undo"]');
  const redo = page.locator('#editor-null [data-laravel-blocks-history-command="redo"]');

  await expect(header).toBeVisible();
  await expect(toolbar).toBeVisible();
  await expect(undo.locator('svg.lb-ui-icon path')).toHaveCount(2);
  await expect(redo.locator('svg.lb-ui-icon path')).toHaveCount(2);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await canvas.click();
  await page.keyboard.type('History text');

  const typed = await editorInputValue(page, '#editor-null');

  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await undo.click();

  await expect(canvas).toBeFocused();
  await expect.poll(() => editorInputValue(page, '#editor-null')).not.toBe(typed);
  await expect(redo).toBeEnabled();

  await redo.click();

  await expect(canvas).toBeFocused();
  await expect.poll(() => editorInputValue(page, '#editor-null')).toBe(typed);

  await canvas.click();
  await page.keyboard.type(' Shortcut');

  const withShortcut = await editorInputValue(page, '#editor-null');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');

  await expect(canvas).toBeFocused();
  await expect.poll(() => editorInputValue(page, '#editor-null')).not.toBe(withShortcut);

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Shift+Z');

  await expect(canvas).toBeFocused();
  await expect.poll(() => editorInputValue(page, '#editor-null')).toBe(withShortcut);
  await expect(undo).toBeEnabled();
});

test('formats selected text through the unified contextual toolbar', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-contextual-toolbar]');
  const richToolbar = page.locator('#editor-null [data-laravel-blocks-rich-text-toolbar]');
  const bold = page.locator('#editor-null [data-laravel-blocks-contextual-command="toggleBold"]');
  const italic = page.locator('#editor-null [data-laravel-blocks-contextual-command="toggleItalic"]');

  await expect(richToolbar).toHaveCount(0);
  await expect(toolbar).toBeHidden();

  await canvas.click();
  await page.keyboard.type('Toolbar text');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');

  await expect(toolbar).toBeVisible();
  await expect(bold).toHaveAttribute('aria-pressed', 'false');
  await expect(italic).toHaveAttribute('aria-pressed', 'false');

  await bold.click();

  await expect(canvas).toBeFocused();
  await expect(bold).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => firstTextMarkTypes(page, '#editor-null')).toEqual(['bold']);

  await italic.click();

  await expect(canvas).toBeFocused();
  await expect(italic).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => firstTextMarkTypes(page, '#editor-null')).toEqual(['bold', 'italic']);

  await page.keyboard.press('ArrowRight');

  await expect(toolbar).toBeVisible();
});

test('edits links through the unified contextual link popover', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const link = page.locator('#editor-null [data-laravel-blocks-contextual-command="openLink"]');
  const popover = page.locator('#editor-null [data-laravel-blocks-link-popover]');
  const input = page.locator('#editor-null [data-laravel-blocks-link-input]');
  const apply = page.locator('#editor-null [data-laravel-blocks-link-apply]');
  const target = page.locator('#editor-null [data-laravel-blocks-link-target]');
  const unlink = page.locator('#editor-null [data-laravel-blocks-link-unlink]');

  await canvas.click();
  await page.keyboard.type('Linked text');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');

  await link.click();
  await expect(popover).toBeVisible();
  await expect(input).toBeFocused();

  await input.fill('javascript:alert(1)');
  await apply.click();

  await expect(page.locator('#editor-null [data-laravel-blocks-link-error]')).toContainText('http');
  await expect.poll(() => firstTextMark(page, '#editor-null', 'link')).toBeNull();

  await input.fill('example.com/docs');
  await target.check();
  await apply.click();

  await expect(popover).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstTextMark(page, '#editor-null', 'link')).toMatchObject({
    attrs: {
      href: 'https://example.com/docs',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
    type: 'link',
  });

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await link.click();
  await expect(input).toHaveValue('https://example.com/docs');
  await input.fill('https://changed.example');
  await page.keyboard.press('Escape');

  await expect(popover).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstTextMark(page, '#editor-null', 'link')).toMatchObject({
    attrs: {
      href: 'https://example.com/docs',
    },
  });

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await link.click();
  await unlink.click();

  await expect(popover).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstTextMark(page, '#editor-null', 'link')).toBeNull();
});

test('transforms the current block through the unified contextual toolbar', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-contextual-toolbar]');
  const transform = page.locator('#editor-null [data-laravel-blocks-block-transform]');
  const menu = page.locator('#editor-null [data-laravel-blocks-block-transform-menu]');

  await canvas.click();
  await page.keyboard.type('Transform me');

  await expect(toolbar).toBeVisible();
  await transform.click();
  await expect(menu).toBeVisible();

  await page.locator('#editor-null [data-laravel-blocks-block-transform-item="setHeading"]').click();

  await expect(canvas).toBeFocused();
  await expect(menu).toBeHidden();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: 'Transform me' }],
  });

  await transform.click();
  await page.locator('#editor-null [data-laravel-blocks-block-transform-item="setParagraph"]').click();

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Transform me' }],
  });
});

test('manages the current top-level block through contextual block controls', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const wrapper = page.locator('#editor-null [data-laravel-blocks-block-wrapper]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-block-toolbar]');
  const options = page.locator('#editor-null [data-laravel-blocks-block-options]');
  const menu = page.locator('#editor-null [data-laravel-blocks-block-options-menu]');

  await canvas.click();
  await page.keyboard.type('First block');

  await expect(wrapper).toBeVisible();
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('svg.lb-ui-icon')).not.toHaveCount(0);
  await expect(page.locator('#editor-null [data-laravel-blocks-block-label]')).toContainText('Paragraph');
  await expect(page.locator('#editor-null [data-laravel-blocks-block-command="moveBlockUp"]')).toBeDisabled();

  await options.click();
  await expect(menu).toBeVisible();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="duplicateBlock"]').click();

  await expect(canvas).toBeFocused();
  await expect.poll(() => editorDocument(page, '#editor-null')).toMatchObject({
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
    ],
  });

  await options.click();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="insertBlockBefore"]').click();

  await expect.poll(() => editorDocument(page, '#editor-null')).toMatchObject({
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
    ],
  });

  await page.locator('#editor-null [data-laravel-blocks-block-command="moveBlockDown"]').click();

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'paragraph',
    content: [{ type: 'text', text: 'First block' }],
  });

  await options.click();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="deleteBlock"]').click();

  await expect(canvas).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.length).toBe(2);
});

test('reorders top-level blocks through pointer drag and drop feedback', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const dragHandle = page.locator('#editor-null [data-laravel-blocks-block-drag-handle]');
  const indicator = page.locator('#editor-null [data-laravel-blocks-block-drop-indicator]');

  await page.evaluate(() => {
    const editor = document.querySelector('#editor-null').__laravelBlocksEditor.editor();

    editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second block' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Third block' }] },
      ],
    });
    editor.commands.focus('end');
  });

  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['First block', 'Second block', 'Third block']);

  await expect(dragHandle).toBeEnabled();

  const initialHandleBox = await dragHandle.boundingBox();
  const thirdBlockBox = await canvas.locator(':scope > *').nth(2).boundingBox();

  expect(initialHandleBox).not.toBeNull();
  expect(thirdBlockBox).not.toBeNull();

  await page.mouse.move(
    initialHandleBox.x + (initialHandleBox.width / 2),
    initialHandleBox.y + (initialHandleBox.height / 2),
  );
  await page.mouse.down();
  await page.mouse.move(thirdBlockBox.x + (thirdBlockBox.width / 2), thirdBlockBox.y + 2, { steps: 4 });

  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveAttribute('data-laravel-blocks-block-drop-state', 'invalid');

  await page.mouse.up();

  await expect(indicator).toBeHidden();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['First block', 'Second block', 'Third block']);

  const handleBox = await dragHandle.boundingBox();
  const firstBlockBox = await canvas.locator(':scope > *').first().boundingBox();

  expect(handleBox).not.toBeNull();
  expect(firstBlockBox).not.toBeNull();

  await page.mouse.move(handleBox.x + (handleBox.width / 2), handleBox.y + (handleBox.height / 2));
  await page.mouse.down();
  await page.mouse.move(firstBlockBox.x + (firstBlockBox.width / 2), firstBlockBox.y + 2, { steps: 6 });

  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveAttribute('data-laravel-blocks-block-drop-state', 'valid');
  await expect(indicator).toHaveAttribute('data-laravel-blocks-block-drop-index', '0');

  await page.mouse.up();

  await expect(indicator).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['Third block', 'First block', 'Second block']);
});

test('navigates and reorders top-level blocks through document list view', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const toggle = page.locator('#editor-null [data-laravel-blocks-document-list-toggle]');
  const panel = page.locator('#editor-null [data-laravel-blocks-document-list]');
  const items = page.locator('#editor-null [data-laravel-blocks-document-list-item]');

  await page.evaluate(() => {
    const editor = document.querySelector('#editor-null').__laravelBlocksEditor.editor();

    editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second block' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Third block' }] },
      ],
    });
    editor.commands.focus('end');
  });

  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['First block', 'Second block', 'Third block']);

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();

  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('First block');
  await expect(items.nth(1)).toContainText('Second block');
  await expect(items.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(items.nth(2)).toBeFocused();

  await page.keyboard.press('Home');
  await expect(items.nth(0)).toBeFocused();
  await page.keyboard.press('End');
  await expect(items.nth(2)).toBeFocused();

  await items.nth(0).click();

  await expect(canvas).toBeFocused();
  await expect.poll(() => selectedBlockIndex(page, '#editor-null')).toBe(0);
  await expect(items.nth(0)).toHaveAttribute('aria-current', 'true');

  await page
    .locator('#editor-null [data-laravel-blocks-document-list-command="moveBlockDown"][data-laravel-blocks-document-list-command-index="0"]')
    .click();

  await expect(canvas).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['Second block', 'First block', 'Third block']);
  await expect.poll(() => selectedBlockIndex(page, '#editor-null')).toBe(1);
  await expect(page.locator('#editor-null [data-laravel-blocks-document-list-item-index="1"]'))
    .toHaveAttribute('aria-current', 'true');

  await panel.locator('[data-laravel-blocks-document-list-close]').click();

  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(canvas).toBeFocused();

  await page.keyboard.type(' Recovered');

  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode).join('|'))
    .toContain('Recovered');
});

test('inserts manifest blocks through the appender inserter', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const appender = page.locator('#editor-null [data-laravel-blocks-block-appender]');
  const inserter = page.locator('#editor-null [data-laravel-blocks-block-inserter]');
  const search = page.locator('#editor-null [data-laravel-blocks-block-search]');
  const heading = page.locator('#editor-null [data-laravel-blocks-block-inserter-item="heading"]');
  const unsupported = page.locator('#editor-null [data-laravel-blocks-block-inserter-item="featureCard"]');

  await canvas.click();
  await page.keyboard.type('Start');

  await expect(appender.locator('svg.lb-ui-icon path')).toHaveCount(2);
  await appender.click();
  await expect(inserter).toBeVisible();
  await expect(search).toBeFocused();

  await search.fill('heading');
  await expect(heading).toBeVisible();
  await expect(heading).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('Enter');

  await expect(inserter).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(async () => {
    const document = await editorDocument(page, '#editor-null');

    return document.content.slice(0, 2);
  }).toEqual([
    { type: 'paragraph', content: [{ type: 'text', text: 'Start' }] },
    { type: 'heading', attrs: { level: 2 } },
  ]);

  await appender.click();
  await search.fill('feature');
  await expect(unsupported).toBeDisabled();
  await expect(unsupported).toHaveAttribute(
    'data-laravel-blocks-block-inserter-disabled-reason',
    'This block is not supported by the current editor bundle yet.',
  );

  await page.keyboard.press('Escape');
  await expect(inserter).toBeHidden();
});

test('uses the package default text manifest for appender, slash, and inspector flows', async ({ page }) => {
  await page.goto(`${baseUrl}/default`);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const appender = page.locator('#editor-null [data-laravel-blocks-block-appender]');
  const inserter = page.locator('#editor-null [data-laravel-blocks-block-inserter]');
  const search = page.locator('#editor-null [data-laravel-blocks-block-search]');
  const inspector = page.locator('#editor-null [data-laravel-blocks-inspector]');
  const toggle = page.locator('#editor-null [data-laravel-blocks-inspector-toggle]');
  const level = page.locator('#editor-null [data-laravel-blocks-inspector-field="level"]');

  await canvas.click();
  await page.keyboard.type('Default paragraph');

  await appender.click();
  await expect(inserter).toBeVisible();
  await search.fill('paragraph');
  await page.keyboard.press('Enter');

  await expect(inserter).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(async () => {
    const document = await editorDocument(page, '#editor-null');

    return document.content.slice(0, 2);
  }).toEqual([
    { type: 'paragraph', content: [{ type: 'text', text: 'Default paragraph' }] },
    { type: 'paragraph' },
  ]);

  await page.keyboard.press('/');
  await page.keyboard.type('hea');
  await page.keyboard.press('Enter');

  await expect.poll(async () => {
    const document = await editorDocument(page, '#editor-null');

    return document.content.slice(0, 2);
  }).toEqual([
    { type: 'paragraph', content: [{ type: 'text', text: 'Default paragraph' }] },
    { type: 'heading', attrs: { level: 2 } },
  ]);

  await expect(inspector).toBeHidden();
  await toggle.click();
  await expect(inspector).toBeVisible();
  await expect(level).toHaveValue('2');

  await level.selectOption('4');

  await expect(canvas).toBeFocused();
  await expect.poll(async () => {
    const document = await editorDocument(page, '#editor-null');

    return document.content.slice(0, 2);
  }).toEqual([
    { type: 'paragraph', content: [{ type: 'text', text: 'Default paragraph' }] },
    { type: 'heading', attrs: { level: 4 } },
  ]);
});

test('replaces an empty text block through slash commands', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const slash = page.locator('#editor-null [data-laravel-blocks-slash-command]');
  const query = page.locator('#editor-null [data-laravel-blocks-slash-query]');
  const heading = page.locator('#editor-null [data-laravel-blocks-slash-item="heading"]');
  const unsupported = page.locator('#editor-null [data-laravel-blocks-slash-item="featureCard"]');

  await canvas.click();
  await page.keyboard.press('/');

  await expect(slash).toBeVisible();
  await expect(query).toHaveAttribute('data-laravel-blocks-slash-query', '');

  await page.keyboard.type('feature');

  await expect(unsupported).toBeDisabled();
  await expect(unsupported).toHaveAttribute(
    'data-laravel-blocks-slash-disabled-reason',
    'This block is not supported by the current editor bundle yet.',
  );

  await page.keyboard.press('Escape');
  await expect(slash).toBeHidden();
  expect(await firstContentNode(page, '#editor-null')).toEqual({ type: 'paragraph' });

  await page.keyboard.press('/');
  await page.keyboard.type('hea');

  await expect(query).toHaveAttribute('data-laravel-blocks-slash-query', 'hea');
  await expect(heading).toBeVisible();
  await expect(heading).toHaveAttribute('data-laravel-blocks-slash-item-state', 'active');

  await page.keyboard.press('Enter');

  await expect(slash).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'heading',
    attrs: { level: 2 },
  });
});

test('edits selected block fields through the manifest-generated inspector', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const inspector = page.locator('#editor-null [data-laravel-blocks-inspector]');
  const toggle = page.locator('#editor-null [data-laravel-blocks-inspector-toggle]');
  const level = page.locator('#editor-null [data-laravel-blocks-inspector-field="level"]');

  await canvas.click();
  await page.keyboard.press('/');
  await page.keyboard.type('hea');
  await page.keyboard.press('Enter');

  await expect(inspector).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();

  await expect(inspector).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#editor-null [data-laravel-blocks-inspector-title]')).toContainText('Heading');
  await expect(level).toBeVisible();
  await expect(level).toHaveValue('2');

  await level.selectOption('3');

  await expect(canvas).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'heading',
    attrs: { level: 3 },
  });

  await page.locator('#editor-null [data-laravel-blocks-inspector-tab="design"]').click();
  await expect(page.locator('#editor-null [data-laravel-blocks-inspector-panel="design"]')).toBeVisible();
  await expect(page.locator('#editor-null [data-laravel-blocks-inspector-empty]'))
    .toContainText('No design settings');

  await page.locator('#editor-null [data-laravel-blocks-inspector-tab="advanced"]').click();
  await expect(page.locator('#editor-null [data-laravel-blocks-inspector-panel="advanced"]')).toBeVisible();
  await expect(page.locator('#editor-null [data-laravel-blocks-inspector-empty]'))
    .toContainText('No advanced settings');
});

function editorFixture(editorManifest = manifest) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Laravel Blocks editor shell smoke</title>
  <link rel="stylesheet" href="/dist/laravel-blocks.css">
</head>
<body>
  ${editorRoot('editor-null', 'content', emptyDocument, editorManifest)}
  ${editorRoot('editor-json', 'body', existingDocument, editorManifest)}
  <script type="module" src="/dist/laravel-blocks.js"></script>
</body>
</html>`;
}

function editorRoot(id, name, document, editorManifest) {
  const payload = JSON.stringify({
    id,
    name,
    document,
    manifest: editorManifest,
    placeholder: 'Start writing or type / to choose a block',
  });
  const hiddenValue = JSON.stringify(document).replaceAll('"', '&quot;');

  return `<div id="${id}" class="lb-editor" data-laravel-blocks-root data-laravel-blocks-editor>
    <input type="hidden" name="${name}" value="${hiddenValue}" data-laravel-blocks-input>
    <script type="application/json" data-laravel-blocks-payload>${payload}</script>
    <div class="lb-editor__frame" data-laravel-blocks-mount></div>
  </div>`;
}

async function editorInputValue(page, selector) {
  return page.locator(`${selector} [data-laravel-blocks-input]`).inputValue();
}

async function editorDocument(page, selector) {
  return JSON.parse(await editorInputValue(page, selector));
}

async function firstContentNode(page, selector) {
  const document = await editorDocument(page, selector);

  return document.content?.[0] ?? null;
}

async function firstTextMarkTypes(page, selector) {
  const node = await firstContentNode(page, selector);

  return (node?.content?.[0]?.marks ?? []).map((mark) => mark.type).sort();
}

async function firstTextMark(page, selector, type) {
  const node = await firstContentNode(page, selector);

  return (node?.content?.[0]?.marks ?? []).find((mark) => mark.type === type) ?? null;
}

async function selectedBlockIndex(page, selector) {
  return page.evaluate((rootSelector) => document
    .querySelector(rootSelector)
    .__laravelBlocksEditor
    .blockSelection()
    .index, selector);
}

function textForNode(node) {
  return (node.content ?? [])
    .map((child) => child.text ?? textForNode(child))
    .join('');
}

import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

let server;
let baseUrl;
let browseFailureAttempts = 0;
let lastBrowseMimeTypes = [];
let retryUploadAttempts = 0;

const mediaCapabilities = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4', 'video/webm'],
  browse: true,
  delete: false,
  maxUploadBytes: 5 * 1024 * 1024,
  mimeFilter: true,
  search: true,
  upload: true,
};

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
    { name: 'media', label: 'Media' },
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
    {
      name: 'bulletList',
      label: 'Bullet List',
      description: 'Create a bulleted list.',
      category: 'text',
      icon: 'list',
      keywords: ['list', 'bullet', 'unordered'],
      supports: { inserter: true },
    },
    {
      name: 'orderedList',
      label: 'Ordered List',
      description: 'Create a numbered list.',
      category: 'text',
      icon: 'list',
      keywords: ['list', 'numbered', 'ordered'],
      supports: { inserter: true },
    },
    {
      name: 'listItem',
      label: 'List Item',
      description: 'A structural item inside list blocks.',
      category: 'text',
      icon: 'list',
      keywords: ['item'],
      supports: { inserter: false, reusable: false },
    },
    {
      name: 'blockquote',
      label: 'Quote',
      description: 'Highlight a quotation.',
      category: 'text',
      icon: 'quote',
      keywords: ['quote', 'quotation', 'blockquote'],
      supports: { inserter: true },
    },
    {
      name: 'codeBlock',
      label: 'Code',
      description: 'Display preformatted code.',
      category: 'text',
      icon: 'code',
      keywords: ['code', 'preformatted', 'snippet'],
      supports: { inserter: true },
    },
    {
      name: 'image',
      label: 'Image',
      description: 'Display an image from a URL.',
      category: 'media',
      icon: 'image',
      fields: [
        {
          constraints: {
            allowedSchemes: ['https', 'http'],
            maxLength: 2048,
            nullable: true,
          },
          default: null,
          group: 'content',
          help: 'HTTP or HTTPS URL.',
          label: 'Image URL',
          name: 'src',
          path: 'attrs.src',
          required: false,
          type: 'url',
          ui: {},
        },
        {
          constraints: { maxLength: 500, nullable: true },
          default: null,
          group: 'content',
          help: null,
          label: 'Alternative text',
          name: 'alt',
          path: 'attrs.alt',
          required: false,
          type: 'text',
          ui: {},
        },
        {
          constraints: { maxLength: 500, nullable: true },
          default: null,
          group: 'content',
          help: null,
          label: 'Title',
          name: 'title',
          path: 'attrs.title',
          required: false,
          type: 'text',
          ui: {},
        },
      ],
      keywords: ['image', 'photo', 'picture', 'media'],
      supports: { inserter: true },
    },
    {
      name: 'video',
      label: 'Video',
      description: 'Display an uploaded or remote video.',
      category: 'media',
      icon: 'video',
      fields: [
        {
          constraints: {
            allowedSchemes: ['https', 'http'],
            maxLength: 2048,
            nullable: true,
          },
          default: null,
          group: 'content',
          help: 'HTTP or HTTPS URL for an MP4 or WebM video.',
          label: 'Video URL',
          name: 'src',
          path: 'attrs.src',
          required: false,
          type: 'url',
          ui: {},
        },
        {
          constraints: {
            allowedSchemes: ['https', 'http'],
            maxLength: 2048,
            nullable: true,
          },
          default: null,
          group: 'content',
          help: 'Optional HTTP or HTTPS preview image.',
          label: 'Poster URL',
          name: 'poster',
          path: 'attrs.poster',
          required: false,
          type: 'url',
          ui: {},
        },
        {
          constraints: { maxLength: 500, nullable: true },
          default: null,
          group: 'content',
          help: 'Briefly identify the video for assistive technology.',
          label: 'Accessible title',
          name: 'title',
          path: 'attrs.title',
          required: false,
          type: 'text',
          ui: {},
        },
      ],
      keywords: ['video', 'movie', 'media', 'mp4', 'webm'],
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

    if (url.pathname === '/fixture-image.svg') {
      response.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8' });
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="350" viewBox="0 0 800 350"><rect width="800" height="350" fill="#e4e4e7"/><path d="M80 280 260 105l115 105 100-90 245 160Z" fill="#71717a"/><circle cx="620" cy="95" r="42" fill="#f59e0b"/></svg>');

      return;
    }

    if (url.pathname === '/fixture-video.mp4') {
      response.writeHead(200, { 'content-type': 'video/mp4' });
      response.end(Buffer.from('browser video fixture'));

      return;
    }

    if (url.pathname === '/media' && request.method === 'GET') {
      const origin = `http://${request.headers.host}`;
      const search = (url.searchParams.get('search') ?? '').toLowerCase();
      const effectiveSearch = search === 'browse-error' ? '' : search;
      lastBrowseMimeTypes = url.searchParams.getAll('mimeTypes[]');

      if (search === 'browse-error' && browseFailureAttempts++ === 0) {
        sendJson(response, 503, {
          error: { code: 'storage_failure', message: 'The media provider is temporarily unavailable.' },
        });

        return;
      }

      const items = [
        mediaItem('library-hero.png', `${origin}/fixture-image.svg`, 'Library hero', 18432),
        mediaItem('library-detail.png', `${origin}/fixture-image.svg`, 'Product detail', 9216),
        mediaItem('library-video.mp4', `${origin}/fixture-video.mp4`, 'Product video', 32768, 'video/mp4'),
      ].filter((item) => (
        lastBrowseMimeTypes.length === 0 || lastBrowseMimeTypes.includes(item.mimeType)
      ) && `${item.alt} ${item.originalName}`.toLowerCase().includes(effectiveSearch));

      sendJson(response, 200, {
        data: {
          capabilities: mediaCapabilities,
          page: {
            hasMore: false,
            items,
            page: Number(url.searchParams.get('page') ?? 1),
            perPage: Number(url.searchParams.get('perPage') ?? 24),
            total: items.length,
          },
          provider: 'browser-fixture',
        },
      });

      return;
    }

    if (url.pathname === '/media' && request.method === 'POST') {
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(chunk);
      }

      const body = Buffer.concat(chunks).toString('utf8');
      const filename = ['retry.png', 'slow.png', 'drop.png', 'movie-upload.mp4']
        .find((candidate) => body.includes(candidate)) ?? 'uploaded.png';

      if (request.headers['x-csrf-token'] !== 'browser-fixture-csrf') {
        sendJson(response, 419, {
          error: { code: 'csrf_token_mismatch', message: 'The page session expired.' },
        });

        return;
      }

      if (filename === 'retry.png' && retryUploadAttempts++ === 0) {
        sendJson(response, 503, {
          error: { code: 'storage_failure', message: 'The media provider is temporarily unavailable.' },
        });

        return;
      }

      if (filename === 'slow.png') {
        await new Promise((resolve) => setTimeout(resolve, 1200));

        if (response.destroyed) {
          return;
        }
      }

      const origin = `http://${request.headers.host}`;
      const videoUpload = filename.endsWith('.mp4');
      sendJson(response, 201, {
        data: {
          item: mediaItem(
            filename,
            videoUpload
              ? `${origin}/fixture-video.mp4?upload=${encodeURIComponent(filename)}`
              : `${origin}/fixture-image.svg`,
            videoUpload ? 'Uploaded video' : 'Uploaded image',
            1024,
            videoUpload ? 'video/mp4' : 'image/png',
          ),
        },
      });

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
    'toggleHighlight',
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
    'setImageMedia',
    'setVideoMedia',
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

test('uses platform heading shortcuts for H2 through H4', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  await canvas.click();
  await page.keyboard.type('Shortcut heading');

  await page.keyboard.press(`${modifier}+Shift+2`);
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: 'Shortcut heading' }],
  });

  await page.keyboard.press(`${modifier}+Shift+3`);
  await expect.poll(() => firstContentNode(page, '#editor-null')).toMatchObject({
    type: 'heading',
    attrs: { level: 3 },
  });

  await page.keyboard.press(`${modifier}+Shift+4`);
  await expect.poll(() => firstContentNode(page, '#editor-null')).toMatchObject({
    type: 'heading',
    attrs: { level: 4 },
  });
});

test('formats selected text through the unified contextual toolbar', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const frame = page.locator('#editor-null [data-laravel-blocks-block-wrapper]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-contextual-toolbar]');
  const richToolbar = page.locator('#editor-null [data-laravel-blocks-rich-text-toolbar]');
  const emptyAffordance = page.locator('#editor-null [data-laravel-blocks-empty-block-affordance]');
  const transform = page.locator('#editor-null [data-laravel-blocks-block-transform]');
  const dragHandle = page.locator('#editor-null [data-laravel-blocks-block-drag-handle]');
  const options = page.locator('#editor-null [data-laravel-blocks-block-options]');
  const bold = page.locator('#editor-null [data-laravel-blocks-contextual-command="toggleBold"]');
  const italic = page.locator('#editor-null [data-laravel-blocks-contextual-command="toggleItalic"]');
  const highlight = page.locator('#editor-null [data-laravel-blocks-contextual-command="toggleHighlight"]');

  await expect(richToolbar).toHaveCount(0);
  await expect(toolbar).toHaveCount(1);
  await expect(frame).toHaveCount(0);
  await expect(emptyAffordance).toHaveCount(0);
  await expect(toolbar).toBeHidden();

  await canvas.click();
  await page.keyboard.type('Toolbar text');

  await expect(toolbar).toBeHidden();

  await page.keyboard.press('Enter');
  await expect(toolbar).toBeHidden();
  await expect(page.locator('#editor-null [data-laravel-blocks-block-appender]')).toBeVisible();

  await page.keyboard.type('More text');

  await expect(toolbar).toBeHidden();

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');

  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveAttribute('data-laravel-blocks-contextual-toolbar-mode', 'inline');
  await expect(transform).toBeVisible();
  await expect(dragHandle).toBeVisible();
  await expect(options).toBeVisible();
  await expect(bold).toHaveAttribute('aria-pressed', 'false');
  await expect(italic).toHaveAttribute('aria-pressed', 'false');
  await expect(highlight).toHaveAttribute('aria-pressed', 'false');
  await expect(bold.locator('[data-laravel-blocks-icon="bold"]')).toBeVisible();
  await expect(italic.locator('[data-laravel-blocks-icon="italic"]')).toBeVisible();

  const toolbarVisual = await toolbar.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const divider = element.querySelector('.lb-ui-toolbar-group + .lb-ui-toolbar-group');
    const dividerStyle = divider ? window.getComputedStyle(divider) : null;
    const icon = element.querySelector('[data-laravel-blocks-icon="bold"]');

    return {
      borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      boxShadow: style.boxShadow,
      dividerWidth: Number.parseFloat(dividerStyle?.borderLeftWidth ?? '0'),
      iconFill: icon?.getAttribute('fill'),
      iconStrokeLinecap: icon?.getAttribute('stroke-linecap'),
      iconStrokeWidth: Number.parseFloat(icon?.getAttribute('stroke-width') ?? '0'),
    };
  });

  expect(toolbarVisual.borderLeftWidth).toBeGreaterThanOrEqual(1);
  expect(toolbarVisual.borderRadius).toBeGreaterThanOrEqual(20);
  expect(toolbarVisual.boxShadow).not.toBe('none');
  expect(toolbarVisual.dividerWidth).toBeGreaterThanOrEqual(1);
  expect(toolbarVisual.iconFill).toBe('none');
  expect(toolbarVisual.iconStrokeLinecap).toBe('round');
  expect(toolbarVisual.iconStrokeWidth).toBeGreaterThanOrEqual(1.5);
  expect(toolbarVisual.iconStrokeWidth).toBeLessThanOrEqual(2);

  await bold.click();

  await expect(canvas).toBeFocused();
  await expect(bold).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => firstTextMarkTypes(page, '#editor-null')).toEqual(['bold']);
  await expect(bold).toHaveCSS('background-color', 'rgb(247, 184, 75)');

  await italic.click();

  await expect(canvas).toBeFocused();
  await expect(italic).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => firstTextMarkTypes(page, '#editor-null')).toEqual(['bold', 'italic']);

  await highlight.click();

  await expect(canvas).toBeFocused();
  await expect(highlight).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => firstTextMarkTypes(page, '#editor-null')).toEqual(['bold', 'highlight', 'italic']);
  await expect(canvas.locator('mark.lb-editor-highlight').first()).toBeVisible();
  await expect(highlight).toHaveCSS('background-color', 'rgb(247, 184, 75)');

  await page.keyboard.press('ArrowRight');

  await expect(toolbar).toBeHidden();
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
  const frame = page.locator('#editor-null [data-laravel-blocks-block-wrapper]');
  const menu = page.locator('#editor-null [data-laravel-blocks-block-transform-menu]');
  const transform = page.locator('#editor-null [data-laravel-blocks-block-transform]');

  await canvas.click();
  await page.keyboard.type('Transform me');

  await expect(frame).toHaveCount(0);
  await expect(toolbar).toBeHidden();

  await revealHoverToolbar(page, '#editor-null');
  await expect(toolbar).toHaveAttribute('data-laravel-blocks-contextual-toolbar-mode', 'block');
  await expect(transform).toBeVisible();
  await transform.click();
  await expect(menu).toBeVisible();

  await page.locator('#editor-null [data-laravel-blocks-block-transform-item="setHeading"]').click();

  await expect(canvas).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: 'Transform me' }],
  });

  await revealHoverToolbar(page, '#editor-null');
  const headingLevel = page.locator('#editor-null [data-laravel-blocks-heading-level]');

  await expect(headingLevel).toHaveText('H2');
  await headingLevel.click();
  await page.locator('#editor-null [data-laravel-blocks-heading-level-option="4"]').click();

  await expect.poll(() => firstContentNode(page, '#editor-null')).toMatchObject({
    type: 'heading',
    attrs: { level: 4 },
  });

  await revealHoverToolbar(page, '#editor-null');
  await page.screenshot({ path: 'test-results/unified-toolbar-heading.png', fullPage: false });
  await transform.click();
  await expect(menu).toBeVisible();
  await page.locator('#editor-null [data-laravel-blocks-block-transform-item="setParagraph"]').click();

  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Transform me' }],
  });

  await expect(menu).toBeHidden();
  await revealHoverToolbar(page, '#editor-null');
  await expect(headingLevel).toHaveCount(0);
});

test('manages the current top-level block through contextual block controls', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-block-toolbar]');
  const transform = page.locator('#editor-null [data-laravel-blocks-block-transform]');
  const options = page.locator('#editor-null [data-laravel-blocks-block-options]');
  const menu = page.locator('#editor-null [data-laravel-blocks-block-options-menu]');

  await page.evaluate(() => {
    const editor = document.querySelector('#editor-null').__laravelBlocksEditor.editor();

    editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second block' }] },
      ],
    });
    editor.commands.focus('start');
  });

  await expect(toolbar).toBeHidden();

  await revealHoverToolbar(page, '#editor-null', 0);
  await expect(toolbar.locator('svg.lb-ui-icon')).not.toHaveCount(0);
  await expect(transform).toBeVisible();
  await expect(page.locator('#editor-null [data-laravel-blocks-block-drag-handle]')).toBeEnabled();

  const toolbarBox = await toolbar.boundingBox();

  expect(toolbarBox).not.toBeNull();

  await page.mouse.move(toolbarBox.x + 10, toolbarBox.y + 10);
  await page.waitForTimeout(320);
  await expect(toolbar).toBeVisible();

  const scrollBeforeOptions = await page.evaluate(() => window.scrollY);
  await options.click();
  await expect(menu).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBeforeOptions);
  await expect(page.locator('#editor-null [data-laravel-blocks-block-menu-command="moveBlockUp"]')).toBeDisabled();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="moveBlockDown"]').click();

  await expect(canvas).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['Second block', 'First block']);

  await revealHoverToolbar(page, '#editor-null', 1);
  await options.click();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="duplicateBlock"]').click();

  await expect(canvas).toBeFocused();
  await expect.poll(() => editorDocument(page, '#editor-null')).toMatchObject({
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Second block' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
    ],
  });

  await revealHoverToolbar(page, '#editor-null', 2);
  await options.click();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="insertBlockBefore"]').click();

  await expect.poll(() => editorDocument(page, '#editor-null')).toMatchObject({
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Second block' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'First block' }] },
    ],
  });

  await canvas.locator(':scope > *').nth(3).click();
  await revealHoverToolbar(page, '#editor-null', 3);
  await options.click();
  await page.locator('#editor-null [data-laravel-blocks-block-menu-command="deleteBlock"]').click();

  await expect(canvas).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content.map(textForNode))
    .toEqual(['Second block', 'First block', '']);
});

test('adapts the single contextual toolbar to the active block type', async ({ page }) => {
  await page.goto(baseUrl);

  await page.evaluate(() => {
    const editor = document.querySelector('#editor-null').__laravelBlocksEditor.editor();

    editor.commands.setContent({
      type: 'doc',
      content: [{
        type: 'codeBlock',
        content: [{ type: 'text', text: 'const answer = 42;' }],
      }],
    });
    editor.commands.setTextSelection(1);
  });

  const toolbar = await revealHoverToolbar(page, '#editor-null');

  await expect(toolbar).toHaveCount(1);
  await expect(toolbar.locator('[data-laravel-blocks-block-transform]')).toBeVisible();
  await expect(toolbar.locator('[data-laravel-blocks-block-options]')).toBeVisible();
  await expect(toolbar.locator('[data-laravel-blocks-heading-level]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="toggleBold"]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="toggleItalic"]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="toggleHighlight"]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="openLink"]')).toHaveCount(0);
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

  await revealHoverToolbar(page, '#editor-null', 2);
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

  await revealHoverToolbar(page, '#editor-null', 2);
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

  await expect(page.locator('#editor-null [data-laravel-blocks-editor-header] [data-laravel-blocks-block-appender]'))
    .toHaveCount(0);
  await expect(page.locator('#editor-null [data-laravel-blocks-contextual-toolbar] [data-laravel-blocks-block-appender]'))
    .toHaveCount(0);
  await expect(appender).toBeVisible();

  await canvas.click();
  await page.keyboard.type('Start');

  const plusIcon = appender.locator('svg.lb-ui-icon[data-laravel-blocks-icon="plus"]');

  await expect(plusIcon.locator('path')).toHaveCount(2);
  await expect(plusIcon).toHaveAttribute('fill', 'none');
  await expect(plusIcon).toHaveAttribute('stroke-linecap', 'round');

  const lastBlockBox = await canvas.locator(':scope > *').last().boundingBox();
  const appenderBox = await appender.boundingBox();

  expect(lastBlockBox).not.toBeNull();
  expect(appenderBox).not.toBeNull();
  expect(appenderBox.x + appenderBox.width).toBeCloseTo(lastBlockBox.x + lastBlockBox.width, 0);
  expect(appenderBox.y).toBeGreaterThan(lastBlockBox.y + lastBlockBox.height);

  await page.screenshot({ path: 'test-results/trailing-appender.png', fullPage: false });
  await appender.click();
  await expect(inserter).toBeVisible();
  await expect(search).toBeFocused();
  await expect(page.locator('#editor-null [data-laravel-blocks-block-appender-root]'))
    .toHaveAttribute('data-laravel-blocks-block-appender-placement', /top|bottom/);

  const inserterBox = await inserter.boundingBox();
  const inserterVisual = await inserter.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      boxShadow: style.boxShadow,
    };
  });

  expect(inserterBox).not.toBeNull();
  expect(inserterBox.width).toBeLessThanOrEqual(330);
  expect(inserterBox.height).toBeLessThanOrEqual(360);
  expect(inserterVisual.borderLeftWidth).toBeGreaterThanOrEqual(1);
  expect(inserterVisual.borderRadius).toBeGreaterThanOrEqual(20);
  expect(inserterVisual.boxShadow).not.toBe('none');

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

test('keeps the compact trailing inserter within a narrow lower viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 320 });
  await page.goto(baseUrl);

  const root = page.locator('#editor-null [data-laravel-blocks-block-appender-root]');
  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const appender = page.locator('#editor-null [data-laravel-blocks-block-appender]');
  const inserter = page.locator('#editor-null [data-laravel-blocks-block-inserter]');

  await page.evaluate(() => {
    const editor = document.querySelector('#editor-null').__laravelBlocksEditor.editor();

    editor.commands.setContent({
      type: 'doc',
      content: Array.from({ length: 8 }, (_, index) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: `Viewport inserter ${index + 1}` }],
      })),
    });
    editor.commands.focus('end');
    window.scrollTo(0, document.body.scrollHeight);
  });

  await expect(canvas.locator(':scope > p')).toHaveCount(8);
  await appender.click();

  await expect(inserter).toBeVisible();
  await expect(root).toHaveAttribute('data-laravel-blocks-block-appender-placement', /top|bottom/);
  await expect(root).toHaveAttribute('data-laravel-blocks-block-appender-align', /left|right/);

  const box = await inserter.boundingBox();

  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(360);
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

test('uses the package default list manifest through appender and slash flows', async ({ page }) => {
  await page.goto(`${baseUrl}/default`);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const appender = page.locator('#editor-null [data-laravel-blocks-block-appender]');
  const inserter = page.locator('#editor-null [data-laravel-blocks-block-inserter]');
  const search = page.locator('#editor-null [data-laravel-blocks-block-search]');
  const bulletList = page.locator('#editor-null [data-laravel-blocks-block-inserter-item="bulletList"]');
  const listItem = page.locator('#editor-null [data-laravel-blocks-block-inserter-item="listItem"]');

  await canvas.click();
  await page.keyboard.type('Default list seed');
  await appender.click();
  await expect(inserter).toBeVisible();
  await search.fill('item');

  await expect(listItem).toHaveCount(0);
  await expect(page.locator('#editor-null [data-laravel-blocks-block-inserter-empty]')).toBeVisible();

  await search.fill('bullet');
  await expect(bulletList).toBeVisible();
  await expect(bulletList).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('Enter');

  await expect(inserter).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(async () => {
    const document = await editorDocument(page, '#editor-null');

    return document.content.slice(0, 2);
  }).toEqual([
    { type: 'paragraph', content: [{ type: 'text', text: 'Default list seed' }] },
    {
      type: 'bulletList',
      content: [{
        type: 'listItem',
        content: [{ type: 'paragraph' }],
      }],
    },
  ]);

  await page.goto(`${baseUrl}/default`);

  const slash = page.locator('#editor-null [data-laravel-blocks-slash-command]');
  const orderedList = page.locator('#editor-null [data-laravel-blocks-slash-item="orderedList"]');

  await canvas.click();
  await page.keyboard.press('/');
  await page.keyboard.type('item');

  await expect(page.locator('#editor-null [data-laravel-blocks-slash-item="listItem"]')).toHaveCount(0);
  await expect(page.locator('#editor-null [data-laravel-blocks-slash-empty]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(slash).toBeHidden();

  await page.keyboard.press('/');
  await page.keyboard.type('numbered');
  await expect(orderedList).toBeVisible();
  await expect(orderedList).toHaveAttribute('data-laravel-blocks-slash-item-state', 'active');
  await page.keyboard.press('Enter');

  await expect(slash).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'orderedList',
    attrs: { start: 1, type: null },
    content: [{
      type: 'listItem',
      content: [{ type: 'paragraph' }],
    }],
  });
});

test('uses the package default quote and code manifest through complete editing flows', async ({ page }) => {
  await page.goto(`${baseUrl}/default`);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const appender = page.locator('#editor-null [data-laravel-blocks-block-appender]');
  const inserter = page.locator('#editor-null [data-laravel-blocks-block-inserter]');
  const search = page.locator('#editor-null [data-laravel-blocks-block-search]');
  const quote = page.locator('#editor-null [data-laravel-blocks-block-inserter-item="blockquote"]');

  await canvas.click();
  await page.keyboard.type('Quote seed');
  await appender.click();
  await expect(inserter).toBeVisible();
  await search.fill('quotation');
  await expect(quote).toBeVisible();
  await expect(quote).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('Enter');

  await expect(inserter).toBeHidden();
  await expect(canvas).toBeFocused();
  await page.keyboard.type('Quoted line');
  await page.keyboard.press('ArrowDown');

  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content).toEqual([
    { type: 'paragraph', content: [{ type: 'text', text: 'Quote seed' }] },
    {
      type: 'blockquote',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Quoted line' }],
      }],
    },
    { type: 'paragraph' },
  ]);

  const quotePreview = canvas.locator(':scope > blockquote');
  await expect(quotePreview).toBeVisible();

  const quoteStyle = await quotePreview.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      backgroundColor: style.backgroundColor,
      borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
      paddingLeft: Number.parseFloat(style.paddingLeft),
    };
  });

  expect(quoteStyle.borderLeftWidth).toBeGreaterThanOrEqual(4);
  expect(quoteStyle.paddingLeft).toBeGreaterThanOrEqual(16);
  expect(quoteStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

  const slash = page.locator('#editor-null [data-laravel-blocks-slash-command]');
  const code = page.locator('#editor-null [data-laravel-blocks-slash-item="codeBlock"]');

  await canvas.locator(':scope > p').last().click();
  await page.keyboard.press('/');
  await page.keyboard.type('snippet');
  await expect(code).toBeVisible();
  await expect(code).toHaveAttribute('data-laravel-blocks-slash-item-state', 'active');
  await page.keyboard.press('Enter');

  await expect(slash).toBeHidden();
  await expect(canvas).toBeFocused();
  await page.keyboard.type('const total = 2 < 3;');

  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[2]).toEqual({
    type: 'codeBlock',
    attrs: { language: null },
    content: [{ type: 'text', text: 'const total = 2 < 3;' }],
  });

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('setParagraph'))).toMatchObject({ executed: true });
  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('setCodeBlock'))).toMatchObject({ executed: true });

  await expect(canvas).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[2].type)
    .toBe('codeBlock');

  const toolbar = await revealHoverToolbar(page, '#editor-null', 2);

  await expect(toolbar).toHaveCount(1);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="toggleBold"]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="toggleItalic"]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="toggleHighlight"]')).toHaveCount(0);
  await expect(toolbar.locator('[data-laravel-blocks-contextual-command="openLink"]')).toHaveCount(0);
});

test('inserts and edits package default images without losing inspector focus or scroll position', async ({ page }) => {
  await page.goto(`${baseUrl}/default`);

  const root = page.locator('#editor-null');
  const canvas = root.locator('[data-laravel-blocks-canvas]');
  const appender = root.locator('[data-laravel-blocks-block-appender]');
  const inserter = root.locator('[data-laravel-blocks-block-inserter]');
  const search = root.locator('[data-laravel-blocks-block-search]');
  const imageItem = root.locator('[data-laravel-blocks-block-inserter-item="image"]');
  const inspector = root.locator('[data-laravel-blocks-inspector]');
  const toggle = root.locator('[data-laravel-blocks-inspector-toggle]');
  const source = root.locator('[data-laravel-blocks-inspector-field="src"]');
  const alt = root.locator('[data-laravel-blocks-inspector-field="alt"]');
  const title = root.locator('[data-laravel-blocks-inspector-field="title"]');
  const placeholder = root.locator('[data-laravel-blocks-image-placeholder]');
  const renderedImage = root.locator('[data-laravel-blocks-image]');

  await canvas.click();
  await page.keyboard.type('Image seed');
  await appender.click();
  await expect(inserter).toBeVisible();
  await search.fill('photo');
  await expect(imageItem).toBeVisible();
  await expect(imageItem).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('Enter');

  await expect(inserter).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect(placeholder).toBeVisible();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1]).toEqual({
    type: 'image',
    attrs: { src: null, alt: null, title: null },
  });

  await toggle.click();
  await expect(inspector).toBeVisible();
  await expect(root.locator('[data-laravel-blocks-inspector-title]')).toContainText('Image');
  await expect(root.locator('[data-laravel-blocks-inspector-media] button')).toBeEnabled();
  await expect(source).toHaveAttribute('type', 'url');

  await source.fill(`${baseUrl}/fixture-image.svg`);
  await expect(source).toBeFocused();
  await alt.pressSequentially('Landscape preview');
  await expect(alt).toBeFocused();
  await title.pressSequentially('Package image');
  await expect(title).toBeFocused();

  await expect(renderedImage).toBeVisible();
  await expect(renderedImage).toHaveAttribute('src', `${baseUrl}/fixture-image.svg`);
  await expect(renderedImage).toHaveAttribute('alt', 'Landscape preview');
  await expect(renderedImage).toHaveAttribute('title', 'Package image');
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1]).toEqual({
    type: 'image',
    attrs: {
      src: `${baseUrl}/fixture-image.svg`,
      alt: 'Landscape preview',
      title: 'Package image',
    },
  });

  const scrollBeforeClear = await page.evaluate(() => window.scrollY);
  await source.fill('');

  await expect(source).toBeFocused();
  await expect(placeholder).toBeVisible();
  await expect(renderedImage).toHaveCount(0);
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1].attrs.src)
    .toBeNull();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeClear);

  await page.screenshot({ path: 'test-results/image-placeholder-inspector.png', fullPage: false });

  await page.goto(`${baseUrl}/default`);
  await canvas.click();
  await page.keyboard.press('/');
  await page.keyboard.type('image');
  await expect(root.locator('[data-laravel-blocks-slash-item="image"]')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(root.locator('[data-laravel-blocks-slash-command]')).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'image',
    attrs: { src: null, alt: null, title: null },
  });
});

test('browses, searches, selects, uploads, and dismisses the image library accessibly', async ({ page }) => {
  await page.goto(`${baseUrl}/default`);

  const root = page.locator('#editor-null');
  const canvas = root.locator('[data-laravel-blocks-canvas]');

  await canvas.click();
  await page.keyboard.press('/');
  await page.keyboard.type('image');
  await page.keyboard.press('Enter');

  await root.locator('[data-laravel-blocks-inspector-toggle]').click();
  const openMedia = root.locator('[data-laravel-blocks-inspector-media] button');

  await expect(openMedia).toBeEnabled();
  await openMedia.click();

  const modal = page.locator('[data-laravel-blocks-modal]');
  const search = page.locator('[data-laravel-blocks-media-search]');
  const mediaItems = page.locator('[data-laravel-blocks-media-item]');

  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute('role', 'dialog');
  await expect(modal).toHaveAttribute('aria-modal', 'true');
  await expect(search).toBeFocused();
  await expect(mediaItems).toHaveCount(2);

  await mediaItems.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(mediaItems.nth(1)).toBeFocused();

  await search.fill('missing');
  await search.press('Enter');
  await expect(page.locator('[data-laravel-blocks-media-empty]')).toContainText('No matching images');

  await search.fill('browse-error');
  await search.press('Enter');
  await expect(page.locator('[data-laravel-blocks-media-error="storage_failure"]')).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(mediaItems).toHaveCount(2);

  await search.fill('product');
  await search.press('Enter');
  await expect(mediaItems).toHaveCount(1);
  await expect(mediaItems.first()).toContainText('Product detail');
  await mediaItems.first().click();
  await expect(mediaItems.first()).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-laravel-blocks-media-use]').click();

  await expect(modal).toHaveCount(0);
  await expect(openMedia).toBeFocused();
  await expect.poll(() => firstContentNode(page, '#editor-null')).toEqual({
    type: 'image',
    attrs: {
      alt: 'Product detail',
      src: `${baseUrl}/fixture-image.svg`,
      title: null,
    },
  });

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('undo'))).toMatchObject({ executed: true });
  await expect.poll(async () => (await firstContentNode(page, '#editor-null')).attrs).toEqual({
    alt: null,
    src: null,
    title: null,
  });

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('redo'))).toMatchObject({ executed: true });
  await expect.poll(async () => (await firstContentNode(page, '#editor-null')).attrs.alt)
    .toBe('Product detail');

  await openMedia.click();
  await expect(modal).toBeVisible();

  const uploadInput = page.locator('[data-laravel-blocks-media-upload-input]');
  await uploadInput.setInputFiles({
    buffer: Buffer.from('retry fixture'),
    mimeType: 'image/png',
    name: 'retry.png',
  });
  await expect(page.locator('[data-laravel-blocks-media-error="storage_failure"]')).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('[data-laravel-blocks-media-item="retry.png"]')).toBeVisible();
  await expect(page.locator('[data-laravel-blocks-media-status]'))
    .toContainText('retry.png uploaded and selected.');

  await uploadInput.setInputFiles({
    buffer: Buffer.from('slow fixture'),
    mimeType: 'image/png',
    name: 'slow.png',
  });
  await expect(page.locator('[data-laravel-blocks-media-progress]')).toBeAttached();
  await page.getByRole('button', { name: 'Cancel upload' }).click();
  await expect(page.locator('[data-laravel-blocks-media-status]')).toContainText('Upload cancelled.');

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['drop fixture'], 'drop.png', { type: 'image/png' }));

    return transfer;
  });
  await page.locator('[data-laravel-blocks-media-dropzone]').dispatchEvent('drop', { dataTransfer });
  await expect(page.locator('[data-laravel-blocks-media-item="drop.png"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(openMedia).toBeFocused();

  await page.setViewportSize({ height: 720, width: 390 });
  await openMedia.click();
  await expect(modal).toBeVisible();

  const modalBox = await modal.boundingBox();
  expect(modalBox.x).toBeGreaterThanOrEqual(0);
  expect(modalBox.y).toBeGreaterThanOrEqual(0);
  expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(390);
  expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(720);

  await page.locator('[data-laravel-blocks-modal-backdrop]').click({ position: { x: 8, y: 8 } });
  await expect(modal).toHaveCount(0);
  await expect(openMedia).toBeFocused();
});

test('inserts, selects, replaces, and restores videos through the generic media library', async ({ page }) => {
  await page.goto(`${baseUrl}/default`);

  const root = page.locator('#editor-null');
  const canvas = root.locator('[data-laravel-blocks-canvas]');
  const appender = root.locator('[data-laravel-blocks-block-appender]');
  const inserter = root.locator('[data-laravel-blocks-block-inserter]');
  const searchBlocks = root.locator('[data-laravel-blocks-block-search]');
  const videoItem = root.locator('[data-laravel-blocks-block-inserter-item="video"]');

  await canvas.click();
  await page.keyboard.type('Video seed');
  await appender.click();
  await expect(inserter).toBeVisible();
  await searchBlocks.fill('video');
  await expect(videoItem).toBeVisible();
  await expect(videoItem).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('Enter');

  const placeholder = root.locator('[data-laravel-blocks-video-placeholder]');
  await expect(inserter).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect(placeholder).toBeVisible();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1]).toEqual({
    type: 'video',
    attrs: { poster: null, src: null, title: null },
  });

  await root.locator('[data-laravel-blocks-inspector-toggle]').click();
  await expect(root.locator('[data-laravel-blocks-inspector-title]')).toContainText('Video');
  await expect(root.locator('[data-laravel-blocks-inspector-field="src"]')).toHaveAttribute('type', 'url');
  await expect(root.locator('[data-laravel-blocks-inspector-field="poster"]')).toHaveAttribute('type', 'url');
  await expect(root.locator('[data-laravel-blocks-inspector-field="title"]')).toBeVisible();

  const openMedia = root.locator('[data-laravel-blocks-inspector-media="video"] button');
  await openMedia.click();

  const modal = page.locator('[data-laravel-blocks-modal]');
  const searchMedia = page.locator('[data-laravel-blocks-media-search]');
  const mediaItems = page.locator('[data-laravel-blocks-media-item]');
  const uploadInput = page.locator('[data-laravel-blocks-media-upload-input]');

  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Choose video' })).toBeVisible();
  await expect(searchMedia).toBeFocused();
  await expect(uploadInput).toHaveAttribute('accept', 'video/mp4,video/webm');
  expect(lastBrowseMimeTypes).toEqual(['video/mp4', 'video/webm']);
  await expect(mediaItems).toHaveCount(1);
  await expect(mediaItems.first()).toHaveAttribute('data-laravel-blocks-media-item', 'library-video.mp4');
  await expect(mediaItems.first().locator('.lb-media-library__item-preview--icon')).toContainText('video/mp4');

  await mediaItems.first().click();
  await page.locator('[data-laravel-blocks-media-use]').click();

  const renderedVideo = root.locator('video[data-laravel-blocks-video]');
  await expect(modal).toHaveCount(0);
  await expect(openMedia).toBeFocused();
  await expect(renderedVideo).toBeVisible();
  await expect(renderedVideo).toHaveAttribute('src', `${baseUrl}/fixture-video.mp4`);
  await expect(renderedVideo).toHaveAttribute('controls', '');
  await expect(renderedVideo).toHaveAttribute('playsinline', '');
  await expect(renderedVideo).not.toHaveAttribute('autoplay', '');
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1]).toEqual({
    type: 'video',
    attrs: { poster: null, src: `${baseUrl}/fixture-video.mp4`, title: null },
  });

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('undo'))).toMatchObject({ executed: true });
  await expect(placeholder).toBeVisible();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1]).toEqual({
    type: 'video',
    attrs: { poster: null, src: null, title: null },
  });

  expect(await page.evaluate(() => document
    .querySelector('#editor-null')
    .__laravelBlocksEditor
    .runCommand('redo'))).toMatchObject({ executed: true });
  await expect(renderedVideo).toBeVisible();

  await openMedia.click();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Replace video' })).toBeVisible();
  await uploadInput.setInputFiles({
    buffer: Buffer.from('video fixture'),
    mimeType: 'video/mp4',
    name: 'movie-upload.mp4',
  });
  await expect(page.locator('[data-laravel-blocks-media-item="movie-upload.mp4"]')).toBeVisible();
  await expect(page.locator('[data-laravel-blocks-media-status]'))
    .toContainText('movie-upload.mp4 uploaded and selected.');
  await page.locator('[data-laravel-blocks-media-use]').click();

  await expect(modal).toHaveCount(0);
  await expect(openMedia).toBeFocused();
  await expect.poll(async () => (await editorDocument(page, '#editor-null')).content[1].attrs.src)
    .toBe(`${baseUrl}/fixture-video.mp4?upload=movie-upload.mp4`);

  await page.setViewportSize({ height: 720, width: 390 });
  const videoBox = await renderedVideo.boundingBox();
  expect(videoBox).not.toBeNull();
  expect(videoBox.x).toBeGreaterThanOrEqual(0);
  expect(videoBox.x + videoBox.width).toBeLessThanOrEqual(390);

  await openMedia.click();
  await expect(modal).toBeVisible();
  const modalBox = await modal.boundingBox();
  expect(modalBox).not.toBeNull();
  expect(modalBox.x).toBeGreaterThanOrEqual(0);
  expect(modalBox.y).toBeGreaterThanOrEqual(0);
  expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(390);
  expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(720);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(openMedia).toBeFocused();
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

  const slashVisual = await slash.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      boxShadow: style.boxShadow,
    };
  });

  expect(slashVisual.borderLeftWidth).toBeGreaterThanOrEqual(1);
  expect(slashVisual.borderRadius).toBeGreaterThanOrEqual(20);
  expect(slashVisual.boxShadow).not.toBe('none');

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
    media: {
      browseUrl: '/media',
      capabilities: mediaCapabilities,
      csrfToken: 'browser-fixture-csrf',
      enabled: true,
      uploadUrl: '/media',
    },
    placeholder: 'Start writing or type / to choose a block',
  });
  const hiddenValue = JSON.stringify(document).replaceAll('"', '&quot;');

  return `<div id="${id}" class="lb-editor" data-laravel-blocks-root data-laravel-blocks-editor>
    <input type="hidden" name="${name}" value="${hiddenValue}" data-laravel-blocks-input>
    <script type="application/json" data-laravel-blocks-payload>${payload}</script>
    <div class="lb-editor__frame" data-laravel-blocks-mount></div>
  </div>`;
}

function mediaItem(id, url, alt, bytes, mimeType = 'image/png') {
  const image = mimeType.startsWith('image/');

  return {
    alt,
    bytes,
    caption: null,
    height: image ? 350 : null,
    id,
    lastModified: 1755331200,
    mimeType,
    originalName: id,
    provider: 'browser-fixture',
    url,
    width: image ? 800 : null,
  };
}

function sendJson(response, status, payload) {
  if (response.destroyed) {
    return;
  }

  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
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

async function revealHoverToolbar(page, selector, blockIndex = 0) {
  const toolbar = page.locator(`${selector} [data-laravel-blocks-contextual-toolbar]`);
  const block = page.locator(`${selector} [data-laravel-blocks-canvas] > *`).nth(blockIndex);
  const handle = page.locator(`${selector} [data-laravel-blocks-block-hover-handle]`);

  await block.click();
  await expect(toolbar).toBeHidden();
  await page.waitForTimeout(400);
  await block.hover();
  await expect(handle).toBeVisible();
  await handle.click();
  await expect(toolbar).toBeVisible();
  await expect(handle).toBeHidden();
  await expect(toolbar).toHaveAttribute('data-laravel-blocks-contextual-toolbar-mode', 'block');

  return toolbar;
}

async function openHoverOptions(page, selector, blockIndex = 0) {
  await revealHoverToolbar(page, selector, blockIndex);

  const menu = page.locator(`${selector} [data-laravel-blocks-block-options-menu]`);

  await page.locator(`${selector} [data-laravel-blocks-block-options]`).click();
  await expect(menu).toBeVisible();

  return menu;
}

function textForNode(node) {
  return (node.content ?? [])
    .map((child) => child.text ?? textForNode(child))
    .join('');
}

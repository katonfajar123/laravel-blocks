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

const manifest = {
  manifestVersion: 1,
  documentSchemaVersion: 1,
  categories: [],
  blocks: [],
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
    'toggleBold',
    'toggleItalic',
    'setParagraph',
    'setHeading',
    'undo',
    'redo',
  ]);
});

test('formats selected text through the visible rich text toolbar', async ({ page }) => {
  await page.goto(baseUrl);

  const canvas = page.locator('#editor-null [data-laravel-blocks-canvas]');
  const toolbar = page.locator('#editor-null [data-laravel-blocks-rich-text-toolbar]');
  const bold = page.locator('#editor-null [data-laravel-blocks-rich-text-command="toggleBold"]');
  const italic = page.locator('#editor-null [data-laravel-blocks-rich-text-command="toggleItalic"]');

  await expect(toolbar).toBeHidden();

  await canvas.click();
  await page.keyboard.type('Toolbar text');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');

  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveAttribute('data-laravel-blocks-state', 'open');
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

  await expect(toolbar).toBeHidden();
});

function editorFixture() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Laravel Blocks editor shell smoke</title>
  <link rel="stylesheet" href="/dist/laravel-blocks.css">
</head>
<body>
  ${editorRoot('editor-null', 'content', emptyDocument)}
  ${editorRoot('editor-json', 'body', existingDocument)}
  <script type="module" src="/dist/laravel-blocks.js"></script>
</body>
</html>`;
}

function editorRoot(id, name, document) {
  const payload = JSON.stringify({
    id,
    name,
    document,
    manifest,
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

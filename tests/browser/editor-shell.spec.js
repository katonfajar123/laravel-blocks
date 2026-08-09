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

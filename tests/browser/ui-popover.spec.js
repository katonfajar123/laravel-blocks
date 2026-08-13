import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

let server;
let baseUrl;

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
      response.end(uiFixture());

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

test('runs popover infrastructure from the built package bundle', async ({ page }) => {
  await page.goto(baseUrl);

  const trigger = page.locator('#trigger');
  const popover = page.locator('#popover');

  await expect(popover).toBeHidden();
  await trigger.click();

  await expect(popover).toBeVisible();
  await expect(popover).toHaveAttribute('role', 'dialog');
  await expect(popover).toHaveAttribute('data-laravel-blocks-state', 'open');
  await expect(popover).toHaveAttribute('data-laravel-blocks-placement', 'bottom-start');
  await expect(popover).toHaveCSS('position', 'fixed');

  const visual = await popover.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      boxShadow: style.boxShadow,
    };
  });

  expect(visual.borderLeftWidth).toBeGreaterThanOrEqual(1);
  expect(visual.borderRadius).toBeGreaterThanOrEqual(20);
  expect(visual.boxShadow).not.toBe('none');

  await page.locator('#inside-popover').focus();
  await page.keyboard.press('Escape');

  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(popover).toBeVisible();

  await page.locator('#outside').click();

  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();
});

function uiFixture() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Laravel Blocks popover smoke</title>
  <link rel="stylesheet" href="/dist/laravel-blocks.css">
</head>
<body data-laravel-blocks-root>
  <button id="trigger" class="lb-ui-button lb-ui-button--neutral lb-ui-button--md" type="button">Open popover</button>
  <div id="popover" class="lb-ui-popover" role="dialog" hidden>
    <button id="inside-popover" type="button">Inside action</button>
  </div>
  <button id="outside" type="button">Outside target</button>
  <script type="module">
    import { createPopoverController } from '/dist/laravel-blocks.js';

    const trigger = document.querySelector('#trigger');
    const popover = document.querySelector('#popover');
    const controller = createPopoverController({
      anchor: trigger,
      placement: 'bottom-start',
      popover,
    });

    trigger.addEventListener('click', () => controller.toggle(trigger));
    window.demoPopoverController = controller;
  </script>
</body>
</html>`;
}

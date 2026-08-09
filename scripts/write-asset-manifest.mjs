import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = join(packageRoot, 'dist');
const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));

const entries = {
  script: {
    file: 'laravel-blocks.js',
    type: 'module',
  },
  style: {
    file: 'laravel-blocks.css',
    type: 'style',
  },
};

const manifest = {
  version: packageJson.version,
  assets: {},
};

for (const [name, entry] of Object.entries(entries)) {
  const path = join(distRoot, entry.file);
  const contents = readFileSync(path);
  const sha256 = createHash('sha256').update(contents).digest('hex');
  const sri = createHash('sha256').update(contents).digest('base64');
  const stats = statSync(path);

  manifest.assets[name] = {
    file: entry.file,
    type: entry.type,
    sha256,
    integrity: `sha256-${sri}`,
    bytes: stats.size,
  };
}

writeFileSync(join(distRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

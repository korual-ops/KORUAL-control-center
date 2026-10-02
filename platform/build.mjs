import { rm, mkdir, copyFile } from 'node:fs/promises';

const base = new URL('./', import.meta.url);
const dist = new URL('./dist/', import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const files = [
  'index.html',
  'site.css',
  'discovery.css',
  'redesign.css',
  'growth.css',
  'ui-v2.css',
  'ui-v3.css',
  'ui-v4.css',
  'ui-v5.css',
  'ui-v6.css',
  'ui-v7.css',
  'site.js',
  'privacy.js',
  'i18n.js',
  'growth.js',
  'ui-v2.js',
  'ui-v3.js',
  'ui-v4.js',
  'ui-v5.js',
  'ui-v6.js',
  'ui-v7.js',
  'seoul-night.webp',
  'service-scenes.png',
  'manifest.webmanifest',
  'icon.svg',
];

for (const file of files) {
  await copyFile(new URL(file, base), new URL(file, dist));
}

console.log(`KORUAL production build complete: ${files.length} assets`);

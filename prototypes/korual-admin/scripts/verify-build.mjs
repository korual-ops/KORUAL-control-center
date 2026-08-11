import {access, readFile} from 'node:fs/promises';

const required = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/icons/korual-mark.svg',
];

await Promise.all(required.map((file) => access(file)));

const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
const html = await readFile('dist/index.html', 'utf8');
const serviceWorker = await readFile('dist/sw.js', 'utf8');

if (manifest.display !== 'standalone') throw new Error('PWA display mode must be standalone');
if (!manifest.icons?.length) throw new Error('PWA icon is required');
if (!html.includes('viewport-fit=cover')) throw new Error('Mobile safe-area viewport is missing');
if (!html.includes('manifest.webmanifest')) throw new Error('Manifest link is missing');
if (!serviceWorker.includes("url.origin !== self.location.origin")) throw new Error('Service worker origin guard is missing');

console.log(`Verified ${required.length} PWA artifacts and mobile safety rules.`);

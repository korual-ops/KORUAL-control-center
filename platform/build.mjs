import { rm, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';

const base = new URL('./', import.meta.url);
const dist = new URL('./dist/', import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html','site.css','site.js','i18n.js','immersive.css','immersive.js','manifest.webmanifest','icon.svg']) {
  await copyFile(new URL(file, base), new URL(file, dist));
}

const indexPath = new URL('./dist/index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');
html = html
  .replace('</head>', '  <link rel="stylesheet" href="/immersive.css" />\n</head>')
  .replace('</body>', '  <script src="/immersive.js" defer></script>\n</body>');
await writeFile(indexPath, html, 'utf8');

console.log('KORUAL mobile static build complete — immersive scroll enabled');

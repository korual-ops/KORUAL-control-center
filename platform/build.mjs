import { rm, mkdir, copyFile } from 'node:fs/promises';

const base = new URL('./', import.meta.url);
const dist = new URL('./dist/', import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html','discovery.css','site.css','redesign.css','seoul-night.webp','site.js','i18n.js','manifest.webmanifest','icon.svg']) {
  await copyFile(new URL(file, base), new URL(file, dist));
}
console.log('KORUAL redesigned static build complete');
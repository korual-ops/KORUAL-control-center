import { rm, mkdir, copyFile } from 'node:fs/promises';

await rm(new URL('./dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });

for (const file of ['index.html','site.css','site.js','i18n.js','manifest.webmanifest','icon.svg']) {
  await copyFile(new URL('./'+file, import.meta.url), new URL('./dist/'+file, import.meta.url));
}

console.log('KORUAL mobile static build complete');

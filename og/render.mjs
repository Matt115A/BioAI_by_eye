// Render the link-preview card and the icon PNGs into public/. Usage: python3 og/logo.py && node og/render.mjs [path-to-playwright-core]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), pub = path.join(here, '..', 'public');
const require = createRequire(process.argv[2] ?? import.meta.url);
const { chromium } = require('playwright-core');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + path.join(here, 'og.html'));
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
await p.screenshot({ path: path.join(pub, 'og.png') });
// PNG fallbacks for browsers and home screens that don't take an SVG icon
for (const [size, name] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png']]) {
  const q = await b.newPage({ viewport: { width: size, height: size } });
  await q.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="file://${path.join(pub, 'favicon.svg')}" width="${size}" height="${size}" style="display:block">`);
  await q.waitForTimeout(200);
  await q.screenshot({ path: path.join(pub, name), omitBackground: true });
}
await b.close();

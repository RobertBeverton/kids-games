// Usage: node games/money/tests/contact-sheet.mjs <out.html> [<out.png>]
// Writes ONE html file with every picture and chrome drawing at 56px and 160px, Day and Dusk, with its name underneath.
// Set PLAYWRIGHT_CORE (path or URL of playwright-core's index.mjs) to also screenshot it to <out.png>.
// Set BROWSER_CHANNEL (default msedge) to choose the browser.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PICTURES, CHROME, pictureSvg } from '../js/pictures.js';
import { ITEMS } from '../js/items.js';

const [out, png] = process.argv.slice(2);
if (!out) { console.error('usage: contact-sheet.mjs <out.html> [<out.png>]'); process.exit(1); }
// Theme tokens only apply on :root, so scope the Day and Dusk sets to .day and .dusk panels.
const tokens = fs.readFileSync(new URL('../../../shared/tokens.css', import.meta.url), 'utf8')
  .replace(/url\(fonts\/[^)]*\)/g, 'local(sans-serif)')
  .replace(/:root\[data-theme="colourful-dark"\]/g, '.dusk')
  .replace(/:root, :root\[data-theme="colourful-light"\]/g, '.day');
const names = Object.fromEntries(ITEMS.map((i) => [i.id, i.name]));
const cell = (id) => `<figure class="cs"><div class="s56">${pictureSvg(id)}</div><div class="s160">${pictureSvg(id)}</div><figcaption>${names[id] || id}<br><small>${id}</small></figcaption></figure>`;
const ids = [...Object.keys(PICTURES), ...Object.keys(CHROME)];
const panel = (theme, label) => `<section class="${theme}"><h2>${label}</h2><div class="row">${ids.map(cell).join('')}</div></section>`;
const html = `<!doctype html><html><meta charset=utf-8><title>Money pictures</title><style>${tokens}
body{margin:0;font:14px sans-serif}section{background:var(--ground);color:var(--ink);padding:16px}h2{margin:0 0 10px}
.row{display:flex;flex-wrap:wrap;gap:14px}.cs{margin:0;text-align:center;width:190px}.s56{width:56px;height:56px;margin:0 auto 6px}.s160{width:160px;height:160px;margin:0 auto 6px}
.mo-pic{width:100%;height:100%;fill:none;stroke:var(--line);stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.mo-pic .d{stroke-width:3}.mo-pic .dot{fill:var(--line);stroke:none}</style><body>${panel('day', 'Day')}${panel('dusk', 'Dusk')}`;
fs.writeFileSync(out, html);
if (png && process.env.PLAYWRIGHT_CORE) {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE);
  const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  await p.goto(pathToFileURL(out).href);
  await p.screenshot({ path: png, fullPage: true });
  await b.close();
}
console.log('wrote', out);

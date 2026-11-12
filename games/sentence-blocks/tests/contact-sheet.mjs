// Usage: node games/sentence-blocks/tests/contact-sheet.mjs <out.html> [<out.png>]
// Writes <out.html> (Day) and <out-dark.html> (Dusk); with PLAYWRIGHT_CORE it also writes <out.png> and <out-dark.png>.
// Set PLAYWRIGHT_CORE to also write a screenshot.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PICTURES, SLOT_GLYPHS, pictureSvg } from '../js/pictures.js';
import { DATA } from '../js/words.js';
import { SLOT_ORDER, tileText } from '../js/engine.js';

const [out, png] = process.argv.slice(2);
if (!out) { console.error('usage: contact-sheet.mjs <out.html> [<out.png>]'); process.exit(1); }
const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const tokens = fs.readFileSync(new URL('../../../shared/tokens.css', import.meta.url), 'utf8').replace(/url\(fonts\/[^)]*\)/g, 'local(sans-serif)');
const cell = (slot, t) => `<figure class="cs sb-tile--${slot}"><div class="cs-pic">${pictureSvg(t.pic)}</div><figcaption>${tileText(slot, t)}<br><small>${t.pic}</small></figcaption></figure>`;
const sections = SLOT_ORDER.map((slot) => `<h2>${slot}</h2><div class="cs-row">${DATA[slot].map((t) => cell(slot, t)).join('')}</div>`).join('');
const glyphs = Object.keys(SLOT_GLYPHS).map((k) => `<figure class="cs"><div class="cs-pic">${pictureSvg(k)}</div><figcaption>${k}</figcaption></figure>`).join('');
// Theme tokens only apply on <html data-theme=...>, so each theme is its own page.
const page = (theme) => `<!doctype html><html data-theme="${theme}"><meta charset=utf-8><style>${tokens}
${css}
body{background:var(--ground);color:var(--ink);padding:16px;margin:0}.cs-row{display:flex;flex-wrap:wrap;gap:12px}.cs{margin:0;width:120px;text-align:center;font:14px sans-serif}.cs-pic{width:96px;height:96px;margin:auto}</style><body><h1>${theme}</h1>${sections}<h2>slot glyphs</h2><div class="cs-row">${glyphs}</div>`;
const darkOf = (f) => f.replace(/(\.[a-z]+)$/, '-dark$1');
fs.writeFileSync(out, page('colourful-light'));
fs.writeFileSync(darkOf(out), page('colourful-dark'));
if (png && process.env.PLAYWRIGHT_CORE) {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE);
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  for (const [file, shot] of [[out, png], [darkOf(out), darkOf(png)]]) {
    await p.goto(pathToFileURL(file).href);
    await p.screenshot({ path: shot, fullPage: true });
  }
  await b.close();
}
console.log('wrote', out, 'and', darkOf(out));

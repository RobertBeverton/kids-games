// Usage: node games/sentence-blocks/tests/contact-sheet.mjs <out.html> [<out.png>]
// Writes <out.html> (Day) and <out-dark.html> (Dusk); with PLAYWRIGHT_CORE it also writes <out.png> and <out-dark.png>.
// Set PLAYWRIGHT_CORE to also write a screenshot. Set SHEET=scenes to show only the drawn scenes, each beside the tiles a child would be offered.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PICTURES, SLOT_GLYPHS, pictureSvg, sceneSvg, sceneIsDrawn } from '../js/pictures.js';
import { DATA } from '../js/words.js';
import { SLOT_ORDER, tileText, buildSceneRound } from '../js/engine.js';
import { SCENES } from '../js/scenes.js';

const [out, png] = process.argv.slice(2);
if (!out) { console.error('usage: contact-sheet.mjs <out.html> [<out.png>]'); process.exit(1); }
const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const tokens = fs.readFileSync(new URL('../../../shared/tokens.css', import.meta.url), 'utf8').replace(/url\(fonts\/[^)]*\)/g, 'local(sans-serif)');
const cell = (slot, t) => `<figure class="cs sb-tile--${slot}"><div class="cs-pic">${pictureSvg(t.pic)}</div><figcaption>${tileText(slot, t)}<br><small>${t.pic}</small></figcaption></figure>`;
const sections = SLOT_ORDER.map((slot) => `<h2>${slot}</h2><div class="cs-row">${DATA[slot].map((t) => cell(slot, t)).join('')}</div>`).join('');
const glyphs = Object.keys(SLOT_GLYPHS).map((k) => `<figure class="cs"><div class="cs-pic">${pictureSvg(k)}</div><figcaption>${k}</figcaption></figure>`).join('');
// Scenes the figure system can draw, each beside the tray a child would see (only tiles that have a drawing, so a missing
// picture cannot hide a problem). The right tile is marked RIGHT.
const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const drawnData = Object.fromEntries(SLOT_ORDER.map((k) => [k, DATA[k].filter((t) => PICTURES[t.pic])]));
const miniTile = (slot, id, right) => {
  const t = drawnData[slot].find((x) => x.id === id);
  return `<figure class="cs sb-tile--${slot} mini${right ? ' right' : ''}"><div class="cs-band"></div><div class="cs-mini">${pictureSvg(t.pic)}${t.plural ? pictureSvg(t.pic) : ''}</div><figcaption>${tileText(slot, t)}${right ? '<br><b>RIGHT</b>' : ''}</figcaption></figure>`;
};
const wholeScene = (sc) => (!process.env.STAGE || sc.stage === +process.env.STAGE) && sceneIsDrawn(sc) && SLOT_ORDER.every((k) => !sc[k] || drawnData[k].some((t) => t.id === sc[k]));
const sceneRows = SCENES.filter(wholeScene).map((sc, i) => {
  const r = buildSceneRound(drawnData, sc, seeded(i + 1));
  const trays = r.slots.map((k) => `<div class="cs-tray">${r.tray.filter((x) => x.slot === k).map((x) => miniTile(k, x.id, x.id === sc[k])).join('')}</div>`).join('');
  return `<section class="cs-scene"><div class="cs-scenepic">${sceneSvg(sc)}<small>${sc.id}</small></div><div class="cs-trays">${trays}</div></section>`;
}).join('');
const scenes = `<h2>scenes the figure system can draw (${SCENES.filter(wholeScene).length} of ${SCENES.length})</h2>${sceneRows}`;
const only = SLOT_ORDER.includes(process.env.SHEET) ? process.env.SHEET : null;
const everything = process.env.SHEET === 'scenes' ? scenes : only ? `<h2>${only}</h2><div class="cs-row">${DATA[only].map((t) => cell(only, t)).join('')}</div>` : scenes + sections + `<h2>slot glyphs</h2><div class="cs-row">${glyphs}</div>`;
// Theme tokens only apply on <html data-theme=...>, so each theme is its own page.
const page = (theme) => `<!doctype html><html data-theme="${theme}"><meta charset=utf-8><style>${tokens}
${css}
body{background:var(--ground);color:var(--ink);padding:16px;margin:0}.cs-row{display:flex;flex-wrap:wrap;gap:12px}.cs{margin:0;width:120px;text-align:center;font:14px sans-serif}.cs-pic{width:96px;height:96px;margin:auto}.cs-scene{display:flex;gap:20px;align-items:flex-start;margin:0 0 18px;padding-bottom:14px;border-bottom:2px dashed var(--ink-2)}.cs-scenepic{width:340px;flex:none;background:var(--chalk);border:3px solid var(--line);border-radius:22px;padding:10px;font:12px sans-serif;text-align:center}.cs-scenepic .sb-scene{width:100%}.cs-trays{display:flex;flex-wrap:wrap;gap:14px}.cs-tray{display:flex;gap:8px;padding:8px;border:2px solid var(--line);border-radius:12px}.mini{width:96px;margin:0;position:relative;background:var(--chalk);border:3px solid var(--line);border-radius:12px;overflow:hidden;font:700 13px sans-serif}.mini .cs-band{height:12px;background:var(--slot)}.cs-mini{display:flex;justify-content:center;width:72px;height:72px;margin:6px auto 2px}.mini figcaption{padding-bottom:4px}.mini.right{outline:4px solid var(--ink);outline-offset:2px}</style><body><h1>${theme}</h1>${everything}`;
const darkOf = (f) => f.replace(/(\.[a-z]+)$/, '-dark$1');
fs.writeFileSync(out, page('colourful-light'));
fs.writeFileSync(darkOf(out), page('colourful-dark'));
if (png && process.env.PLAYWRIGHT_CORE) {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE);
  const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  for (const [file, shot] of [[out, png], [darkOf(out), darkOf(png)]]) {
    await p.goto(pathToFileURL(file).href);
    await p.screenshot({ path: shot, fullPage: true });
  }
  await b.close();
}
console.log('wrote', out, 'and', darkOf(out));

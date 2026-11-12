// pictures.js — drawn SVG data and renderers. No emoji: every picture is a path.
// A picture is data on a 96x96 square: line (bold strokes), detail (thinner strokes), dots (small filled shapes), label.
// Stroke weights and round ends come from the .sb-pic CSS. To add or change a picture, edit PICTURES only.

// BEGIN_PICTURES
export const PICTURES = {
  // filled in batches (Task 11): keys are the `pic` field of tiles in words.js
};
// END_PICTURES

// Header glyphs for the five slots: the pack's idea (a person with a question mark, a running figure, a question mark,
// a signpost, a face with a speech bubble), drawn in our own style. Each must read at 40px.
export const SLOT_GLYPHS = {
  describe: { label: 'Describe', line: 'M48 14a22 22 0 1 0 0 44a22 22 0 1 0 0-44Z', detail: 'M40 36h0M56 36h0M38 46q10 8 20 0' },
  who: { label: 'Who', line: 'M48 12a12 12 0 1 0 0 24a12 12 0 1 0 0-24Z M28 84L38 46H58L68 84', detail: '' },
  doing: { label: 'What doing', line: 'M52 12a10 10 0 1 0 0 20a10 10 0 1 0 0-20Z M50 34L36 56L18 54 M50 34L66 48L82 38 M36 56L44 84 M44 56L66 80', detail: '' },
  what: { label: 'What', line: 'M30 30C30 12 66 12 66 32C66 46 48 46 48 62', detail: '', dots: 'M42 78a6 6 0 1 0 12 0a6 6 0 1 0 -12 0' },
  where: { label: 'Where', line: 'M46 90V16 M46 24H82L90 34L82 44H46 M46 52H14L6 62L14 72H46', detail: '' },
};

const attrs = 'viewBox="0 0 96 96" aria-hidden="true"';
export function pictureSvg(key) {
  const p = PICTURES[key] || SLOT_GLYPHS[key];
  if (!p) return missingSvg(key);
  return '<svg class="sb-pic" ' + attrs + '><path d="' + p.line + '"/>' +
    (p.detail ? '<path class="d" d="' + p.detail + '"/>' : '') +
    (p.dots ? '<path class="dot" d="' + p.dots + '"/>' : '') + '</svg>';
}
// Visible, ugly on purpose: a missing drawing must never go unnoticed in review.
export function missingSvg(key) {
  return '<svg class="sb-pic sb-pic--missing" ' + attrs + '><rect x="12" y="12" width="72" height="72" rx="8"/><path class="d" d="M12 12L84 84M84 12L12 84"/></svg>';
}

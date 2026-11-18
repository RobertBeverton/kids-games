// pictures.js: own-drawn line pictures for Money. No emoji, no stock images: every picture is SVG markup.
// A picture is the INNER markup of an svg on a 0 0 96 96 box, in the Memory Match hand: a bold main stroke (width 5, set by
// the .mo-pic CSS), thinner detail lines (class "d", width 3), round ends, and filled dots (class "dot"). Nothing else is
// filled. Allowed elements: path circle rect ellipse line polyline polygon g. No text, image, use, href, style or script.
// To add or change a picture, edit PICTURES (an item id) or CHROME (wallet, activity tiles, hub mark) only.

export const PICTURES = {
  // ----- Batch 1 -----
  // A wrapped sweet: striped body with a twisted wrapper at each end.
  'sweets': '<ellipse cx="48" cy="48" rx="21" ry="17"/><path d="M27 48L8 33V63Z"/><path d="M69 48L88 33V63Z"/><path class="d" d="M40 33q-4 15 0 30M56 33q4 15 0 30"/>',
  // A lolly on a stick: tall rounded block with two bands and a shine.
  'ice-lolly': '<path d="M30 74V28a18 18 0 0 1 36 0V74a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6Z"/><rect x="43" y="80" width="10" height="14" rx="5"/><path class="d" d="M30 46H66M30 62H66"/><path class="d" d="M38 22q1-5 5-7"/>',
  // A cone with two scoops.
  'ice-cream': '<path d="M29 58L48 92L67 58"/><path class="d" d="M38 68L50 85M58 68L46 85"/><path d="M70 52C72 38 62 31 48 31C34 31 24 38 26 52q4 7 9 0q4 7 9 0q4 7 9 0q4 7 9 0q4 7 9 0Z"/><circle cx="48" cy="20" r="11"/><path class="d" d="M41 18q2-4 6-5"/>',
  // A comic: cover with a title bar and a speech bubble of dots.
  'comic': '<rect x="16" y="8" width="64" height="80" rx="2"/><path class="d" d="M26 8V88"/><path d="M53 22L58 35L72 33L63 44L72 55L58 54L53 68L47 55L33 60L41 46L33 34L47 36Z"/><path class="d" d="M33 78H68"/>',
  // A balloon with its knot and a wavy string.
  'balloon': '<path d="M48 66C31 62 24 49 24 36C24 20 34 9 48 9C62 9 72 20 72 36C72 49 65 62 48 66Z"/><path d="M48 66L42 74H54Z"/><path class="d" d="M48 74c-7 5 7 9 0 14s5 5 2 6"/><path class="d" d="M35 28q2-8 9-11"/>',
};

// Wallet, the five activity tiles and the hub mark (m-money) are drawn in a later review.
export const CHROME = {};

export function pictureSvg(id) {
  const inner = PICTURES[id] || CHROME[id];
  if (inner === undefined) return '';
  return '<svg class="mo-pic" viewBox="0 0 96 96" aria-hidden="true">' + inner + '</svg>';
}

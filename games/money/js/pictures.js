// pictures.js: own-drawn line pictures for Money. No emoji, no stock images: every picture is SVG markup.
// A picture is the INNER markup of an svg on a 0 0 96 96 box, in the Memory Match hand: a bold main stroke (width 5, set by
// the .mo-pic CSS), thinner detail lines (class "d", width 3), round ends, and filled dots (class "dot"). Nothing else is
// filled. Allowed elements: path circle rect ellipse line polyline polygon g. No text, image, use, href, style or script.
// To add or change a picture, edit PICTURES (an item id) or CHROME (wallet, activity tiles, hub mark) only.

export const PICTURES = {
  // Drawn in reviewed batches (see PENDING in tests/pictures.test.js).
};

// Wallet, the five activity tiles and the hub mark (m-money) are drawn in a later review.
export const CHROME = {};

export function pictureSvg(id) {
  const inner = PICTURES[id] || CHROME[id];
  if (inner === undefined) return '';
  return '<svg class="mo-pic" viewBox="0 0 96 96" aria-hidden="true">' + inner + '</svg>';
}

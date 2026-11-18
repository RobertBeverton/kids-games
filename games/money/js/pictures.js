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
  // ----- Batch 2 -----
  'beach-ball': '<circle cx="48" cy="48" r="34"/><path d="M48 41Q60.5 27.5 56.4 15.1M54.1 44.5Q72 48.6 80.7 38.8M54.1 51.5Q59.4 69.1 72.3 71.8M48 55Q35.5 68.5 39.6 80.9M41.9 51.5Q24 47.4 15.3 57.2M41.9 44.5Q36.6 26.9 23.7 24.2"/><circle class="dot" cx="48" cy="48" r="5"/>',
  'cardboard-box': '<path d="M16 38H80V84H16Z"/><path d="M16 38L7 24H45L48 38M80 38L89 24H51L48 38"/><path class="d" d="M24 24L29 12H67L72 24"/><path class="d" d="M42 38V62H54V38"/>',
  'pizza': '<path d="M48 90L18 30Q48 8 78 30Z"/><path class="d" d="M24 40Q48 22 72 40"/><circle class="dot" cx="38" cy="50" r="5"/><circle class="dot" cx="58" cy="48" r="5"/><circle class="dot" cx="48" cy="68" r="5"/><circle class="dot" cx="48" cy="34" r="3"/>',
  'football': '<circle cx="48" cy="48" r="34"/><polygon class="dot" points="48,37 58.5,44.6 54.5,56.9 41.5,56.9 37.5,44.6"/><path class="d" d="M48 37L48 24M48 24L30 19.2M48 24L66 19.2M58.5 44.6L70.8 40.6M70.8 40.6L69.9 22M70.8 40.6L81 56.2M54.5 56.9L62.1 67.4M62.1 67.4L79.5 60.7M62.1 67.4L50.4 81.9M41.5 56.9L33.9 67.4M33.9 67.4L45.6 81.9M33.9 67.4L16.5 60.7M37.5 44.6L25.2 40.6M25.2 40.6L15 56.2M25.2 40.6L26.1 22"/>',
  'teddy': '<circle cx="48" cy="42" r="26"/><path d="M24.4 31A10 10 0 1 1 39.1 17.6M71.6 31A10 10 0 1 0 56.9 17.6"/><ellipse class="d" cx="48" cy="52" rx="10" ry="7.5"/><ellipse class="dot" cx="48" cy="48.5" rx="3.6" ry="2.6"/><path class="d" d="M48 51v3M44 56q4 3 4-2M52 56q-4 3-4-2"/><circle class="dot" cx="38" cy="38" r="3"/><circle class="dot" cx="58" cy="38" r="3"/><path d="M42 68C28 70 18 78 18 94M54 68C68 70 78 78 78 94"/><path class="d" d="M48 79L39 74V84ZM48 79L57 74V84Z"/>',
  // ----- Batch 3 -----
  'paddling-pool': '<path d="M7 40V60A41 17 0 0 0 89 60V40"/><ellipse cx="48" cy="40" rx="41" ry="17"/><ellipse class="d" cx="48" cy="41" rx="31" ry="10"/><path class="d" d="M26 41q5-4 11 0t11 0t11 0t11 0"/><path class="d" d="M7 50A41 17 0 0 0 89 50"/>',
  'xmas-tree': '<polygon class="dot" points="48,2.5 49.8,6.6 54.2,7 50.9,9.9 51.8,14.3 48,12 44.2,14.3 45.1,9.9 41.8,7 46.2,6.6"/><path d="M48 18L32 38H40L24 58H34L16 80H80L62 58H72L56 38H64Z"/><rect x="42" y="80" width="12" height="12" rx="2"/><circle class="dot" cx="40" cy="64" r="3.5"/><circle class="dot" cx="58" cy="70" r="3.5"/><circle class="dot" cx="48" cy="47" r="3.5"/>',
  'trainers': '<path d="M12 74L14 36H30L35 50Q42 56 50 52L58 58Q76 60 85 68Q89 72 86 74Z"/><path d="M10 74H88V84Q88 88 84 88H14Q10 88 10 84Z"/><path class="d" d="M39 56l4-7M47 60l4-7M55 64l4-6"/><path class="d" d="M20 66Q44 60 68 72"/>',
  'scooter': '<path d="M24 70H72V77H24Z"/><circle cx="18" cy="84" r="8"/><circle cx="78" cy="84" r="8"/><path d="M66 14L75 77"/><path d="M54 14H80"/><circle class="dot" cx="18" cy="84" r="2.5"/><circle class="dot" cx="78" cy="84" r="2.5"/><path class="d" d="M12 76Q20 66 30 70"/>',
  'tent': '<path d="M48 14L8 80H88Z"/><path d="M48 40L36 80H60Z"/><path class="d" d="M48 40L30 80"/><path class="d" d="M26 50L10 58M70 50L86 58"/><circle class="dot" cx="9" cy="59" r="3"/><circle class="dot" cx="87" cy="59" r="3"/><path class="d" d="M2 86H94"/>',
};

// Wallet, the five activity tiles and the hub mark (m-money) are drawn in a later review.
export const CHROME = {};

export function pictureSvg(id) {
  const inner = PICTURES[id] || CHROME[id];
  if (inner === undefined) return '';
  return '<svg class="mo-pic" viewBox="0 0 96 96" aria-hidden="true">' + inner + '</svg>';
}

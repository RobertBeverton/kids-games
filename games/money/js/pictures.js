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
  // ----- Batch 4 -----
  'bike': '<circle cx="22" cy="66" r="14"/><circle cx="74" cy="66" r="14"/><path d="M22 66L38 42H66L74 66M46 66L38 42M46 66L66 42M22 66H46"/><path d="M31 37H46M66 42L62 29M55 29H71"/><path class="d" d="M46 66L51 76M47 76H56"/><circle class="dot" cx="22" cy="66" r="2.5"/><circle class="dot" cx="74" cy="66" r="2.5"/>',
  'tablet': '<rect x="6" y="20" width="84" height="56" rx="7"/><rect class="d" x="12" y="26" width="64" height="44" rx="2"/><circle class="dot" cx="83" cy="48" r="2.8"/><path class="d" d="M20 62L34 34M30 64L40 46"/>',
  'trampoline': '<ellipse cx="48" cy="40" rx="40" ry="13"/><ellipse class="d" cx="48" cy="40" rx="30" ry="8"/><path class="d" d="M21.2 44.5L12.9 45.8M27.5 46.6L21.1 49.1M36.9 48L33.5 51.2M48 48.5L48 52M59.1 48L62.5 51.2M68.5 46.6L74.9 49.1M74.8 44.5L83.1 45.8"/><path d="M10 46L6 86M86 46L90 86M30 52L28 86M66 52L68 86"/>',
  'console': '<path d="M30 30H66Q74 30 80 44L86 70Q88 80 80 80Q74 80 70 72L66 66H30L26 72Q22 80 16 80Q8 80 10 70L16 44Q22 30 30 30Z"/><circle class="d" cx="28" cy="46" r="6"/><circle class="d" cx="58" cy="57" r="6"/><path class="d" d="M40 51V63M34 57H46"/><circle class="dot" cx="70" cy="38" r="2.8"/><circle class="dot" cx="70" cy="50" r="2.8"/><circle class="dot" cx="64" cy="44" r="2.8"/><circle class="dot" cx="76" cy="44" r="2.8"/>',
  'phone': '<rect x="26" y="6" width="44" height="84" rx="9"/><rect class="d" x="32" y="17" width="32" height="56" rx="2"/><path class="d" d="M42 11.5H54"/><circle class="dot" cx="48" cy="81" r="3"/>',
  'tv': '<rect x="6" y="12" width="84" height="56" rx="5"/><rect class="d" x="13" y="19" width="70" height="42" rx="2"/><path class="d" d="M22 54L36 28M32 56L40 42"/><path d="M48 68V82M28 86H68"/>',
  // ----- Batch 5 -----
  'sofa': '<path d="M22 54V34Q22 22 34 22H62Q74 22 74 34V54"/><rect x="8" y="40" width="16" height="36" rx="8"/><rect x="72" y="40" width="16" height="36" rx="8"/><rect x="24" y="54" width="48" height="22" rx="4"/><path class="d" d="M48 54V76"/><path d="M16 76V86M80 76V86"/>',
  'holiday': '<rect x="12" y="30" width="72" height="54" rx="7"/><path d="M36 30V20Q36 14 42 14H54Q60 14 60 20V30"/><path class="d" d="M28 30V84M68 30V84"/><rect class="d" x="42" y="40" width="12" height="8" rx="2"/><circle class="d" cx="48" cy="66" r="7"/><path d="M24 84V89M72 84V89"/>',
  'motorbike': '<circle cx="20" cy="68" r="14"/><circle cx="76" cy="68" r="14"/><circle class="d" cx="20" cy="68" r="6"/><circle class="d" cx="76" cy="68" r="6"/><path d="M36 48Q38 38 50 38H58L60 48Z"/><rect x="36" y="50" width="24" height="16" rx="3"/><path d="M14 46Q22 42 36 46M20 68L38 62M76 68L64 36M58 32H71"/><path class="d" d="M42 56H54M42 61H54M36 70L10 78"/><circle class="dot" cx="68" cy="43" r="3.5"/>',
  'car': '<path d="M6 66V56Q6 50 12 49L26 46L36 30H62L74 46L86 49Q92 51 92 58V66Z"/><circle cx="26" cy="66" r="9"/><circle cx="72" cy="66" r="9"/><path class="d" d="M40 46L45 34H50V46ZM56 34H60L68 46H56Z"/><circle class="dot" cx="86" cy="56" r="3"/>',
  'tractor': '<circle cx="28" cy="66" r="20"/><circle class="d" cx="28" cy="66" r="11"/><circle cx="76" cy="74" r="11"/><circle class="dot" cx="28" cy="66" r="3"/><circle class="dot" cx="76" cy="74" r="3"/><rect x="18" y="12" width="30" height="34" rx="3"/><rect class="d" x="23" y="17" width="20" height="16" rx="1"/><path d="M48 38H76Q82 38 84 46L86 60H46"/><path d="M70 38V22H76"/>',
  'house': '<path d="M8 48L48 14L88 48"/><path d="M68 32V18H76V38"/><path d="M18 40V86H78V40"/><rect x="40" y="56" width="16" height="30" rx="2"/><rect class="d" x="23" y="50" width="12" height="12"/><rect class="d" x="61" y="50" width="12" height="12"/><circle class="dot" cx="52" cy="72" r="2"/>',
};

// The wallet (budget box), the five activity tiles and the hub mark (m-money).
export const CHROME = {
  'wallet': '<rect x="8" y="26" width="80" height="56" rx="9"/><path d="M14 26L66 12Q76 10 76 20V26"/><rect x="58" y="46" width="30" height="18" rx="9"/><circle class="dot" cx="68" cy="55" r="3"/>',
  'activity-guess': '<path d="M39 20Q39 8 48 8Q58 8 58 18Q58 26 48 30V34"/><circle class="dot" cx="48" cy="42" r="3"/><rect x="6" y="50" width="38" height="38" rx="7"/><rect x="52" y="50" width="38" height="38" rx="7"/><circle class="d" cx="25" cy="69" r="9"/><path class="d" d="M71 60L80 78H62Z"/>',
  'activity-sort': '<rect x="6" y="52" width="16" height="16" rx="3"/><rect x="31" y="44" width="23" height="24" rx="3"/><rect x="62" y="34" width="30" height="34" rx="3"/><path d="M8 82H86M76 73L86 82L76 91"/>',
  'activity-buy': '<path d="M28 26L40 38L68 10"/><rect x="6" y="48" width="42" height="34" rx="7"/><path class="d" d="M6 57H48"/><circle class="dot" cx="38" cy="68" r="3"/><circle cx="72" cy="64" r="17"/><path class="d" d="M63 58q2-5 7-6"/>',
  'activity-howmany': '<circle cx="24" cy="60" r="15"/><path class="d" d="M15 54q2-5 7-6"/><rect class="d" x="44" y="72" width="14" height="14" rx="2"/><rect class="d" x="60" y="72" width="14" height="14" rx="2"/><rect class="d" x="76" y="72" width="14" height="14" rx="2"/><rect class="d" x="52" y="56" width="14" height="14" rx="2"/><rect class="d" x="68" y="56" width="14" height="14" rx="2"/><rect class="d" x="60" y="40" width="14" height="14" rx="2"/>',
  'activity-price': '<circle cx="48" cy="22" r="15"/><path class="d" d="M39 16q2-5 7-6"/><rect class="d" x="8" y="52" width="24" height="16" rx="4"/><circle class="dot" cx="14" cy="60" r="2.4"/><rect class="d" x="37" y="52" width="24" height="16" rx="4"/><circle class="dot" cx="43" cy="60" r="2.4"/><rect class="d" x="66" y="52" width="24" height="16" rx="4"/><circle class="dot" cx="72" cy="60" r="2.4"/><rect class="d" x="8" y="73" width="24" height="16" rx="4"/><circle class="dot" cx="14" cy="81" r="2.4"/><rect class="d" x="37" y="73" width="24" height="16" rx="4"/><circle class="dot" cx="43" cy="81" r="2.4"/><rect class="d" x="66" y="73" width="24" height="16" rx="4"/><circle class="dot" cx="72" cy="81" r="2.4"/>',
  'm-money': '<circle cx="48" cy="48" r="38"/><circle class="d" cx="48" cy="48" r="30"/><path d="M58 36Q58 24 48 24Q38 24 38 36V52Q38 60 31 66H63M31 47H54"/>',
};

export function pictureSvg(id) {
  const inner = PICTURES[id] || CHROME[id];
  if (inner === undefined) return '';
  return '<svg class="mo-pic" viewBox="0 0 96 96" aria-hidden="true">' + inner + '</svg>';
}

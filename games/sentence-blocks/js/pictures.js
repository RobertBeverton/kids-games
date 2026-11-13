// pictures.js — drawn SVG data and renderers. No emoji: every picture is a path.
// A picture is data on a 96x96 square: line (bold strokes), detail (thinner strokes), dots (small filled shapes), label.
// Stroke weights and round ends come from the .sb-pic CSS. To add or change a picture, edit PICTURES (or a figure) only.

// ===== FIGURES =====
// People and animals are built from parts, so a tile ("jumping") and a scene ("the girl is jumping") share one drawing language
// and a new pose or character is a few numbers, not a new drawing. Every figure sits on a 96x96 grid with its feet near y=88.
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (x, y) => r1(x) + ' ' + r1(y);
const circ = (cx, cy, r) => 'M' + pt(cx - r, cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + r1(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + r1(-2 * r) + ' 0';

// head [x, y]; torso [shoulder x, y, hip x, y]; arms: path; legs: [knee x, knee y, foot x, foot y] each, drawn from the hip (or the
// hem of a dress); item: where the centre of a held item goes (beside the face, never on it); extra: thin marks (sleep Zs).
// prop: bold (held or ridden things); propD: thin (backdrops: ladder, water); propDots: filled (tears).
const STD_LEGS = [[43, 74, 38, 88], [53, 74, 58, 88]];
const PERSON_POSES = {
  standing: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L32 52M48 36L64 52', legs: STD_LEGS },
  jumping: { head: [48, 16], torso: [48, 28, 48, 54], arms: 'M48 34L28 20M48 34L68 20', legs: [[34, 66, 38, 78], [62, 66, 58, 78]] },
  running: { head: [58, 18], torso: [55, 29, 43, 55], arms: 'M54 34L68 42L76 34M54 34L40 40L32 50', legs: [[58, 64, 62, 84], [28, 68, 14, 64]], side: true },
  sleeping: { head: [20, 78], torso: [30, 78, 62, 78], arms: 'M40 78L46 66', legs: [[74, 78, 84, 82]], extra: 'M58 40h12l-12 12h12M74 20h9l-9 9h9', closed: true, lying: true },
  eating: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L60 42L62 30M48 36L34 52', legs: STD_LEGS, item: [72, 26] },
};
// Drinking is eating with a cup, so it reuses the pose.
PERSON_POSES.drinking = PERSON_POSES.eating;
Object.assign(PERSON_POSES, {
  walking: { head: [52, 18], torso: [50, 30, 46, 58], arms: 'M50 36L60 48M50 36L40 46', legs: [[56, 72, 68, 84], [40, 72, 26, 84]], side: true },
  sitting: { head: [46, 18], torso: [46, 30, 44, 60], arms: 'M46 36L58 48L68 56', legs: [[66, 62, 68, 88]], prop: 'M30 62H62M34 62V88M58 62V88M30 62V34' },
  crying: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L36 32L40 20M48 36L60 32L56 20', legs: STD_LEGS, propDots: circ(33, 34, 3) + circ(63, 34, 3) + circ(31, 46, 3) + circ(65, 46, 3) },
  climbing: { head: [48, 22], torso: [48, 34, 48, 60], arms: 'M48 40L34 28M48 40L62 46', legs: [[40, 70, 36, 58], [56, 74, 58, 86]], propD: 'M26 6V92M70 6V92M26 20H70M26 40H70M26 58H70M26 76H70' },
  swimming: { head: [76, 46], torso: [64, 54, 30, 56], arms: 'M64 54L84 62M64 54L76 34L90 38', legs: [[18, 58, 6, 52]], side: true, propD: 'M4 70q8-6 16 0t16 0t16 0t16 0t16 0t16 0' },
  reading: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L36 42M48 36L60 42', legs: STD_LEGS, prop: 'M30 38L48 44L66 38V60L48 66L30 60ZM48 44V66' },
  riding: { head: [46, 16], torso: [46, 28, 40, 52], arms: 'M46 34L68 44', legs: [[56, 60, 54, 72]], side: true, prop: circ(22, 72, 14) + circ(74, 72, 14) + 'M22 72L40 52H62L74 72M62 52L68 40M64 40H72M40 52L48 72H22' },
  kicking: { head: [44, 18], torso: [44, 30, 44, 58], arms: 'M44 36L30 48M44 36L58 28', legs: [[41, 74, 38, 88], [60, 68, 76, 78]], prop: circ(88, 82, 6) },
  throwing: { head: [44, 22], torso: [44, 34, 44, 60], arms: 'M44 40L30 52M44 40L60 30L70 14', legs: [[38, 74, 32, 88], [50, 74, 56, 88]], prop: circ(76, 10, 5) },
  pushing: { head: [40, 22], torso: [42, 34, 28, 60], arms: 'M42 40L64 54', legs: [[36, 72, 44, 88], [22, 74, 12, 88]], side: true, prop: 'M64 46H90V84H64Z' },
  painting: { head: [36, 18], torso: [36, 30, 36, 58], arms: 'M36 36L52 40L62 34', legs: [[31, 74, 28, 88], [41, 74, 46, 88]], prop: 'M56 18H92V54H56ZM64 54L58 88M84 54L90 88', propD: 'M64 30q6-8 12 0t10 0' },
  washing: { head: [34, 18], torso: [34, 30, 34, 58], arms: 'M34 36L50 46L66 56', legs: [[29, 74, 26, 88], [39, 74, 44, 88]], prop: 'M56 56H90L86 86H60Z' + circ(62, 44, 5) + circ(76, 40, 4) },
  brushing: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L60 38L62 22M48 36L34 52', legs: STD_LEGS, prop: 'M54 20H80', propD: 'M72 14v6M76 14v6M80 14v6', propDots: circ(70, 30, 2.5) + circ(80, 28, 2) },
});

// Babies are drawn with a big head and a small body, so they read as babies and not as small children.
const BABY_LEGS = [[44, 80, 42, 88], [52, 80, 54, 88]];
const BABY_POSES = {
  standing: { head: [48, 44], torso: [48, 57, 48, 72], arms: 'M48 62L36 70M48 62L60 70', legs: BABY_LEGS },
  sleeping: { head: [22, 78], torso: [36, 80, 62, 80], arms: 'M44 80L50 70', legs: [[72, 80, 80, 84]], extra: 'M56 52h10l-10 10h10M72 36h8l-8 8h8', closed: true, lying: true },
  crying: { head: [48, 44], torso: [48, 57, 48, 72], arms: 'M48 62L36 56L40 46M48 62L60 56L56 46', legs: BABY_LEGS, propDots: circ(31, 52, 2.5) + circ(65, 52, 2.5) },
  eating: { head: [48, 44], torso: [48, 57, 48, 72], arms: 'M48 62L60 64L62 52M48 62L36 70', legs: BABY_LEGS, item: [78, 56] },
};
BABY_POSES.drinking = BABY_POSES.eating;

// who: girl (dress, pigtails), boy (spiky hair), mum (dress, bun), dad (hair and moustache), baby (big head). Anything else is neutral
// (used for the doing tiles). mood: 'happy' | 'sad' adds a mouth.
function personPic(pose, who, label, mood) {
  const baby = who === 'baby';
  const P = (baby ? BABY_POSES : PERSON_POSES)[pose];
  const hr = baby ? 13 : 10;
  const [hx, hy] = P.head, [x1, y1, x2, y2] = P.torso;
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const dress = who === 'girl' || who === 'mum', boy = who === 'boy';
  const ext = P.lying ? 10 : 13;
  const hem = dress ? [x2 + ux * 6, y2 + uy * 6] : [x2, y2];
  let line = circ(hx, hy, hr);
  if (dress) line += 'M' + pt(x1, y1) + 'L' + pt(hem[0] - uy * ext, hem[1] + ux * ext) + 'L' + pt(hem[0] + uy * ext, hem[1] - ux * ext) + 'Z';
  else line += 'M' + pt(x1, y1) + 'L' + pt(x2, y2);
  line += P.arms;
  for (const [kx, ky, fx, fy] of P.legs) line += 'M' + pt(hem[0], hem[1]) + 'L' + pt(kx, ky) + 'L' + pt(fx, fy);
  line += P.prop || '';
  let detail = (P.extra || '') + (P.propD || '');
  if (boy) detail += 'M' + pt(hx - 5, hy - 11) + 'L' + pt(hx - 7, hy - 17) + 'M' + pt(hx, hy - 11) + 'L' + pt(hx, hy - 18) + 'M' + pt(hx + 5, hy - 11) + 'L' + pt(hx + 7, hy - 17);
  if (who === 'dad') detail += 'M' + pt(hx - 8, hy - 3) + 'Q' + pt(hx, hy - 12) + ' ' + pt(hx + 8, hy - 3) + 'M' + pt(hx - 6, hy + 5) + 'Q' + pt(hx, hy + 9) + ' ' + pt(hx + 6, hy + 5);
  if (baby) detail += 'M' + pt(hx - 3, hy - hr) + 'q' + pt(4, -8) + ' ' + pt(9, -3);
  if (mood) detail += mood === 'happy' ? 'M' + pt(hx - 5, hy + 3) + 'q' + pt(5, 6) + ' ' + pt(10, 0) : 'M' + pt(hx - 5, hy + 7) + 'q' + pt(5, -6) + ' ' + pt(10, 0);
  let dots = P.propDots || '';
  if (who === 'girl') dots += circ(hx - 14, hy + 3, 4) + circ(hx + 14, hy + 3, 4);
  if (who === 'mum') dots += circ(hx, hy - hr - 3, 4.5);
  if (P.closed) detail += 'M' + pt(hx - 5, hy) + 'L' + pt(hx - 1, hy) + 'M' + pt(hx + 1, hy) + 'L' + pt(hx + 5, hy);
  else if (P.side) dots += circ(hx + 4, hy - 1, 1.8);
  else dots += circ(hx - 4, hy - 1, 1.8) + circ(hx + 4, hy - 1, 1.8);
  return { label: label || (who || 'person') + ' ' + pose, line, detail, dots };
}

// Four-legged animals share one set of poses (they face right). A species is its head parts: the dog has a floppy ear and a blunt
// snout, the cat pointed ears and whiskers, the rabbit long ears and a round tail, the horse a long face and a mane.
const dogBody = (d) => { const y = (n) => n + d; return 'M62 ' + y(34) + 'C50 ' + y(32) + ' 36 ' + y(34) + ' 28 ' + y(40) + 'C22 ' + y(44) + ' 22 ' + y(52) + ' 26 ' + y(56) + 'C36 ' + y(60) + ' 50 ' + y(62) + ' 64 ' + y(58) + 'C70 ' + y(52) + ' 68 ' + y(40) + ' 62 ' + y(34) + 'Z'; };
const STAND_LEGS = 'M32 58V84M40 59V84M56 59V84M64 58V84';
const ANIMAL_POSES = {
  standing: { body: dogBody(0), legs: STAND_LEGS, head: [76, 32], tail: 'M26 42Q16 38 14 28', rear: [22, 44] },
  running: { body: dogBody(0), legs: 'M62 58L74 68L86 64M57 59L66 74L76 76M30 56L20 68L8 66M36 58L30 74L18 80', head: [76, 32], tail: 'M26 42Q14 34 16 22', rear: [22, 42] },
  sleeping: { body: 'M16 80C16 62 60 58 70 68C76 74 72 84 62 84H24C18 84 16 82 16 80Z', legs: 'M64 84h18', head: [68, 70], tail: 'M16 80Q6 78 8 66', extra: 'M58 46h10l-10 10h10M72 30h8l-8 8h8', closed: true, rear: [14, 76] },
  jumping: { body: dogBody(-14), legs: 'M60 44L74 52L86 46M54 46L66 56L78 54M32 44L20 54L8 48M38 46L26 58L16 56', head: [78, 18], tail: 'M26 28Q16 24 14 14', rear: [22, 30] },
  eating: { body: dogBody(0), legs: STAND_LEGS, head: [72, 62], tail: 'M26 42Q16 38 14 28', item: [88, 82], rear: [22, 44] },
};
function animalPic(species, pose, label) {
  const D = ANIMAL_POSES[pose];
  const [hx, hy] = D.head;
  let line = D.body + D.legs + circ(hx, hy, 9);
  let detail = (species === 'rabbit' ? '' : D.tail) + (D.extra || '') + (D.closed ? 'M' + pt(hx + 1, hy - 2) + 'L' + pt(hx + 6, hy - 2) : '');
  let dots = '';
  if (species === 'dog') {
    line += 'M' + pt(hx + 6, hy + 1) + 'H' + r1(hx + 16) + 'Q' + pt(hx + 19, hy + 5) + ' ' + pt(hx + 15, hy + 9) + 'H' + r1(hx + 6);
    dots += 'M' + pt(hx - 6, hy - 6) + 'L' + pt(hx - 13, hy + 9) + 'L' + pt(hx - 2, hy + 5) + 'Z' + circ(hx + 17, hy + 3, 2.2);
  } else if (species === 'cat') {
    line += 'M' + pt(hx - 8, hy - 4) + 'L' + pt(hx - 8, hy - 17) + 'L' + pt(hx - 1, hy - 8) + 'M' + pt(hx + 1, hy - 8) + 'L' + pt(hx + 8, hy - 17) + 'L' + pt(hx + 8, hy - 4);
    detail += 'M' + pt(hx + 9, hy + 2) + 'h9M' + pt(hx + 9, hy + 5) + 'l8 3M' + pt(hx + 9, hy - 1) + 'l8 -3';
    dots += circ(hx + 8, hy + 1, 1.8);
  } else if (species === 'rabbit') {
    line += 'M' + pt(hx - 6, hy - 8) + 'Q' + pt(hx - 13, hy - 26) + ' ' + pt(hx - 5, hy - 28) + 'Q' + pt(hx + 2, hy - 24) + ' ' + pt(hx - 1, hy - 8) + 'M' + pt(hx + 2, hy - 8) + 'Q' + pt(hx, hy - 27) + ' ' + pt(hx + 8, hy - 28) + 'Q' + pt(hx + 13, hy - 22) + ' ' + pt(hx + 7, hy - 7);
    dots += circ(hx + 8, hy + 2, 2) + circ(D.rear[0], D.rear[1], 6);
  } else if (species === 'horse') {
    line += 'M' + pt(hx + 6, hy - 3) + 'H' + r1(hx + 16) + 'Q' + pt(hx + 20, hy + 5) + ' ' + pt(hx + 15, hy + 12) + 'H' + r1(hx + 5) + 'M' + pt(hx - 3, hy - 8) + 'L' + pt(hx - 1, hy - 18) + 'L' + pt(hx + 5, hy - 9);
    detail += 'M' + pt(hx - 7, hy - 5) + 'Q' + pt(hx - 14, hy + 6) + ' ' + pt(hx - 9, hy + 16) + 'M' + pt(hx - 3, hy - 8) + 'Q' + pt(hx - 8, hy + 4) + ' ' + pt(hx - 4, hy + 14);
    dots += circ(hx + 15, hy + 3, 2);
  }
  if (!D.closed) dots += circ(hx + 2, hy - 2, 1.8);
  return { label: label || species + ' ' + pose, line, detail, dots };
}

// BEGIN_PICTURES
export const PICTURES = {
  // who
  girl: personPic('standing', 'girl', 'girl'),
  boy: personPic('standing', 'boy', 'boy'),
  baby: personPic('standing', 'baby', 'baby'),
  dog: animalPic('dog', 'standing', 'dog'),
  cat: animalPic('cat', 'standing', 'cat'),
  horse: animalPic('horse', 'standing', 'horse'),
  rabbit: animalPic('rabbit', 'standing', 'rabbit'),
  mum: personPic('standing', 'mum', 'Mum'),
  dad: personPic('standing', 'dad', 'Dad'),
  // doing (a neutral figure mid-action, with a small item where the action needs one)
  jumping: personPic('jumping', null, 'jumping'),
  running: personPic('running', null, 'running'),
  sleeping: personPic('sleeping', null, 'sleeping'),
  eating: (() => { const p = personPic('eating', null, 'eating'); p.dots += circ(72, 26, 5); p.detail += 'M72 21L75 16'; return p; })(),
  standing: personPic('standing', null, 'standing'),
  walking: personPic('walking', null, 'walking'),
  sitting: personPic('sitting', null, 'sitting'),
  crying: personPic('crying', null, 'crying'),
  climbing: personPic('climbing', null, 'climbing'),
  swimming: personPic('swimming', null, 'swimming'),
  reading: personPic('reading', null, 'reading'),
  riding: personPic('riding', null, 'riding'),
  kicking: personPic('kicking', null, 'kicking'),
  throwing: personPic('throwing', null, 'throwing'),
  pushing: personPic('pushing', null, 'pushing'),
  painting: personPic('painting', null, 'painting'),
  washing: personPic('washing', null, 'washing'),
  brushing: personPic('brushing', null, 'brushing'),
  drinking: (() => { const p = personPic('drinking', null, 'drinking'); p.line += 'M66 18h13l-2 16h-9Z'; return p; })(),
  // what
  apple: { label: 'apple', line: 'M48 30C36 22 18 30 18 52C18 70 30 84 40 84C44 84 46 82 48 82C50 82 52 84 56 84C66 84 78 70 78 52C78 30 60 22 48 30Z', detail: 'M48 30C48 22 52 15 58 11 M52 22C58 14 68 14 72 17C68 25 58 27 52 22Z' },
  banana: { label: 'banana', line: 'M22 66C18 42 36 22 64 20C72 20 74 26 68 28C52 34 42 48 42 68C42 78 26 80 22 66Z', detail: 'M64 20L70 10M30 62C32 50 40 40 52 34' },
  carrot: { label: 'carrot', line: 'M32 30C32 24 64 24 64 30C64 48 56 70 48 90C40 70 32 48 32 30Z', detail: 'M48 26L38 8M48 26L48 6M48 26L58 8M40 42h10M44 58h8' },
  sandwich: { label: 'sandwich', line: 'M12 70L84 70L48 22Z', detail: 'M22 58Q36 66 48 58T74 58M30 48Q40 54 48 48T66 48' },
  cake: { label: 'cake', line: 'M16 52H80V84H16ZM48 52V36', detail: 'M16 66q8 8 16 0t16 0t16 0t16 0', dots: circ(48, 29, 5) },
  milk: { label: 'milk', line: 'M26 24H70L64 86H32Z', detail: 'M29 44H67 M34 60q7-5 14 0t14 0' },
  juice: { label: 'juice', line: 'M24 34H68L62 86H30Z' + circ(68, 30, 9), detail: 'M54 6L50 44M30 58H64M68 22V38M60 30H76' },
  water: { label: 'water', line: 'M28 20H68L62 86H34Z', detail: 'M30 40q6-5 12 0t12 0t12 0', dots: 'M48 58q-6 9 0 14q6-5 0-14Z' },
  book: { label: 'book', line: 'M8 28Q28 22 48 32Q68 22 88 28V76Q68 70 48 80Q28 70 8 76Z', detail: 'M48 32V80M16 42Q30 40 40 44M56 44Q66 40 80 42M16 56Q30 54 40 58M56 58Q66 54 80 56' },
  bike: { label: 'bike', line: circ(22, 66, 16) + circ(74, 66, 16) + 'M22 66L40 40H62L74 66M62 40L68 24M60 24H76M40 40L48 66H22', detail: 'M32 36h14' },
  scooter: { label: 'scooter', line: circ(20, 78, 8) + circ(80, 78, 8) + 'M20 78H80M80 78L72 14M62 14H84', detail: 'M26 70H70' },
  ball: { label: 'ball', line: circ(48, 48, 32), detail: 'M48 30L62 40L56 56H40L34 40ZM48 30V16M62 40L76 36M56 56L66 70M40 56L30 70M34 40L20 36' },
  pram: { label: 'pram', line: 'M14 42H72Q72 68 46 68H32Q14 68 14 42ZM14 42Q16 22 44 24V42M72 42L86 24' + circ(28, 78, 8) + circ(60, 78, 8), detail: '' },
  swing: { label: 'swing', line: 'M12 12H84M12 12L6 90M84 12L90 90M38 12L36 62M58 12L60 62M30 62H66V72H30Z', detail: '' },
  picture: { label: 'picture', line: 'M12 20H84V76H12Z', detail: 'M18 26H78V70H18ZM18 62L36 44L50 58L62 48L78 62', dots: circ(66, 36, 5) },
  car: { label: 'car', line: 'M8 60L16 40H60L76 54H90V72H8Z' + circ(28, 72, 9) + circ(68, 72, 9), detail: 'M22 44H42V54H22ZM46 44H58L68 54H46Z' },
  plate: { label: 'plate', line: circ(44, 56, 32) + circ(44, 56, 20), detail: '', dots: circ(78, 18, 6) + circ(90, 32, 3.5) + circ(68, 8, 3) },
  teeth: { label: 'teeth', line: 'M8 38Q48 80 88 38Q48 50 8 38Z', detail: 'M24 43V56M36 47V62M48 49V64M60 47V62M72 43V56' },
  hair: { label: 'hair', line: 'M24 14Q48 4 72 14M30 16Q10 50 24 86M48 14Q36 50 46 86M66 16Q54 50 72 86', detail: 'M20 24h56' },
  // where
  park: { label: 'park', line: 'M48 90V56 M48 12a26 26 0 1 0 0 52a26 26 0 1 0 0-52Z', detail: 'M20 90H76 M48 56L36 44 M48 56L60 40' },
  garden: { label: 'garden', line: 'M8 90H88M8 62H88M8 76H88M18 90V54M42 90V54M66 90V54M86 90V54M30 56V24M70 52V34', detail: '', dots: circ(30, 16, 7) + circ(70, 28, 6) },
  beach: { label: 'beach', line: 'M10 70q9-9 19 0t19 0t19 0t19 0 M10 84q9-9 19 0t19 0t19 0t19 0', detail: 'M72 40a10 10 0 1 0 0 20', dots: '' },
  pool: { label: 'pool', line: 'M8 36H88V84H8ZM66 20V46M78 20V46M66 28H78M66 38H78', detail: 'M14 56q6-5 12 0t12 0t12 0t12 0t12 0M14 72q6-5 12 0t12 0t12 0t12 0t12 0' },
  house: { label: 'house', line: 'M14 86V46L48 16L82 46V86ZM40 86V62H56V86M64 30V16H72V38', detail: 'M22 54H34V64H22ZM62 54H74V64H62Z' },
  school: { label: 'school', line: 'M6 86V44H90V86ZM28 44V28H68V44M48 28V8H64V16H48M42 86V64H54V86', detail: 'M14 54H24V64H14ZM72 54H82V64H72Z' },
  shop: { label: 'shop', line: 'M10 86V38H86V86ZM6 38L14 20H82L90 38ZM38 86V58H58V86', detail: 'M6 38q8 8 16 0t16 0t16 0t16 0t16 0M30 28H66' },
  kitchen: { label: 'kitchen', line: 'M12 90V46H84V90ZM28 46V30H64V46M22 62H74V84H22Z', detail: 'M38 24q-4-6 0-12M54 24q-4-6 0-12', dots: circ(20, 52, 3) + circ(76, 52, 3) },
  bed: { label: 'bed', line: 'M8 84V30M8 62H88V84M14 50Q14 42 24 42H36Q44 42 44 50V62H14Z', detail: 'M50 62V54Q70 48 88 54' },
  // describe
  big: { label: 'big', line: 'M8 18H60V70H8Z', detail: 'M70 56H88V74H70Z' },
  small: { label: 'small', line: 'M70 56H88V74H70Z', detail: 'M8 18H60V70H8Z' },
  happy: { label: 'happy', line: circ(48, 48, 34), detail: 'M30 54Q48 76 66 54', dots: circ(36, 38, 3.5) + circ(60, 38, 3.5) },
  sad: { label: 'sad', line: circ(48, 48, 34), detail: 'M32 68Q48 52 64 68', dots: circ(36, 38, 3.5) + circ(60, 38, 3.5) + 'M72 50q-5 9 0 14q5-5 0-14Z' },
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

// ===== SCENES =====
// A scene is drawn on a 160x96 canvas: a ground line, a place (a few cues), the actor in a pose at a size (twice when plural), and
// the item at the actor's hand. recipe: { actor, pose, item?, scale?: 'big' | 'small', place?, mood?, count?: 2 }. A recipe the
// figure system cannot draw yet falls back to the pictures it names side by side (the contact sheet shows which scenes those are).
const SCENE_ACTORS = {
  girl: ['person', 'girl'], boy: ['person', 'boy'], mum: ['person', 'mum'], dad: ['person', 'dad'], baby: ['person', 'baby'],
  dog: ['animal', 'dog'], cat: ['animal', 'cat'], horse: ['animal', 'horse'], rabbit: ['animal', 'rabbit'],
};
const tree = (x) => 'M' + x + ' 88V68' + circ(x, 58, 10);
const SCENE_PLACES = {
  park: { line: tree(146), detail: 'M16 88l-3-6M22 88l2-7M120 88l-2-6M126 88l3-7' },
  garden: { line: 'M104 88V68M118 88V68M132 88V68M146 88V68M100 76H152M100 84H152M18 88V62', detail: '', dots: circ(18, 55, 6) },
  beach: { line: 'M92 66q6-6 12 0t12 0t12 0t12 0M100 78q6-6 12 0t12 0t12 0', detail: '', dots: circ(136, 22, 9) },
  pool: { line: 'M138 38V70M148 38V70M138 48H148M138 58H148', detail: 'M6 78q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0' },
  house: { line: 'M112 88V50L132 32L152 50V88M124 88V68H140V88', detail: 'M118 58H126V66H118ZM138 56H146V64H138Z' },
  school: { line: 'M108 88V46H156V88ZM120 46V32H144V46M132 32V18H142V24H132M126 88V68H138V88', detail: '' },
  shop: { line: 'M106 88V44H154V88ZM102 44L108 30H152L158 44ZM120 88V66H140V88', detail: 'M102 44q6 6 12 0t12 0t12 0t12 0t12 0' },
  kitchen: { line: 'M112 88V42H154V88ZM122 42V30H144V42M118 60H148V80H118Z', detail: 'M128 24q-3-5 0-10M138 24q-3-5 0-10', dots: circ(118, 48, 2.5) + circ(148, 48, 2.5) },
  bed: { line: 'M14 88V64M14 80H146V88M146 80V70', detail: 'M14 72H34' },
};
const SCALES = { big: 1.0, small: 0.45 };
const SCENE_W = 2.4; // stroke width on the 160x96 canvas (about 5px at 340px wide); figures divide it by their scale
const SCENE_DETAIL_W = 1.6;
const SCENE_NORMAL = 0.8;
const SCENE_ITEM = 0.34;

function scenePath(d, w, kind) {
  if (!d) return '';
  return '<path d="' + d + '"' + (kind ? ' class="' + kind + '"' : '') + ' style="stroke-width:' + r1(w) + '"/>';
}
const sceneGroup = (pic, tx, ty, s) => '<g transform="translate(' + r1(tx) + ' ' + r1(ty) + ') scale(' + Math.round(s * 1000) / 1000 + ')">' + scenePath(pic.line, SCENE_W / s) + scenePath(pic.detail, SCENE_DETAIL_W / s, 'd') + scenePath(pic.dots, SCENE_DETAIL_W / s, 'dot') + '</g>';
function sceneArt(r) {
  const actor = SCENE_ACTORS[r.actor];
  if (!actor) return null;
  const person = actor[0] === 'person';
  if (r.mood && !person) return null; // animals have no faces drawn yet
  const table = person ? (actor[1] === 'baby' ? BABY_POSES : PERSON_POSES) : ANIMAL_POSES;
  const P = table[r.pose];
  if (!P) return null;
  const plural = r.count === 2;
  const base = SCALES[r.scale] || SCENE_NORMAL;
  const s = plural ? Math.min(base, 0.62) : base;
  const pic = person ? personPic(r.pose, actor[1], undefined, r.mood) : animalPic(actor[1], r.pose);
  const place = SCENE_PLACES[r.place];
  let out = scenePath('M6 88H154', SCENE_W) + (place ? scenePath(place.line, SCENE_W) + scenePath(place.detail, SCENE_DETAIL_W, 'd') + scenePath(place.dots, SCENE_DETAIL_W, 'dot') : '');
  const middle = person ? 48 : 51;
  for (const cx of plural ? [52, 108] : [80]) {
    const tx = cx - middle * s, ty = 88 - 88 * s;
    out += sceneGroup(pic, tx, ty, s);
    const item = !plural && r.item && PICTURES[r.item];
    if (item && P.item) out += sceneGroup(item, tx + P.item[0] * s - 48 * SCENE_ITEM, ty + P.item[1] * s - 48 * SCENE_ITEM, SCENE_ITEM);
  }
  return out;
}
export function sceneSvg(scene) {
  const r = scene.picture || {};
  const art = sceneArt(r);
  if (art) return '<svg class="sb-pic sb-scene" viewBox="0 0 160 96" aria-hidden="true">' + art + '</svg>';
  // Fallback: the pictures the recipe names, side by side. Weak (it teaches matching, not language), so every scene
  // that lands here is a scene still to be drawn.
  return [r.actor, r.pose, r.item, r.place].filter(Boolean).map((k) => '<span class="sb-scene__pic">' + pictureSvg(k) + '</span>').join('');
}
export function sceneIsDrawn(scene) { return !!sceneArt(scene.picture || {}); }

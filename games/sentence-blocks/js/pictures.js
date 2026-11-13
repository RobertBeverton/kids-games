// pictures.js — drawn SVG data and renderers. No emoji: every picture is a path.
// A picture is data on a 96x96 square: line (bold strokes), detail (thinner strokes), dots (small filled shapes), label.
// Stroke weights and round ends come from the .sb-pic CSS. To add or change a picture, edit PICTURES (or a figure) only.

// ===== FIGURES (Task 6 spike) =====
// People and the dog are built from parts, so a tile ("jumping") and a scene ("the girl is jumping") share one drawing language
// and a new pose or character is a few numbers, not a new drawing. Every figure sits on a 96x96 grid with its feet near y=88.
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (x, y) => r1(x) + ' ' + r1(y);
const circ = (cx, cy, r) => 'M' + pt(cx - r, cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + r1(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + r1(-2 * r) + ' 0';

// head [x, y]; torso [shoulder x, y, hip x, y]; arms: path; legs: [knee x, knee y, foot x, foot y] each, drawn from the hip (or the
// hem of a dress); item: where the centre of a held item goes (beside the face, never on it); extra: thin marks (sleep Zs).
const STD_LEGS = [[43, 74, 38, 88], [53, 74, 58, 88]];
const PERSON_POSES = {
  standing: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L32 52M48 36L64 52', legs: [[43, 74, 38, 88], [53, 74, 58, 88]] },
  jumping: { head: [48, 16], torso: [48, 28, 48, 54], arms: 'M48 34L28 20M48 34L68 20', legs: [[34, 66, 38, 78], [62, 66, 58, 78]] },
  running: { head: [58, 18], torso: [55, 29, 43, 55], arms: 'M54 34L68 42L76 34M54 34L40 40L32 50', legs: [[58, 64, 62, 84], [28, 68, 14, 64]], side: true },
  sleeping: { head: [20, 78], torso: [30, 78, 62, 78], arms: 'M40 78L46 66', legs: [[74, 78, 84, 82]], extra: 'M58 40h12l-12 12h12M74 20h9l-9 9h9', closed: true, lying: true },
  eating: { head: [48, 18], torso: [48, 30, 48, 58], arms: 'M48 36L60 42L62 30M48 36L34 52', legs: [[43, 74, 38, 88], [53, 74, 58, 88]], item: [72, 26] },
};
// Drinking is eating with a cup, so it reuses the pose.
PERSON_POSES.drinking = PERSON_POSES.eating;
// Batch A: the rest of the doing words. `prop` is bold (held or ridden things), `propD` thin (backdrops: ladder, water), `propDots` filled.
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

// who: 'girl' (a dress and pigtails), 'boy' (spiky hair), anything else is neutral (used for the doing tiles).
function personPic(pose, who, label) {
  const P = PERSON_POSES[pose];
  const [hx, hy] = P.head, [x1, y1, x2, y2] = P.torso;
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const girl = who === 'girl', boy = who === 'boy';
  const ext = P.lying ? 10 : 13;
  const hem = girl ? [x2 + ux * 6, y2 + uy * 6] : [x2, y2];
  let line = circ(hx, hy, 10);
  if (girl) line += 'M' + pt(x1, y1) + 'L' + pt(hem[0] - uy * ext, hem[1] + ux * ext) + 'L' + pt(hem[0] + uy * ext, hem[1] - ux * ext) + 'Z';
  else line += 'M' + pt(x1, y1) + 'L' + pt(x2, y2);
  line += P.arms;
  for (const [kx, ky, fx, fy] of P.legs) line += 'M' + pt(hem[0], hem[1]) + 'L' + pt(kx, ky) + 'L' + pt(fx, fy);
  line += P.prop || '';
  let detail = (P.extra || '') + (P.propD || '');
  if (boy) detail += 'M' + pt(hx - 5, hy - 11) + 'L' + pt(hx - 7, hy - 17) + 'M' + pt(hx, hy - 11) + 'L' + pt(hx, hy - 18) + 'M' + pt(hx + 5, hy - 11) + 'L' + pt(hx + 7, hy - 17);
  let dots = P.propDots || '';
  if (girl) dots += circ(hx - 14, hy + 3, 4) + circ(hx + 14, hy + 3, 4);
  if (P.closed) detail += 'M' + pt(hx - 5, hy) + 'L' + pt(hx - 1, hy) + 'M' + pt(hx + 1, hy) + 'L' + pt(hx + 5, hy);
  else if (P.side) dots += circ(hx + 4, hy - 1, 1.8);
  else dots += circ(hx - 4, hy - 1, 1.8) + circ(hx + 4, hy - 1, 1.8);
  return { label: label || (who || 'person') + ' ' + pose, line, detail, dots };
}

// The dog faces right. Cat and rabbit would be more parameters on the same parts (ears, tail, snout).
const DOG_BODY = 'M62 34C50 32 36 34 28 40C22 44 22 52 26 56C36 60 50 62 64 58C70 52 68 40 62 34Z';
const DOG_POSES = {
  standing: { body: DOG_BODY, legs: 'M32 58V84M40 59V84M56 59V84M64 58V84', head: [76, 32], tail: 'M26 42Q16 38 14 28' },
  running: { body: DOG_BODY, legs: 'M62 58L74 68L86 64M57 59L66 74L76 76M30 56L20 68L8 66M36 58L30 74L18 80', head: [76, 32], tail: 'M26 42Q14 34 16 22' },
  sleeping: { body: 'M16 80C16 62 60 58 70 68C76 74 72 84 62 84H24C18 84 16 82 16 80Z', legs: 'M64 84h18', head: [68, 70], tail: 'M16 80Q6 78 8 66', extra: 'M58 46h10l-10 10h10M72 30h8l-8 8h8', closed: true },
};
function dogPic(pose, label) {
  const D = DOG_POSES[pose];
  const [hx, hy] = D.head;
  // head, then a blunt snout (not a beak), a filled floppy ear, a nose and an eye
  const snout = 'M' + pt(hx + 6, hy + 1) + 'H' + r1(hx + 16) + 'Q' + pt(hx + 19, hy + 5) + ' ' + pt(hx + 15, hy + 9) + 'H' + r1(hx + 6);
  const line = D.body + D.legs + circ(hx, hy, 9) + snout;
  const detail = D.tail + (D.extra || '') + (D.closed ? 'M' + pt(hx + 1, hy - 2) + 'L' + pt(hx + 6, hy - 2) : '');
  let dots = 'M' + pt(hx - 6, hy - 6) + 'L' + pt(hx - 13, hy + 9) + 'L' + pt(hx - 2, hy + 5) + 'Z' + circ(hx + 17, hy + 3, 2.2);
  if (!D.closed) dots += circ(hx + 2, hy - 2, 1.8);
  return { label: label || 'dog ' + pose, line, detail, dots };
}

// BEGIN_PICTURES
export const PICTURES = {
  // who
  girl: personPic('standing', 'girl', 'girl'),
  boy: personPic('standing', 'boy', 'boy'),
  dog: dogPic('standing', 'dog'),
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
  carrot: { label: 'carrot', line: 'M32 30C32 24 64 24 64 30C64 48 56 70 48 90C40 70 32 48 32 30Z', detail: 'M48 26L38 8M48 26L48 6M48 26L58 8M40 42h10M44 58h8' },
  milk: { label: 'milk', line: 'M26 24H70L64 86H32Z', detail: 'M29 44H67 M34 60q7-5 14 0t14 0' },
  // where
  park: { label: 'park', line: 'M48 90V56 M48 12a26 26 0 1 0 0 52a26 26 0 1 0 0-52Z', detail: 'M20 90H76 M48 56L36 44 M48 56L60 40' },
  beach: { label: 'beach', line: 'M10 70q9-9 19 0t19 0t19 0t19 0 M10 84q9-9 19 0t19 0t19 0t19 0', detail: 'M72 40a10 10 0 1 0 0 20', dots: '' },
  // describe
  big: { label: 'big', line: 'M8 18H60V70H8Z', detail: 'M70 56H88V74H70Z' },
  small: { label: 'small', line: 'M70 56H88V74H70Z', detail: 'M8 18H60V70H8Z' },
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
// A scene is drawn on a 160x96 canvas: a ground line, a place (a few cues), the actor in a pose at a size, and the item in the
// actor's hand. recipe: { actor, pose, item?, scale?: 'big' | 'small', place? }. A recipe the figure system cannot draw yet
// falls back to the pictures the scene names side by side (and the contact sheet shows which ones those are).
const SCENE_ACTORS = { girl: ['person', 'girl'], boy: ['person', 'boy'], dog: ['dog'] };
const SCENE_PLACES = {
  park: { line: 'M146 88V68' + circ(146, 58, 10), detail: 'M16 88l-3-6M22 88l2-7M120 88l-2-6M126 88l3-7' },
  beach: { line: 'M92 66q6-6 12 0t12 0t12 0t12 0M100 78q6-6 12 0t12 0t12 0', detail: '', dots: circ(136, 22, 9) },
};
const SCALES = { big: 1.0, small: 0.4 };
const SCENE_W = 2.4; // stroke width on the 160x96 canvas (about 5px at 340px wide); figures divide it by their scale
const SCENE_DETAIL_W = 1.6;
const SCENE_NORMAL = 0.8;
const SCENE_ITEM = 0.34;

function scenePath(d, w, kind) {
  if (!d) return '';
  return '<path d="' + d + '"' + (kind ? ' class="' + kind + '"' : '') + ' style="stroke-width:' + r1(w) + '"/>';
}
function sceneArt(r) {
  const actor = SCENE_ACTORS[r.actor];
  if (!actor || r.mood) return null; // moods (happy, sad) are not drawn yet
  const person = actor[0] === 'person';
  const pic = person ? (PERSON_POSES[r.pose] ? personPic(r.pose, actor[1]) : null) : (DOG_POSES[r.pose] ? dogPic(r.pose) : null);
  if (!pic) return null;
  const s = SCALES[r.scale] || SCENE_NORMAL;
  const tx = 80 - (person ? 48 : 51) * s, ty = 88 - (person ? 88 : 84) * s;
  const place = SCENE_PLACES[r.place];
  let out = scenePath('M6 88H154', SCENE_W) + (place ? scenePath(place.line, SCENE_W) + scenePath(place.detail, SCENE_DETAIL_W, 'd') + scenePath(place.dots, SCENE_DETAIL_W, 'dot') : '');
  out += '<g transform="translate(' + r1(tx) + ' ' + r1(ty) + ') scale(' + s + ')">' + scenePath(pic.line, SCENE_W / s) + scenePath(pic.detail, SCENE_DETAIL_W / s, 'd') + scenePath(pic.dots, SCENE_DETAIL_W / s, 'dot') + '</g>';
  const item = r.item && PICTURES[r.item];
  const spot = person && PERSON_POSES[r.pose].item;
  if (item && spot) {
    const ix = tx + spot[0] * s - 48 * SCENE_ITEM, iy = ty + spot[1] * s - 48 * SCENE_ITEM;
    out += '<g transform="translate(' + r1(ix) + ' ' + r1(iy) + ') scale(' + SCENE_ITEM + ')">' + scenePath(item.line, SCENE_W / SCENE_ITEM) + scenePath(item.detail, SCENE_DETAIL_W / SCENE_ITEM, 'd') + scenePath(item.dots, SCENE_DETAIL_W / SCENE_ITEM, 'dot') + '</g>';
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

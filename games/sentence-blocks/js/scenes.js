// scenes.js — "Describe the picture" scenes, 12 per stage. `picture` is the recipe pictures.js draws:
// { actor, pose, item?, scale?: 'big'|'small', place?, mood?, count?: 2 }. A scene names the tiles that are its right answers.
const s1 = (id, who, doing, picture) => ({ id, stage: 1, who, doing, picture });
const s2 = (id, who, doing, what, picture) => ({ id, stage: 2, who, doing, what, picture });
const s3 = (id, describe, who, doing, where, picture, what) => ({ id, stage: 3, describe, who, doing, ...(what ? { what } : {}), where, picture });

export const SCENES = [
  // Stage 1: who + doing
  s1('s1-girl-jumping', 'girl', 'jumping', { actor: 'girl', pose: 'jumping' }),
  s1('s1-dog-sleeping', 'dog', 'sleeping', { actor: 'dog', pose: 'sleeping' }),
  s1('s1-boy-running', 'boy', 'running', { actor: 'boy', pose: 'running' }),
  s1('s1-cat-jumping', 'cat', 'jumping', { actor: 'cat', pose: 'jumping' }),
  s1('s1-mum-walking', 'mum', 'walking', { actor: 'mum', pose: 'walking' }),
  s1('s1-baby-sleeping', 'baby', 'sleeping', { actor: 'baby', pose: 'sleeping' }),
  s1('s1-baby-crying', 'baby', 'crying', { actor: 'baby', pose: 'crying' }),
  s1('s1-horse-running', 'horse', 'running', { actor: 'horse', pose: 'running' }),
  s1('s1-rabbit-jumping', 'rabbit', 'jumping', { actor: 'rabbit', pose: 'jumping' }),
  s1('s1-dad-sitting', 'dad', 'sitting', { actor: 'dad', pose: 'sitting' }),
  s1('s1-girls-jumping', 'girls', 'jumping', { actor: 'girl', pose: 'jumping', count: 2 }),
  s1('s1-dogs-running', 'dogs', 'running', { actor: 'dog', pose: 'running', count: 2 }),
  // Stage 2: who + doing + what
  s2('s2-girl-eating-apple', 'girl', 'eating', 'apple', { actor: 'girl', pose: 'eating', item: 'apple' }),
  s2('s2-boy-eating-banana', 'boy', 'eating', 'banana', { actor: 'boy', pose: 'eating', item: 'banana' }),
  s2('s2-dog-eating-carrot', 'dog', 'eating', 'carrot', { actor: 'dog', pose: 'eating', item: 'carrot' }),
  s2('s2-rabbit-eating-carrot', 'rabbit', 'eating', 'carrot', { actor: 'rabbit', pose: 'eating', item: 'carrot' }),
  s2('s2-horse-eating-apple', 'horse', 'eating', 'apple', { actor: 'horse', pose: 'eating', item: 'apple' }),
  s2('s2-baby-drinking-milk', 'baby', 'drinking', 'milk', { actor: 'baby', pose: 'drinking', item: 'milk' }),
  s2('s2-girl-drinking-juice', 'girl', 'drinking', 'juice', { actor: 'girl', pose: 'drinking', item: 'juice' }),
  s2('s2-boy-drinking-water', 'boy', 'drinking', 'water', { actor: 'boy', pose: 'drinking', item: 'water' }),
  s2('s2-mum-reading-book', 'mum', 'reading', 'book', { actor: 'mum', pose: 'reading', item: 'book' }),
  s2('s2-dad-riding-bike', 'dad', 'riding', 'bike', { actor: 'dad', pose: 'riding', item: 'bike' }),
  s2('s2-boy-kicking-ball', 'boy', 'kicking', 'ball', { actor: 'boy', pose: 'kicking', item: 'ball' }),
  s2('s2-girl-throwing-ball', 'girl', 'throwing', 'ball', { actor: 'girl', pose: 'throwing', item: 'ball' }),
  // Stage 3: describe + who + doing (+ what) + where
  s3('s3-big-dog-running-park', 'big', 'dog', 'running', 'park', { actor: 'dog', pose: 'running', scale: 'big', place: 'park' }),
  s3('s3-small-cat-jumping-beach', 'small', 'cat', 'jumping', 'beach', { actor: 'cat', pose: 'jumping', scale: 'small', place: 'beach' }),
  s3('s3-happy-girl-eating-apple-park', 'happy', 'girl', 'eating', 'park', { actor: 'girl', pose: 'eating', item: 'apple', mood: 'happy', place: 'park' }, 'apple'),
  s3('s3-sad-boy-sleeping-bed', 'sad', 'boy', 'sleeping', 'bed', { actor: 'boy', pose: 'sleeping', mood: 'sad', place: 'bed' }),
  s3('s3-happy-boy-riding-bike-park', 'happy', 'boy', 'riding', 'park', { actor: 'boy', pose: 'riding', item: 'bike', mood: 'happy', place: 'park' }, 'bike'),
  s3('s3-big-horse-running-park', 'big', 'horse', 'running', 'park', { actor: 'horse', pose: 'running', scale: 'big', place: 'park' }),
  s3('s3-small-rabbit-eating-carrot-garden', 'small', 'rabbit', 'eating', 'garden', { actor: 'rabbit', pose: 'eating', item: 'carrot', scale: 'small', place: 'garden' }, 'carrot'),
  s3('s3-sad-girl-reading-book-house', 'sad', 'girl', 'reading', 'house', { actor: 'girl', pose: 'reading', item: 'book', mood: 'sad', place: 'house' }, 'book'),
  s3('s3-happy-boy-kicking-ball-park', 'happy', 'boy', 'kicking', 'park', { actor: 'boy', pose: 'kicking', item: 'ball', mood: 'happy', place: 'park' }, 'ball'),
  s3('s3-sad-baby-crying-house', 'sad', 'baby', 'crying', 'house', { actor: 'baby', pose: 'crying', mood: 'sad', place: 'house' }),
  s3('s3-happy-girl-swimming-pool', 'happy', 'girl', 'swimming', 'pool', { actor: 'girl', pose: 'swimming', mood: 'happy', place: 'pool' }),
  s3('s3-small-dog-sleeping-house', 'small', 'dog', 'sleeping', 'house', { actor: 'dog', pose: 'sleeping', scale: 'small', place: 'house' }),
];

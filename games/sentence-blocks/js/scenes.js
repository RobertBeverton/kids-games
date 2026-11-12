// scenes.js — "Describe the picture" scenes. SEED SET; `picture` is the recipe the renderer draws (see the picture task).
export const SCENES = [
  { id: 's1-girl-jumping', stage: 1, who: 'girl', doing: 'jumping', picture: { actor: 'girl', pose: 'jumping' } },
  { id: 's1-dog-sleeping', stage: 1, who: 'dog', doing: 'sleeping', picture: { actor: 'dog', pose: 'sleeping' } },
  { id: 's1-boy-running', stage: 1, who: 'boy', doing: 'running', picture: { actor: 'boy', pose: 'running' } },
  { id: 's1-cat-jumping', stage: 1, who: 'cat', doing: 'jumping', picture: { actor: 'cat', pose: 'jumping' } },
  { id: 's1-mum-running', stage: 1, who: 'mum', doing: 'running', picture: { actor: 'mum', pose: 'running' } },
  { id: 's2-boy-eating-apple', stage: 2, who: 'boy', doing: 'eating', what: 'apple', picture: { actor: 'boy', pose: 'eating', item: 'apple' } },
  { id: 's2-dog-eating-carrot', stage: 2, who: 'dog', doing: 'eating', what: 'carrot', picture: { actor: 'dog', pose: 'eating', item: 'carrot' } },
  { id: 's2-girl-drinking-milk', stage: 2, who: 'girl', doing: 'drinking', what: 'milk', picture: { actor: 'girl', pose: 'drinking', item: 'milk' } },
  { id: 's2-mum-riding-bike', stage: 2, who: 'mum', doing: 'riding', what: 'bike', picture: { actor: 'mum', pose: 'riding', item: 'bike' } },
  { id: 's2-cat-eating-apple', stage: 2, who: 'cat', doing: 'eating', what: 'apple', picture: { actor: 'cat', pose: 'eating', item: 'apple' } },
  { id: 's3-big-dog-running-park', stage: 3, describe: 'big', who: 'dog', doing: 'running', where: 'park', picture: { actor: 'dog', pose: 'running', scale: 'big', place: 'park' } },
  { id: 's3-happy-girl-eating-apple-park', stage: 3, describe: 'happy', who: 'girl', doing: 'eating', what: 'apple', where: 'park', picture: { actor: 'girl', pose: 'eating', item: 'apple', mood: 'happy', place: 'park' } },
  { id: 's3-sad-boy-sleeping-bed', stage: 3, describe: 'sad', who: 'boy', doing: 'sleeping', where: 'bed', picture: { actor: 'boy', pose: 'sleeping', mood: 'sad', place: 'bed' } },
  { id: 's3-small-cat-jumping-beach', stage: 3, describe: 'small', who: 'cat', doing: 'jumping', where: 'beach', picture: { actor: 'cat', pose: 'jumping', scale: 'small', place: 'beach' } },
  { id: 's3-happy-boy-riding-bike-park', stage: 3, describe: 'happy', who: 'boy', doing: 'riding', what: 'bike', where: 'park', picture: { actor: 'boy', pose: 'riding', item: 'bike', mood: 'happy', place: 'park' } },
];

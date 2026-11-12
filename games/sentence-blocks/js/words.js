// words.js — the tiles. SEED SET for the plan's tests; the full reviewed set replaces it in the word batches.
const ALL = ['animal', 'child', 'adult'];
const ANY_PLACE = ['indoor', 'outdoor'];

export const WHO = [
  { id: 'girl', det: 'the', noun: 'girl', kind: 'child', pic: 'girl' },
  { id: 'boy', det: 'the', noun: 'boy', kind: 'child', pic: 'boy' },
  { id: 'dog', det: 'the', noun: 'dog', kind: 'animal', pic: 'dog' },
  { id: 'cat', det: 'the', noun: 'cat', kind: 'animal', pic: 'cat' },
  { id: 'mum', text: 'Mum', named: true, kind: 'adult', pic: 'mum' },
  { id: 'dogs', det: 'the', noun: 'dogs', plural: true, kind: 'animal', pic: 'dog' },
];
export const DOING = [
  { id: 'jumping', ing: 'jumping', takes: [], actors: ALL, wheres: ANY_PLACE, pic: 'jumping' },
  { id: 'sleeping', ing: 'sleeping', takes: [], actors: ALL, wheres: ['indoor'], pic: 'sleeping' },
  { id: 'running', ing: 'running', takes: [], actors: ALL, wheres: ['outdoor'], pic: 'running' },
  { id: 'eating', ing: 'eating', takes: ['food'], actors: ALL, wheres: ANY_PLACE, pic: 'eating' },
  { id: 'drinking', ing: 'drinking', takes: ['drink'], actors: ALL, wheres: ANY_PLACE, pic: 'drinking' },
  { id: 'riding', ing: 'riding', takes: ['rideable'], actors: ['child', 'adult'], wheres: ['outdoor'], pic: 'riding' },
];
export const WHAT = [
  { id: 'apple', det: 'an', noun: 'apple', tags: ['food'], pic: 'apple' },
  { id: 'carrot', det: 'a', noun: 'carrot', tags: ['food'], pic: 'carrot' },
  { id: 'milk', det: '', mass: true, noun: 'milk', tags: ['drink'], pic: 'milk' },
  { id: 'bike', det: 'a', noun: 'bike', tags: ['rideable'], pic: 'bike' },
];
export const WHERE = [
  { id: 'park', phrase: 'in the park', tags: ['outdoor'], group: 'green', pic: 'park' },
  { id: 'garden', phrase: 'in the garden', tags: ['outdoor'], group: 'green', pic: 'garden' },
  { id: 'bed', phrase: 'on the bed', tags: ['indoor'], pic: 'bed' },
  { id: 'beach', phrase: 'at the beach', tags: ['outdoor'], pic: 'beach' },
];
export const DESCRIBE = [
  { id: 'big', word: 'big', opposite: 'small', pic: 'big' },
  { id: 'small', word: 'small', opposite: 'big', pic: 'small' },
  { id: 'happy', word: 'happy', opposite: 'sad', pic: 'happy' },
  { id: 'sad', word: 'sad', opposite: 'happy', pic: 'sad' },
];
export const DATA = { who: WHO, doing: DOING, what: WHAT, where: WHERE, describe: DESCRIBE };

// words.js — the tiles. SEED SET for the plan's tests; the full reviewed set replaces it in the word batches.
const ALL = ['animal', 'child', 'adult'];
const ANY_PLACE = ['indoor', 'outdoor'];

export const WHO = [
  { id: 'girl', det: 'the', noun: 'girl', kind: 'child', pic: 'girl' },
  { id: 'boy', det: 'the', noun: 'boy', kind: 'child', pic: 'boy' },
  { id: 'baby', det: 'the', noun: 'baby', kind: 'baby', pic: 'baby' },
  { id: 'dog', det: 'the', noun: 'dog', kind: 'animal', pic: 'dog' },
  { id: 'cat', det: 'the', noun: 'cat', kind: 'animal', pic: 'cat' },
  { id: 'horse', det: 'the', noun: 'horse', kind: 'animal', pic: 'horse' },
  { id: 'rabbit', det: 'the', noun: 'rabbit', kind: 'animal', pic: 'rabbit' },
  { id: 'mum', text: 'Mum', named: true, kind: 'adult', pic: 'mum' },
  { id: 'dad', text: 'Dad', named: true, kind: 'adult', pic: 'dad' },
  { id: 'boys', det: 'the', noun: 'boys', plural: true, kind: 'child', pic: 'boy' },
  { id: 'girls', det: 'the', noun: 'girls', plural: true, kind: 'child', pic: 'girl' },
  { id: 'cats', det: 'the', noun: 'cats', plural: true, kind: 'animal', pic: 'cat' },
  { id: 'rabbits', det: 'the', noun: 'rabbits', plural: true, kind: 'animal', pic: 'rabbit' },
  { id: 'dogs', det: 'the', noun: 'dogs', plural: true, kind: 'animal', pic: 'dog' },
];
// Where-tags: indoor, outdoor, water (pool, beach). A doing word lists the tags of the places it can happen.
const WITH_BABY = ['animal', 'child', 'baby', 'adult'];
const NOT_BABY = ['animal', 'child', 'adult'];
const PEOPLE = ['child', 'adult'];
export const DOING = [
  // Batch B: intransitive (no "what").
  { id: 'jumping', ing: 'jumping', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, pic: 'jumping' },
  { id: 'sleeping', ing: 'sleeping', takes: [], actors: WITH_BABY, wheres: ['indoor'], pic: 'sleeping' },
  { id: 'running', ing: 'running', takes: [], actors: NOT_BABY, wheres: ['outdoor'], pic: 'running' },
  { id: 'swimming', ing: 'swimming', takes: [], actors: NOT_BABY, wheres: ['water'], pic: 'swimming' },
  { id: 'crying', ing: 'crying', takes: [], actors: ['child', 'baby', 'adult'], wheres: ANY_PLACE, pic: 'crying' },
  { id: 'climbing', ing: 'climbing', takes: [], actors: NOT_BABY, wheres: ['outdoor'], pic: 'climbing' },
  { id: 'sitting', ing: 'sitting', takes: [], actors: WITH_BABY, wheres: ANY_PLACE, pic: 'sitting' },
  { id: 'standing', ing: 'standing', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, pic: 'standing' },
  { id: 'walking', ing: 'walking', takes: [], actors: NOT_BABY, wheres: ['outdoor'], pic: 'walking' },
  // Batch C: transitive (each takes a "what" carrying one of its tags).
  { id: 'eating', ing: 'eating', takes: ['food'], actors: WITH_BABY, wheres: ANY_PLACE, pic: 'eating' },
  { id: 'drinking', ing: 'drinking', takes: ['drink'], actors: WITH_BABY, wheres: ANY_PLACE, pic: 'drinking' },
  { id: 'reading', ing: 'reading', takes: ['readable'], actors: PEOPLE, wheres: ['indoor'], pic: 'reading' },
  { id: 'riding', ing: 'riding', takes: ['rideable'], actors: PEOPLE, wheres: ['outdoor'], pic: 'riding' },
  { id: 'kicking', ing: 'kicking', takes: ['kickable'], actors: PEOPLE, wheres: ['outdoor'], pic: 'kicking' },
  { id: 'throwing', ing: 'throwing', takes: ['throwable'], actors: PEOPLE, wheres: ['outdoor'], pic: 'throwing' },
  { id: 'pushing', ing: 'pushing', takes: ['pushable'], actors: PEOPLE, wheres: ['outdoor'], pic: 'pushing' },
  { id: 'painting', ing: 'painting', takes: ['paintable'], actors: PEOPLE, wheres: ['indoor'], pic: 'painting' },
  { id: 'washing', ing: 'washing', takes: ['washable'], actors: PEOPLE, wheres: ['indoor'], pic: 'washing' },
  { id: 'brushing', ing: 'brushing', takes: ['brushable'], actors: PEOPLE, wheres: ['indoor'], pic: 'brushing' },
];
export const WHAT = [
  { id: 'apple', det: 'an', noun: 'apple', tags: ['food'], pic: 'apple' },
  { id: 'banana', det: 'a', noun: 'banana', tags: ['food'], pic: 'banana' },
  { id: 'carrot', det: 'a', noun: 'carrot', tags: ['food'], pic: 'carrot' },
  { id: 'sandwich', det: 'a', noun: 'sandwich', tags: ['food'], pic: 'sandwich' },
  { id: 'cake', det: 'a', noun: 'cake', tags: ['food'], pic: 'cake' },
  { id: 'milk', det: '', mass: true, noun: 'milk', tags: ['drink'], pic: 'milk' },
  { id: 'juice', det: '', mass: true, noun: 'juice', tags: ['drink'], pic: 'juice' },
  { id: 'water', det: '', mass: true, noun: 'water', tags: ['drink'], pic: 'water' },
  { id: 'book', det: 'a', noun: 'book', tags: ['readable'], pic: 'book' },
  { id: 'bike', det: 'a', noun: 'bike', tags: ['rideable'], pic: 'bike' },
  { id: 'scooter', det: 'a', noun: 'scooter', tags: ['rideable'], pic: 'scooter' },
  { id: 'ball', det: 'a', noun: 'ball', tags: ['kickable', 'throwable'], pic: 'ball' },
  { id: 'pram', det: 'a', noun: 'pram', tags: ['pushable'], pic: 'pram' },
  { id: 'swing', det: 'a', noun: 'swing', tags: ['pushable'], pic: 'swing' },
  { id: 'picture', det: 'a', noun: 'picture', tags: ['paintable'], pic: 'picture' },
  { id: 'car', det: 'a', noun: 'car', tags: ['washable'], pic: 'car' },
  { id: 'plate', det: 'a', noun: 'plate', tags: ['washable'], pic: 'plate' },
  { id: 'teeth', det: '', mass: true, noun: 'teeth', tags: ['brushable'], pic: 'teeth' },
  { id: 'hair', det: '', mass: true, noun: 'hair', tags: ['brushable'], pic: 'hair' },
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

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
  // v2, undrawn. Animals:
  ...['bird', 'duck', 'fish', 'pig', 'cow', 'sheep', 'mouse', 'frog', 'monkey', 'lion', 'elephant', 'tiger']
    .map((n) => ({ id: n, det: 'the', noun: n, kind: 'animal' })),
  ...['dinosaur', 'dragon'].map((n) => ({ id: n, det: 'the', noun: n, kind: 'animal', freeOnly: true })),
  // People and characters:
  // freeOnly: could also be true of a picture (a princess for a girl, Grandma for Mum), so never a wrong tile in a scene.
  ...['teacher', 'nurse', 'king', 'queen', 'pirate', 'wizard', 'robot']
    .map((n) => ({ id: n, det: 'the', noun: n, kind: 'adult', freeOnly: true })),
  { id: 'princess', det: 'the', noun: 'princess', irregularS: true, kind: 'adult', freeOnly: true },   // ends in s but is singular
  { id: 'grandma', text: 'Grandma', named: true, kind: 'adult', freeOnly: true },
  { id: 'grandad', text: 'Grandad', named: true, kind: 'adult', freeOnly: true },
];
// Where-tags: indoor, outdoor, water (pool, beach). A doing word lists the tags of the places it can happen.
const WITH_BABY = ['animal', 'child', 'baby', 'adult'];
const NOT_BABY = ['animal', 'child', 'adult'];
const PEOPLE = ['child', 'adult'];
export const DOING = [
  // Batch B: intransitive (no "what").
  { id: 'jumping', group: 'jump', ing: 'jumping', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, pic: 'jumping' },
  { id: 'sleeping', group: 'sleep', ing: 'sleeping', takes: [], actors: WITH_BABY, wheres: ['indoor'], pic: 'sleeping' },
  { id: 'running', ing: 'running', takes: [], actors: NOT_BABY, wheres: ['outdoor'], pic: 'running' },
  { id: 'swimming', group: 'swim', ing: 'swimming', takes: [], actors: NOT_BABY, wheres: ['water'], pic: 'swimming' },
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
  { id: 'throwing', group: 'throw', ing: 'throwing', takes: ['throwable'], actors: PEOPLE, wheres: ['outdoor'], pic: 'throwing' },
  { id: 'pushing', group: 'move', ing: 'pushing', takes: ['pushable'], actors: PEOPLE, wheres: ['outdoor'], pic: 'pushing' },
  { id: 'painting', group: 'draw', ing: 'painting', takes: ['paintable'], actors: PEOPLE, wheres: ['indoor'], pic: 'painting' },
  { id: 'washing', group: 'clean', ing: 'washing', takes: ['washable'], actors: PEOPLE, wheres: ['indoor'], pic: 'washing' },
  { id: 'brushing', ing: 'brushing', takes: ['brushable'], actors: PEOPLE, wheres: ['indoor'], pic: 'brushing' },
  // v2, undrawn. `group` = could also be true of a picture of the same action, so never offered together (as with places).
  // Intransitive (no "what"):
  ...['singing', 'waving', 'hiding', 'spinning'].map((w) => ({ id: w, ing: w, takes: [], actors: NOT_BABY, wheres: ANY_PLACE })),
  ...['dancing', 'hopping'].map((w) => ({ id: w, ing: w, takes: [], actors: NOT_BABY, wheres: ANY_PLACE, group: 'jump' })),
  ...['laughing', 'giggling'].map((w) => ({ id: w, ing: w, takes: [], actors: NOT_BABY, wheres: ANY_PLACE, group: 'laugh' })),
  { id: 'yawning', ing: 'yawning', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, group: 'sleep' },
  { id: 'playing', ing: 'playing', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, freeOnly: true },   // too general to be wrong of any picture
  { id: 'flying', ing: 'flying', takes: [], actors: NOT_BABY, wheres: ['outdoor'] },
  { id: 'skipping', ing: 'skipping', takes: [], actors: PEOPLE, wheres: ['outdoor'], group: 'jump' },
  { id: 'splashing', ing: 'splashing', takes: [], actors: NOT_BABY, wheres: ['water'], group: 'swim' },
  // Transitive (each takes a "what" carrying one of its tags):
  { id: 'catching', ing: 'catching', takes: ['throwable'], actors: PEOPLE, wheres: ['outdoor'], group: 'throw' },
  { id: 'baking', ing: 'baking', takes: ['food'], actors: PEOPLE, wheres: ['indoor'], group: 'cook' },
  { id: 'cooking', ing: 'cooking', takes: ['food'], actors: PEOPLE, wheres: ['indoor'], group: 'cook' },
  { id: 'cleaning', ing: 'cleaning', takes: ['washable'], actors: PEOPLE, wheres: ['indoor'], group: 'clean' },
  { id: 'drawing', ing: 'drawing', takes: ['paintable'], actors: PEOPLE, wheres: ['indoor'], group: 'draw' },
  { id: 'carrying', ing: 'carrying', takes: ['pushable', 'throwable'], actors: PEOPLE, wheres: ANY_PLACE, group: 'move' },
  { id: 'tasting', ing: 'tasting', takes: ['food', 'drink'], actors: WITH_BABY, wheres: ANY_PLACE, freeOnly: true },   // true of any eating or drinking picture
];
export const WHAT = [
  { id: 'apple', det: 'an', noun: 'apple', tags: ['food'], pic: 'apple' },
  { id: 'banana', det: 'a', noun: 'banana', tags: ['food'], pic: 'banana' },
  { id: 'carrot', det: 'a', noun: 'carrot', tags: ['food'], pic: 'carrot' },
  { id: 'sandwich', det: 'a', noun: 'sandwich', tags: ['food'], pic: 'sandwich' },
  { id: 'cake', det: 'a', noun: 'cake', tags: ['food'], pic: 'cake' },
  { id: 'milk', det: '', mass: true, noun: 'milk', tags: ['drink'], pic: 'milk' },
  { id: 'juice', group: 'juice', det: '', mass: true, noun: 'juice', tags: ['drink'], pic: 'juice' },
  { id: 'water', det: '', mass: true, noun: 'water', tags: ['drink'], pic: 'water' },
  { id: 'book', group: 'reading', det: 'a', noun: 'book', tags: ['readable'], pic: 'book' },
  { id: 'bike', det: 'a', noun: 'bike', tags: ['rideable'], pic: 'bike' },
  { id: 'scooter', det: 'a', noun: 'scooter', tags: ['rideable'], pic: 'scooter' },
  { id: 'ball', det: 'a', noun: 'ball', tags: ['kickable', 'throwable'], pic: 'ball' },
  { id: 'pram', group: 'pushchair', det: 'a', noun: 'pram', tags: ['pushable'], pic: 'pram' },
  { id: 'swing', det: 'a', noun: 'swing', tags: ['pushable'], pic: 'swing' },
  { id: 'picture', det: 'a', noun: 'picture', tags: ['paintable'], pic: 'picture' },
  { id: 'car', det: 'a', noun: 'car', tags: ['washable'], pic: 'car' },
  { id: 'plate', det: 'a', noun: 'plate', tags: ['washable'], pic: 'plate' },
  { id: 'teeth', det: '', mass: true, noun: 'teeth', tags: ['brushable'], pic: 'teeth' },
  { id: 'hair', det: '', mass: true, noun: 'hair', tags: ['brushable'], pic: 'hair' },
  // v2, undrawn. a/an and mass nouns are checked by the validator.
  { id: 'orange', det: 'an', noun: 'orange', tags: ['food'] }, { id: 'pear', det: 'a', noun: 'pear', tags: ['food'] },
  { id: 'biscuit', det: 'a', noun: 'biscuit', tags: ['food'] }, { id: 'pizza', det: 'a', noun: 'pizza', tags: ['food'] },
  { id: 'icecream', det: 'an', noun: 'ice cream', tags: ['food'] },
  { id: 'cheese', det: '', mass: true, noun: 'cheese', tags: ['food'] }, { id: 'toast', det: '', mass: true, noun: 'toast', tags: ['food'] },
  { id: 'pasta', det: '', mass: true, noun: 'pasta', tags: ['food'] }, { id: 'grapes', det: '', mass: true, noun: 'grapes', tags: ['food'] },
  { id: 'soup', det: '', mass: true, noun: 'soup', tags: ['food'] },
  { id: 'tea', det: '', mass: true, noun: 'tea', tags: ['drink'] }, { id: 'lemonade', det: '', mass: true, noun: 'lemonade', group: 'juice', tags: ['drink'] },
  { id: 'comic', det: 'a', noun: 'comic', group: 'reading', tags: ['readable'] }, { id: 'map', det: 'a', noun: 'map', tags: ['readable'] },
  { id: 'magazine', det: 'a', noun: 'magazine', group: 'reading', tags: ['readable'] }, { id: 'letter', det: 'a', noun: 'letter', tags: ['readable'] },
  { id: 'trike', det: 'a', noun: 'trike', tags: ['rideable'] }, { id: 'skateboard', det: 'a', noun: 'skateboard', tags: ['rideable'] },
  { id: 'bus', det: 'a', noun: 'bus', tags: ['rideable'] }, { id: 'train', det: 'a', noun: 'train', tags: ['rideable'] },
  { id: 'stone', det: 'a', noun: 'stone', tags: ['kickable', 'throwable'] }, { id: 'box', det: 'a', noun: 'box', tags: ['kickable', 'pushable'] },
  { id: 'frisbee', det: 'a', noun: 'frisbee', tags: ['throwable'] }, { id: 'stick', det: 'a', noun: 'stick', tags: ['throwable'] },
  { id: 'snowball', det: 'a', noun: 'snowball', tags: ['throwable'] },
  { id: 'trolley', det: 'a', noun: 'trolley', tags: ['pushable'] }, { id: 'wheelbarrow', det: 'a', noun: 'wheelbarrow', tags: ['pushable'] },
  { id: 'door', det: 'a', noun: 'door', tags: ['pushable', 'paintable'] },
  { id: 'buggy', det: 'a', noun: 'buggy', group: 'pushchair', tags: ['pushable'] },
  { id: 'wall', det: 'a', noun: 'wall', tags: ['paintable'] }, { id: 'fence', det: 'a', noun: 'fence', tags: ['paintable'] },
  { id: 'flower', det: 'a', noun: 'flower', tags: ['paintable'] }, { id: 'rainbow', det: 'a', noun: 'rainbow', tags: ['paintable'] },
  { id: 'cup', det: 'a', noun: 'cup', tags: ['washable'] }, { id: 'bowl', det: 'a', noun: 'bowl', tags: ['washable'] },
  { id: 'window', det: 'a', noun: 'window', tags: ['washable'] },
];
// Batch D. `group` marks tiles that look alike, so they are never offered as each other's wrong answer.
export const WHERE = [
  { id: 'park', phrase: 'in the park', tags: ['outdoor'], group: 'green', pic: 'park' },
  { id: 'garden', phrase: 'in the garden', tags: ['outdoor'], group: 'green', pic: 'garden' },
  { id: 'beach', phrase: 'at the beach', tags: ['outdoor', 'water'], group: 'water', pic: 'beach' },
  { id: 'pool', phrase: 'in the pool', tags: ['water'], group: 'water', pic: 'pool' },
  { id: 'house', phrase: 'in the house', tags: ['indoor'], group: 'building', pic: 'house' },
  { id: 'school', phrase: 'at school', tags: ['indoor'], group: 'building', pic: 'school' },
  { id: 'shop', phrase: 'at the shop', tags: ['indoor'], group: 'building', pic: 'shop' },
  { id: 'kitchen', phrase: 'in the kitchen', tags: ['indoor'], group: 'room', pic: 'kitchen' },
  { id: 'bed', phrase: 'on the bed', tags: ['indoor'], group: 'room', pic: 'bed' },
  // v2, undrawn. `group` = could also be true of a scene, so never offered as its wrong tile.
  { id: 'playground', phrase: 'in the playground', tags: ['outdoor'], group: 'green' },
  { id: 'forest', phrase: 'in the forest', tags: ['outdoor'], group: 'green' },
  { id: 'farm', phrase: 'on the farm', tags: ['outdoor'], group: 'green' },
  { id: 'hill', phrase: 'on the hill', tags: ['outdoor'], group: 'green' },
  { id: 'zoo', phrase: 'at the zoo', tags: ['outdoor'] },
  { id: 'street', phrase: 'in the street', tags: ['outdoor'] },
  { id: 'castle', phrase: 'at the castle', tags: ['outdoor'] },
  { id: 'cave', phrase: 'in the cave', tags: ['outdoor'] },
  { id: 'sea', phrase: 'in the sea', tags: ['water'], group: 'water' },
  { id: 'bath', phrase: 'in the bath', tags: ['water', 'indoor'], group: 'water' },
  { id: 'bedroom', phrase: 'in the bedroom', tags: ['indoor'], group: 'room' },
  { id: 'space', phrase: 'in space', tags: ['outdoor'], group: 'space' },
  { id: 'moon', phrase: 'on the moon', tags: ['outdoor'], group: 'space' },
];
export const DESCRIBE = [
  { id: 'big', word: 'big', opposite: 'small', pic: 'big' },
  { id: 'small', word: 'small', opposite: 'big', pic: 'small' },
  { id: 'happy', word: 'happy', opposite: 'sad', pic: 'happy' },
  { id: 'sad', word: 'sad', opposite: 'happy', pic: 'sad' },
  // v2, undrawn pairs:
  { id: 'fast', word: 'fast', opposite: 'slow' }, { id: 'slow', word: 'slow', opposite: 'fast' },
  { id: 'hot', word: 'hot', opposite: 'cold' }, { id: 'cold', word: 'cold', opposite: 'hot' },
  { id: 'tall', word: 'tall', opposite: 'short' }, { id: 'short', word: 'short', opposite: 'tall' },
  { id: 'loud', word: 'loud', opposite: 'quiet' }, { id: 'quiet', word: 'quiet', opposite: 'loud' },
  { id: 'wet', word: 'wet', opposite: 'dry' }, { id: 'dry', word: 'dry', opposite: 'wet' },
  { id: 'giant', word: 'giant', opposite: 'tiny' }, { id: 'tiny', word: 'tiny', opposite: 'giant' },
  { id: 'brave', word: 'brave', opposite: 'scared' }, { id: 'scared', word: 'scared', opposite: 'brave' },
  { id: 'clean', word: 'clean', opposite: 'dirty' }, { id: 'dirty', word: 'dirty', opposite: 'clean' },
];
export const DATA = { who: WHO, doing: DOING, what: WHAT, where: WHERE, describe: DESCRIBE };

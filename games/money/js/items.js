// items.js: the things a child can be asked about. Plain data, reviewed by a grown-up.
// pence: a typical UK price, in whole pence. lo..hi: the range you would plausibly pay (a shop, a size, a sale).
// size: how big the thing is in real life (1 small, 2 medium, 3 large). tier: 1 = a 5-year-old knows it, 2 = older children.
// group: optional; items in one group are never asked about together (they look or cost too alike).
export const AS_OF = '2026-11';

export const ITEMS = [
  // Pocket money
  { id: 'sweets',        name: 'Sweets',          pence: 100,       lo: 60,        hi: 150,       size: 1, tier: 1, group: 'snack' },
  { id: 'ice-lolly',     name: 'Ice lolly',       pence: 150,       lo: 100,       hi: 250,       size: 1, tier: 1, group: 'snack' },
  { id: 'ice-cream',     name: 'Ice cream',       pence: 300,       lo: 200,       hi: 400,       size: 1, tier: 1, group: 'snack' },
  { id: 'comic',         name: 'Comic',           pence: 400,       lo: 300,       hi: 500,       size: 1, tier: 1 },
  { id: 'balloon',       name: 'Balloon',         pence: 100,       lo: 60,        hi: 150,       size: 2, tier: 1 },
  { id: 'beach-ball',    name: 'Beach ball',      pence: 400,       lo: 200,       hi: 600,       size: 2, tier: 1, group: 'ball' },
  { id: 'cardboard-box', name: 'Cardboard box',   pence: 100,       lo: 50,        hi: 300,       size: 3, tier: 1 },
  // Treats
  { id: 'pizza',         name: 'Pizza',           pence: 1400,      lo: 900,       hi: 2500,      size: 2, tier: 1 },
  { id: 'football',      name: 'Football',        pence: 1000,      lo: 600,       hi: 1500,      size: 2, tier: 1, group: 'ball' },
  { id: 'teddy',         name: 'Teddy bear',      pence: 1200,      lo: 800,       hi: 2000,      size: 2, tier: 1 },
  { id: 'paddling-pool', name: 'Paddling pool',   pence: 3000,      lo: 2000,      hi: 6000,      size: 3, tier: 1 },
  { id: 'xmas-tree',     name: 'Christmas tree',  pence: 6000,      lo: 3500,      hi: 12000,     size: 3, tier: 1 },
  { id: 'trainers',      name: 'Trainers',        pence: 3500,      lo: 2000,      hi: 7000,      size: 2, tier: 1 },
  { id: 'scooter',       name: 'Scooter',         pence: 7000,      lo: 3000,      hi: 12000,     size: 2, tier: 1 },
  { id: 'tent',          name: 'Tent',            pence: 12000,     lo: 6000,      hi: 40000,     size: 3, tier: 1 },
  // Hundreds
  { id: 'bike',          name: 'Bike',            pence: 18000,     lo: 9000,      hi: 45000,     size: 2, tier: 1 },
  { id: 'tablet',        name: 'Tablet',          pence: 15000,     lo: 6000,      hi: 40000,     size: 1, tier: 1 },
  { id: 'trampoline',    name: 'Trampoline',      pence: 20000,     lo: 10000,     hi: 40000,     size: 3, tier: 1 },
  { id: 'console',       name: 'Games console',   pence: 50000,     lo: 25000,     hi: 80000,     size: 1, tier: 1 },
  { id: 'phone',         name: 'Phone',           pence: 60000,     lo: 30000,     hi: 130000,    size: 1, tier: 1 },
  { id: 'tv',            name: 'TV',              pence: 35000,     lo: 20000,     hi: 90000,     size: 3, tier: 1 },
  { id: 'sofa',          name: 'Sofa',            pence: 80000,     lo: 30000,     hi: 200000,    size: 3, tier: 1 },
  // Thousands and up
  { id: 'holiday',       name: 'Holiday',         pence: 300000,    lo: 200000,    hi: 450000,    size: 2, tier: 1 },
  { id: 'motorbike',     name: 'Motorbike',       pence: 350000,    lo: 150000,    hi: 600000,    size: 3, tier: 1 },
  { id: 'car',           name: 'Car',             pence: 1700000,   lo: 800000,    hi: 4000000,   size: 3, tier: 1 },
  { id: 'tractor',       name: 'Tractor',         pence: 5000000,   lo: 1000000,   hi: 14000000,  size: 3, tier: 1 },
  { id: 'house',         name: 'House',           pence: 27500000,  lo: 15000000,  hi: 50000000,  size: 3, tier: 1 },
];

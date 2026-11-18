import { ITEMS } from '../js/items.js';
import { formatPrice } from '../js/engine.js';

for (const it of ITEMS) {
  console.log([
    it.id,
    it.name,
    formatPrice(it.pence),
    formatPrice(it.lo) + ' to ' + formatPrice(it.hi),
    'size ' + it.size,
    'tier ' + it.tier,
    it.group || '-',
  ].join(' | '));
}

'use strict';
// Seed data + tiny inline-SVG "product photos" for demo mode (see
// api.fake.js) — fully offline, no network image requests, so this works
// for design/interaction review even with no tailnet connection at all.

function svgIcon(emoji, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${bg}"/><text x="32" y="42" font-size="30" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// A broader catalog than the original 12-item seed — enough spread across
// categories (dairy, produce, bakery, meat/deli, pantry, drinks, household)
// that a visitor trying the demo can search for more or less whatever
// grocery item comes to mind and actually get a result, not just the
// handful of items the rest of the seed data happens to reference.
export const CATALOG = [
  // Dairy & eggs
  { name: 'Mjölk Färsk 3%, Arla', url: '/p/mjolk-3', price: '26,90', priceUnit: 'st', size: '3l', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Mjölk Färsk 1,5%, Arla', url: '/p/mjolk-15', price: '12,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Havredryck, Oatly', url: '/p/oatly', price: '24,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🌾', '#f3efe2') },
  { name: 'Filmjölk 3%, Arla', url: '/p/filmjolk', price: '15,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🥣', '#eaf3ee') },
  { name: 'Yoghurt Naturell 3%, Skånemejerier', url: '/p/yoghurt', price: '22,90', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🥣', '#eaf3ee') },
  { name: 'Smör Normalsaltat 82%, Svenskt Smör', url: '/p/smor', price: '37,50', priceUnit: 'st', size: '250g', imageUrl: svgIcon('🧈', '#fbf3d8') },
  { name: 'Ägg, 12-pack, Kronägg', url: '/p/agg', price: '42,90', priceUnit: 'st', size: '12st', imageUrl: svgIcon('🥚', '#f6ece0') },
  { name: 'Grädde Vispgrädde 40%, Arla', url: '/p/gradde', price: '28,90', priceUnit: 'st', size: '5dl', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Riven Ost Prästost 26%, Arla', url: '/p/ost', price: '54,90', priceUnit: 'st', size: '400g', imageUrl: svgIcon('🧀', '#fbf3d8') },

  // Produce
  { name: 'Äpple Royal Gala Klass 1', url: '/p/apple', price: '26,90', priceUnit: 'kg', size: '~200g/st, priced /kg (weight varies)', imageUrl: svgIcon('🍎', '#fbeaea') },
  { name: 'Bananer Fairtrade', url: '/p/banan', price: '19,90', priceUnit: 'kg', size: '~140g/st, priced /kg (weight varies)', imageUrl: svgIcon('🍌', '#fbf3d8') },
  { name: 'Gurka Sverige Klass 1', url: '/p/gurka', price: '14,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🥒', '#eaf3ee') },
  { name: 'Tomater Cocktail Klass 1', url: '/p/tomat', price: '29,90', priceUnit: 'st', size: '350g', imageUrl: svgIcon('🍅', '#fbeaea') },
  { name: 'Avokado Klass 1', url: '/p/avokado', price: '17,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🥑', '#eaf3ee') },
  { name: 'Potatis Fast, Sverige', url: '/p/potatis', price: '24,90', priceUnit: 'st', size: '2kg', imageUrl: svgIcon('🥔', '#f6ece0') },
  { name: 'Lök Gul, Sverige', url: '/p/lok', price: '12,90', priceUnit: 'kg', size: '~110g/st, priced /kg (weight varies)', imageUrl: svgIcon('🧅', '#f6ece0') },
  { name: 'Citron Klass 1', url: '/p/citron', price: '6,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🍋', '#fbf3d8') },

  // Bakery
  { name: 'Bondbröd Runt, Östras Bröd', url: '/p/brod', price: '34,92', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🍞', '#f6ece0') },
  { name: 'Kanelbullar, Pågen', url: '/p/kanelbullar', price: '29,90', priceUnit: 'st', size: '6-pack', imageUrl: svgIcon('🥐', '#f6ece0') },
  { name: 'Croissant, Pågen', url: '/p/croissant', price: '26,90', priceUnit: 'st', size: '4-pack', imageUrl: svgIcon('🥐', '#f6ece0') },

  // Meat & deli
  { name: 'Kebab Klassisk, Schysst Käk', url: '/p/kebab', price: '48,73', priceUnit: 'st', size: '275g', imageUrl: svgIcon('🥙', '#f6ece0') },
  { name: 'Het Kebabsås', url: '/p/kebabsas', price: '28,29', priceUnit: 'st', size: '335ml', imageUrl: svgIcon('🌶️', '#fbeaea') },
  { name: 'Kycklingfilé, Kronfågel', url: '/p/kyckling', price: '89,90', priceUnit: 'st', size: '900g', imageUrl: svgIcon('🍗', '#f6ece0') },
  { name: 'Nötfärs 12%, Sverige', url: '/p/notfars', price: '69,90', priceUnit: 'st', size: '500g', imageUrl: svgIcon('🥩', '#fbeaea') },
  { name: 'Bacon Skivat, Scan', url: '/p/bacon', price: '32,90', priceUnit: 'st', size: '140g', imageUrl: svgIcon('🥓', '#fbeaea') },
  { name: 'Falukorv, Scan', url: '/p/falukorv', price: '24,90', priceUnit: 'st', size: '800g', imageUrl: svgIcon('🌭', '#fbeaea') },

  // Pantry
  { name: 'Pasta Spaghetti, Barilla', url: '/p/pasta', price: '18,90', priceUnit: 'st', size: '500g', imageUrl: svgIcon('🍝', '#f3efe2') },
  { name: 'Ris Jasminris, Kung Markatta', url: '/p/ris', price: '32,90', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🍚', '#f3efe2') },
  { name: 'Krossade Tomater, Bruna Bönor', url: '/p/tomatkross', price: '11,90', priceUnit: 'st', size: '400g', imageUrl: svgIcon('🥫', '#fbeaea') },
  { name: 'Olivolja Extra Virgin, Zeta', url: '/p/olivolja', price: '69,90', priceUnit: 'st', size: '500ml', imageUrl: svgIcon('🫒', '#f3efe2') },
  { name: 'Kaffe Bryggmalet, Gevalia', url: '/p/kaffe', price: '59,90', priceUnit: 'st', size: '450g', imageUrl: svgIcon('☕', '#f6ece0') },
  { name: 'Diskmedel Original, Yes', url: '/p/diskmedel', price: '29,90', priceUnit: 'st', size: '500ml', imageUrl: svgIcon('🧴', '#eaf3ee') },
  { name: 'Toalettpapper, Lambi', url: '/p/toapapper', price: '54,90', priceUnit: 'st', size: '8-pack', imageUrl: svgIcon('🧻', '#f3efe2') },

  // Drinks & snacks
  { name: 'Läsk Cola, Coca-Cola', url: '/p/cola', price: '22,90', priceUnit: 'st', size: '1,5l', imageUrl: svgIcon('🥤', '#fbeaea') },
  { name: 'Chips Original, OLW', url: '/p/chips', price: '26,90', priceUnit: 'st', size: '275g', imageUrl: svgIcon('🍟', '#fbf3d8') },
  { name: 'Chokladkaka Mjölkchoklad, Marabou', url: '/p/choklad', price: '32,90', priceUnit: 'st', size: '200g', imageUrl: svgIcon('🍫', '#f6ece0') },
];

// Demo mode: track confirmed matches by query (normalized lowercase) → URL.
// The real backend should return this from /search; see api.fake.js comment.
export const demoConfirmedByQuery = new Map([
  ['mjölk', '/p/mjolk-3'],
  ['gurka', '/p/gurka'],
  ['kebab', '/p/kebab'],
  ['bröd', '/p/brod'],
  ['ägg', '/p/agg'],
  ['smör', '/p/smor'],
  ['banan', '/p/banan'],
  ['kaffe', '/p/kaffe'],
  ['pasta', '/p/pasta'],
]);

export function seedListItems() {
  const now = Date.now();
  return [
    { id: 1, text: 'Kebab Klassisk, Schysst Käk (275g) — 48,73 kr', added_by: 'erik', added_at: new Date(now - 3600e3).toISOString(), done: 0, checked: 0, quantity: 1 },
    { id: 2, text: 'Het Kebabsås (335ml) — 28,29 kr', added_by: 'erik', added_at: new Date(now - 3500e3).toISOString(), done: 0, checked: 0, quantity: 1 },
    { id: 3, text: 'Bondbröd Runt (Östras Bröd 1kg) — 34,92 kr', added_by: 'anna', added_at: new Date(now - 3000e3).toISOString(), done: 0, checked: 0, quantity: 1 },
    { id: 4, text: 'Smör Normalsaltat 82% (Svenskt Smör 250g) — 37,50 kr', added_by: 'anna', added_at: new Date(now - 2000e3).toISOString(), done: 0, checked: 0, quantity: 2 },
    { id: 5, text: 'Äpple Royal Gala Klass 1 (~200g/st, priced /kg (weight varies)) — 26,90 kr/kg', added_by: 'erik', added_at: new Date(now - 1000e3).toISOString(), done: 0, checked: 0, quantity: 6 },
    { id: 6, text: 'Diskmedel', added_by: 'erik', added_at: new Date(now - 500e3).toISOString(), done: 0, checked: 0, quantity: 1 },
  ];
}

function catalogItemText(url) {
  const c = CATALOG.find((x) => x.url === url);
  const sizePart = c.size ? ` (${c.size})` : '';
  const pricePart = c.price ? ` — ${c.price} kr${c.priceUnit === 'kg' ? '/kg' : ''}` : '';
  return `${c.name}${sizePart}${pricePart}`;
}

function cartItems(startId, addedBy, entries) {
  return entries.map(([url, quantity = 1], i) => ({
    id: startId + i,
    position: i,
    text: catalogItemText(url),
    quantity,
    product_url: url,
    department_name: null,
    department_code: null,
    added_by: addedBy,
  }));
}

export function seedCarts() {
  const now = Date.now();
  return [
    {
      id: 1,
      name: 'Veckobasics',
      kind: 'saved',
      created_by: 'Pappa',
      created_at: new Date(now - 3 * 86400e3).toISOString(),
      items: cartItems(1, 'Pappa', [['/p/mjolk-3'], ['/p/agg'], ['/p/smor'], ['/p/brod'], ['/p/banan', 6], ['/p/kaffe']]),
    },
    {
      id: 2,
      name: null,
      kind: 'sent',
      created_by: 'Pappa',
      created_at: new Date(now - 7 * 86400e3).toISOString(),
      items: cartItems(101, 'Pappa', [['/p/mjolk-3', 2], ['/p/kyckling'], ['/p/ris'], ['/p/gurka'], ['/p/tomat'], ['/p/yoghurt'], ['/p/toapapper'], ['/p/choklad']]),
    },
    {
      id: 3,
      name: null,
      kind: 'sent',
      created_by: 'Leia',
      created_at: new Date(now - 14 * 86400e3).toISOString(),
      items: cartItems(201, 'Leia', [['/p/pasta', 2], ['/p/tomatkross', 3], ['/p/notfars'], ['/p/ost'], ['/p/lok'], ['/p/olivolja'], ['/p/kanelbullar'], ['/p/cola']]),
    },
  ];
}

export function seedListState() {
  return { id: 1, trigger_at: new Date(Date.now() + 2 * 86400e3).toISOString(), trigger_set_by: 'erik', trigger_set_at: new Date().toISOString(), status: 'open', sent_at: null, sent_by: null };
}

function stockholmDate(daysAhead) {
  return new Date(Date.now() + daysAhead * 86400e3).toLocaleDateString('sv-SE');
}

function slot(daysAhead, startHour, endHour) {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const d = new Date(Date.now() + daysAhead * 86400e3);
  const label = `${days[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('sv-SE', { month: 'short' })}`;
  const pad = (n) => String(n).padStart(2, '0');
  return { startTime: d.getTime(), formattedTime: `${label} ${pad(startHour)}:00-${pad(endHour)}:00`, available: true };
}

export function seedDeliveryAlternatives() {
  return [
    { label: '2 days ahead (afternoon/evening)', targetDate: stockholmDate(2), slots: [slot(2, 14, 16), slot(2, 16, 18), slot(2, 18, 20)] },
    { label: '3 days ahead (16:00+)', targetDate: stockholmDate(3), slots: [slot(3, 16, 18), slot(3, 18, 20)] },
    { label: '4 days ahead (evening)', targetDate: stockholmDate(4), slots: [] },
  ];
}

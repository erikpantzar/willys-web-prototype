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
  { name: 'Mjölk Färsk 3%, Arla', url: '/produkt/Mjolk-Farsk-3procent-Arla-101233931_ST', price: '26,90', priceUnit: 'st', size: '3l', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Mjölk Färsk 1,5%, Arla', url: '/produkt/Mjolk-Farsk-1-5procent-Arla-101233932_ST', price: '12,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Havredryck, Oatly', url: '/produkt/Havredryck-Oatly-101047583_ST', price: '24,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🌾', '#f3efe2') },
  { name: 'Filmjölk 3%, Arla', url: '/produkt/Filmjolk-3procent-Arla-100155371_ST', price: '15,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🥣', '#eaf3ee') },
  { name: 'Yoghurt Naturell 3%, Skånemejerier', url: '/produkt/Yoghurt-Naturell-3procent-Skanemejerier-101198722_ST', price: '22,90', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🥣', '#eaf3ee') },
  { name: 'Smör Normalsaltat 82%, Svenskt Smör', url: '/produkt/Smor-Normalsaltat-82procent-Svenskt-Smor-100109181_ST', price: '37,50', priceUnit: 'st', size: '250g', imageUrl: svgIcon('🧈', '#fbf3d8') },
  { name: 'Ägg, 12-pack, Kronägg', url: '/produkt/Agg-12-pack-Kronagg-100254906_ST', price: '42,90', priceUnit: 'st', size: '12st', imageUrl: svgIcon('🥚', '#f6ece0') },
  { name: 'Grädde Vispgrädde 40%, Arla', url: '/produkt/Vispgradde-40procent-Arla-100155377_ST', price: '28,90', priceUnit: 'st', size: '5dl', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Riven Ost Prästost 26%, Arla', url: '/produkt/Riven-Ost-Prastost-26procent-Arla-101201473_ST', price: '54,90', priceUnit: 'st', size: '400g', imageUrl: svgIcon('🧀', '#fbf3d8') },

  // Produce
  { name: 'Äpple Royal Gala Klass 1', url: '/produkt/Apple-Royal-Gala-Klass-1-100047012_KG', price: '26,90', priceUnit: 'kg', size: '~200g/st, priced /kg (weight varies)', imageUrl: svgIcon('🍎', '#fbeaea') },
  { name: 'Bananer Fairtrade', url: '/produkt/Bananer-Fairtrade-100031183_KG', price: '19,90', priceUnit: 'kg', size: '~140g/st, priced /kg (weight varies)', imageUrl: svgIcon('🍌', '#fbf3d8') },
  { name: 'Gurka Sverige Klass 1', url: '/produkt/Gurka-Sverige-Klass-1-100046993_ST', price: '14,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🥒', '#eaf3ee') },
  { name: 'Tomater Cocktail Klass 1', url: '/produkt/Tomater-Cocktail-Klass-1-101052417_ST', price: '29,90', priceUnit: 'st', size: '350g', imageUrl: svgIcon('🍅', '#fbeaea') },
  { name: 'Avokado Klass 1', url: '/produkt/Avokado-Klass-1-100047281_ST', price: '17,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🥑', '#eaf3ee') },
  { name: 'Potatis Fast, Sverige', url: '/produkt/Potatis-Fast-Sverige-101117690_ST', price: '24,90', priceUnit: 'st', size: '2kg', imageUrl: svgIcon('🥔', '#f6ece0') },
  { name: 'Lök Gul, Sverige', url: '/produkt/Lok-Gul-Sverige-100047105_KG', price: '12,90', priceUnit: 'kg', size: '~110g/st, priced /kg (weight varies)', imageUrl: svgIcon('🧅', '#f6ece0') },
  { name: 'Citron Klass 1', url: '/produkt/Citron-Klass-1-100047043_ST', price: '6,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🍋', '#fbf3d8') },

  // Bakery
  { name: 'Bondbröd Runt, Östras Bröd', url: '/produkt/Bondbrod-Runt-Ostras-Brod-100255720_ST', price: '34,92', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🍞', '#f6ece0') },
  { name: 'Kanelbullar, Pågen', url: '/produkt/Kanelbullar-Pagen-101131322_ST', price: '29,90', priceUnit: 'st', size: '6-pack', imageUrl: svgIcon('🥐', '#f6ece0') },
  { name: 'Croissant, Pågen', url: '/produkt/Croissant-Pagen-101131329_ST', price: '26,90', priceUnit: 'st', size: '4-pack', imageUrl: svgIcon('🥐', '#f6ece0') },

  // Meat & deli
  { name: 'Kebab Klassisk, Schysst Käk', url: '/produkt/Kebab-Klassisk-Schysst-Kak-101275542_ST', price: '48,73', priceUnit: 'st', size: '275g', imageUrl: svgIcon('🥙', '#f6ece0') },
  { name: 'Het Kebabsås', url: '/produkt/Het-Kebabsas-101275547_ST', price: '28,29', priceUnit: 'st', size: '335ml', imageUrl: svgIcon('🌶️', '#fbeaea') },
  { name: 'Kycklingfilé, Kronfågel', url: '/produkt/Kycklingfile-Kronfagel-100263106_ST', price: '89,90', priceUnit: 'st', size: '900g', imageUrl: svgIcon('🍗', '#f6ece0') },
  { name: 'Nötfärs 12%, Sverige', url: '/produkt/Notfars-12procent-Sverige-101250981_ST', price: '69,90', priceUnit: 'st', size: '500g', imageUrl: svgIcon('🥩', '#fbeaea') },
  { name: 'Bacon Skivat, Scan', url: '/produkt/Bacon-Skivat-Scan-100223390_ST', price: '32,90', priceUnit: 'st', size: '140g', imageUrl: svgIcon('🥓', '#fbeaea') },
  { name: 'Falukorv, Scan', url: '/produkt/Falukorv-Scan-100223317_ST', price: '24,90', priceUnit: 'st', size: '800g', imageUrl: svgIcon('🌭', '#fbeaea') },

  // Pantry
  { name: 'Pasta Spaghetti, Barilla', url: '/produkt/Pasta-Spaghetti-Barilla-100151089_ST', price: '18,90', priceUnit: 'st', size: '500g', imageUrl: svgIcon('🍝', '#f3efe2') },
  { name: 'Ris Jasminris, Kung Markatta', url: '/produkt/Ris-Jasminris-Kung-Markatta-101108014_ST', price: '32,90', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🍚', '#f3efe2') },
  { name: 'Krossade Tomater, Bruna Bönor', url: '/produkt/Krossade-Tomater-Bruna-Bonor-100150920_ST', price: '11,90', priceUnit: 'st', size: '400g', imageUrl: svgIcon('🥫', '#fbeaea') },
  { name: 'Olivolja Extra Virgin, Zeta', url: '/produkt/Olivolja-Extra-Virgin-Zeta-100150844_ST', price: '69,90', priceUnit: 'st', size: '500ml', imageUrl: svgIcon('🫒', '#f3efe2') },
  { name: 'Kaffe Bryggmalet, Gevalia', url: '/produkt/Kaffe-Bryggmalet-Gevalia-100151005_ST', price: '59,90', priceUnit: 'st', size: '450g', imageUrl: svgIcon('☕', '#f6ece0') },
  { name: 'Diskmedel Original, Yes', url: '/produkt/Diskmedel-Original-Yes-100162530_ST', price: '29,90', priceUnit: 'st', size: '500ml', imageUrl: svgIcon('🧴', '#eaf3ee') },
  { name: 'Toalettpapper, Lambi', url: '/produkt/Toalettpapper-Lambi-100164511_ST', price: '54,90', priceUnit: 'st', size: '8-pack', imageUrl: svgIcon('🧻', '#f3efe2') },

  // Drinks & snacks
  { name: 'Läsk Cola, Coca-Cola', url: '/produkt/Lask-Cola-Coca-Cola-100153222_ST', price: '22,90', priceUnit: 'st', size: '1,5l', imageUrl: svgIcon('🥤', '#fbeaea') },
  { name: 'Chips Original, OLW', url: '/produkt/Chips-Original-OLW-100153590_ST', price: '26,90', priceUnit: 'st', size: '275g', imageUrl: svgIcon('🍟', '#fbf3d8') },
  { name: 'Chokladkaka Mjölkchoklad, Marabou', url: '/produkt/Chokladkaka-Mjolkchoklad-Marabou-100153733_ST', price: '32,90', priceUnit: 'st', size: '200g', imageUrl: svgIcon('🍫', '#f6ece0') },
];

// Demo mode: track confirmed matches by query (normalized lowercase) → URL.
// The real backend should return this from /search; see api.fake.js comment.
export const demoConfirmedByQuery = new Map([
  ['mjölk', '/produkt/Mjolk-Farsk-3procent-Arla-101233931_ST'],
  ['gurka', '/produkt/Gurka-Sverige-Klass-1-100046993_ST'],
  ['kebab', '/produkt/Kebab-Klassisk-Schysst-Kak-101275542_ST'],
  ['bröd', '/produkt/Bondbrod-Runt-Ostras-Brod-100255720_ST'],
  ['ägg', '/produkt/Agg-12-pack-Kronagg-100254906_ST'],
  ['smör', '/produkt/Smor-Normalsaltat-82procent-Svenskt-Smor-100109181_ST'],
  ['banan', '/produkt/Bananer-Fairtrade-100031183_KG'],
  ['kaffe', '/produkt/Kaffe-Bryggmalet-Gevalia-100151005_ST'],
  ['pasta', '/produkt/Pasta-Spaghetti-Barilla-100151089_ST'],
]);

export function seedListItems() {
  const now = Date.now();
  return [
    { id: 1, text: 'Kebab Klassisk, Schysst Käk (275g) — 48,73 kr', added_by: 'erik', added_at: new Date(now - 3600e3).toISOString(), done: 0, checked: 0, quantity: 1, product_url: '/produkt/Kebab-Klassisk-Schysst-Kak-101275542_ST' },
    { id: 2, text: 'Het Kebabsås (335ml) — 28,29 kr', added_by: 'erik', added_at: new Date(now - 3500e3).toISOString(), done: 0, checked: 0, quantity: 1, product_url: '/produkt/Het-Kebabsas-101275547_ST' },
    { id: 3, text: 'Bondbröd Runt (Östras Bröd 1kg) — 34,92 kr', added_by: 'anna', added_at: new Date(now - 3000e3).toISOString(), done: 0, checked: 0, quantity: 1, product_url: '/produkt/Bondbrod-Runt-Ostras-Brod-100255720_ST' },
    { id: 4, text: 'Smör Normalsaltat 82% (Svenskt Smör 250g) — 37,50 kr', added_by: 'anna', added_at: new Date(now - 2000e3).toISOString(), done: 0, checked: 0, quantity: 2, product_url: '/produkt/Smor-Normalsaltat-82procent-Svenskt-Smor-100109181_ST' },
    { id: 5, text: 'Äpple Royal Gala Klass 1 (~200g/st, priced /kg (weight varies)) — 26,90 kr/kg', added_by: 'erik', added_at: new Date(now - 1000e3).toISOString(), done: 0, checked: 0, quantity: 6, product_url: '/produkt/Apple-Royal-Gala-Klass-1-100047012_KG' },
    { id: 6, text: 'Diskmedel', added_by: 'erik', added_at: new Date(now - 500e3).toISOString(), done: 0, checked: 0, quantity: 1, product_url: null },
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
      items: cartItems(1, 'Pappa', [['/produkt/Mjolk-Farsk-3procent-Arla-101233931_ST'], ['/produkt/Agg-12-pack-Kronagg-100254906_ST'], ['/produkt/Smor-Normalsaltat-82procent-Svenskt-Smor-100109181_ST'], ['/produkt/Bondbrod-Runt-Ostras-Brod-100255720_ST'], ['/produkt/Bananer-Fairtrade-100031183_KG', 6], ['/produkt/Kaffe-Bryggmalet-Gevalia-100151005_ST']]),
    },
    {
      id: 2,
      name: null,
      kind: 'sent',
      created_by: 'Pappa',
      created_at: new Date(now - 7 * 86400e3).toISOString(),
      items: cartItems(101, 'Pappa', [['/produkt/Mjolk-Farsk-3procent-Arla-101233931_ST', 2], ['/produkt/Kycklingfile-Kronfagel-100263106_ST'], ['/produkt/Ris-Jasminris-Kung-Markatta-101108014_ST'], ['/produkt/Gurka-Sverige-Klass-1-100046993_ST'], ['/produkt/Tomater-Cocktail-Klass-1-101052417_ST'], ['/produkt/Yoghurt-Naturell-3procent-Skanemejerier-101198722_ST'], ['/produkt/Toalettpapper-Lambi-100164511_ST'], ['/produkt/Chokladkaka-Mjolkchoklad-Marabou-100153733_ST']]),
    },
    {
      id: 3,
      name: null,
      kind: 'sent',
      created_by: 'Leia',
      created_at: new Date(now - 14 * 86400e3).toISOString(),
      items: cartItems(201, 'Leia', [['/produkt/Pasta-Spaghetti-Barilla-100151089_ST', 2], ['/produkt/Krossade-Tomater-Bruna-Bonor-100150920_ST', 3], ['/produkt/Notfars-12procent-Sverige-101250981_ST'], ['/produkt/Riven-Ost-Prastost-26procent-Arla-101201473_ST'], ['/produkt/Lok-Gul-Sverige-100047105_KG'], ['/produkt/Olivolja-Extra-Virgin-Zeta-100150844_ST'], ['/produkt/Kanelbullar-Pagen-101131322_ST'], ['/produkt/Lask-Cola-Coca-Cola-100153222_ST']]),
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

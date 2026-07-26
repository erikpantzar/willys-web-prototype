'use strict';
// Seed data + tiny inline-SVG "product photos" for demo mode (see
// api.fake.js) — fully offline, no network image requests, so this works
// for design/interaction review even with no tailnet connection at all.

function svgIcon(emoji, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${bg}"/><text x="32" y="42" font-size="30" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const CATALOG = [
  { name: 'Mjölk Färsk 3%, Arla', url: '/p/mjolk-3', price: '26,90', priceUnit: 'st', size: '3l', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Mjölk Färsk 1,5%, Arla', url: '/p/mjolk-15', price: '12,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🥛', '#eaf3ee') },
  { name: 'Havredryck, Oatly', url: '/p/oatly', price: '24,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🌾', '#f3efe2') },
  { name: 'Äpple Royal Gala Klass 1', url: '/p/apple', price: '26,90', priceUnit: 'kg', size: '~200g/st, priced /kg (weight varies)', imageUrl: svgIcon('🍎', '#fbeaea') },
  { name: 'Gurka Sverige Klass 1', url: '/p/gurka', price: '14,90', priceUnit: 'st', size: '1st', imageUrl: svgIcon('🥒', '#eaf3ee') },
  { name: 'Kebab Klassisk, Schysst Käk', url: '/p/kebab', price: '48,73', priceUnit: 'st', size: '275g', imageUrl: svgIcon('🥙', '#f6ece0') },
  { name: 'Het Kebabsås', url: '/p/kebabsas', price: '28,29', priceUnit: 'st', size: '335ml', imageUrl: svgIcon('🌶️', '#fbeaea') },
  { name: 'Bondbröd Runt, Östras Bröd', url: '/p/brod', price: '34,92', priceUnit: 'st', size: '1kg', imageUrl: svgIcon('🍞', '#f6ece0') },
  { name: 'Smör Normalsaltat 82%, Svenskt Smör', url: '/p/smor', price: '37,50', priceUnit: 'st', size: '250g', imageUrl: svgIcon('🧈', '#fbf3d8') },
  { name: 'Filmjölk 3%, Arla', url: '/p/filmjolk', price: '15,90', priceUnit: 'st', size: '1l', imageUrl: svgIcon('🥣', '#eaf3ee') },
  { name: 'Ägg, 12-pack, Kronägg', url: '/p/agg', price: '42,90', priceUnit: 'st', size: '12st', imageUrl: svgIcon('🥚', '#f6ece0') },
  { name: 'Bananer Fairtrade', url: '/p/banan', price: '19,90', priceUnit: 'kg', size: '~140g/st, priced /kg (weight varies)', imageUrl: svgIcon('🍌', '#fbf3d8') },
];

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

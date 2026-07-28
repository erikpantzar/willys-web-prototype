'use strict';
// Builds a downloadable .ics (iCalendar) event for a chosen delivery slot,
// so confirming a delivery time can also drop a calendar reminder — no
// native calendar API needed, a data: URI with a .ics filename is enough
// for both iOS/Android/desktop to offer "add to calendar".

function toIcsUtc(epochMs) {
  return new Date(epochMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// slot.formattedTime looks like "Torsdag 30 juli 14:00-16:00" — slot.startTime
// is the exact epoch ms of the window's start. The end time isn't given as
// its own epoch, so the HH:MM-HH:MM in the string is used purely to compute
// a duration (in minutes) added to startTime, sidestepping any timezone
// parsing of the human-readable string itself.
function slotEndTime(slot) {
  const m = slot.formattedTime.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!m) return slot.startTime + 2 * 60 * 60 * 1000; // fallback: assume a 2h window
  const [, sh, sm, eh, em] = m.map(Number);
  let durationMin = eh * 60 + em - (sh * 60 + sm);
  if (durationMin <= 0) durationMin += 24 * 60; // guards a window crossing midnight
  return slot.startTime + durationMin * 60 * 1000;
}

export function buildDeliveryIcsDataUrl(slot) {
  const start = toIcsUtc(slot.startTime);
  const end = toIcsUtc(slotEndTime(slot));
  const stamp = toIcsUtc(Date.now());
  const uid = `willys-delivery-${slot.startTime}@willys-list`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Willys List//Delivery//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'SUMMARY:Willys grocery delivery',
    'DESCRIPTION:Willys grocery delivery window — be home to receive it!',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

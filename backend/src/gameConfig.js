// Prize catalogue and room-setting defaults / bounds.

// Each prize: id, label, short hint, and whether the host may award it
// multiple times. Every prize supports a configurable winner count
// (e.g. 1st / 2nd / 3rd Jaldi 5, two Top Lines, three Full Houses).
export const PRIZE_CATALOG = [
  { id: 'earlyFive', label: 'Early Five (Jaldi 5)', hint: 'First to mark any 5 numbers', multi: true, defaultQty: 1 },
  { id: 'topLine', label: 'Top Line', hint: 'All numbers in the first row', multi: true, defaultQty: 1 },
  { id: 'middleLine', label: 'Middle Line', hint: 'All numbers in the middle row', multi: true, defaultQty: 1 },
  { id: 'bottomLine', label: 'Bottom Line', hint: 'All numbers in the last row', multi: true, defaultQty: 1 },
  { id: 'fullHouse', label: 'Full House', hint: 'Every number on the ticket', multi: true, defaultQty: 1 },
];

export const PRIZE_BY_ID = Object.fromEntries(PRIZE_CATALOG.map((p) => [p.id, p]));

export const LIMITS = {
  ticketCount: { min: 6, max: 600, default: 24 },
  maxTicketsPerPlayer: { min: 1, max: 6, default: 1 },
  autoIntervalMs: { min: 2000, max: 15000, default: 5000 },
  prizeQty: { min: 1, max: 10 },
  passwordMax: 32,
};

// The default prize set used if the host doesn't customise anything.
export function defaultPrizes() {
  return [
    { id: 'earlyFive', qty: 1 },
    { id: 'topLine', qty: 1 },
    { id: 'middleLine', qty: 1 },
    { id: 'bottomLine', qty: 1 },
    { id: 'fullHouse', qty: 1 },
  ];
}

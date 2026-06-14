// Tambola / Housie ticket generation and pattern helpers.
//
// A ticket is a 3 x 9 grid:
//   - exactly 5 numbers per row (4 blanks), 15 numbers total
//   - each column holds 1-3 numbers from its decade range, sorted top->bottom
//   - column j ranges: 1-9, 10-19, ... 70-79, 80-90
//
// `null` marks a blank cell.

export const COLUMN_RANGES = [
  [1, 9],
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 49],
  [50, 59],
  [60, 69],
  [70, 79],
  [80, 90],
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// How many numbers each of the 9 columns gets: each 1-3, summing to 15.
function columnCounts() {
  const counts = new Array(9).fill(1); // 9 used, every column has at least one
  let remaining = 6; // distribute the rest, max +2 per column (cap at 3)
  const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  while (remaining > 0) {
    for (const c of order) {
      if (remaining === 0) break;
      if (counts[c] < 3) {
        counts[c]++;
        remaining--;
      }
    }
  }
  return counts;
}

// Build a 3x9 boolean mask where column j has counts[j] filled cells and
// every row has exactly 5 filled cells. Greedy "fill the rows that still
// need the most" keeps the construction balanced and feasible.
function buildMask(counts) {
  const mask = [
    new Array(9).fill(false),
    new Array(9).fill(false),
    new Array(9).fill(false),
  ];
  const rowRemaining = [5, 5, 5];
  // Process the biggest columns first so the scarce rows are claimed early.
  const cols = counts
    .map((c, j) => ({ c, j }))
    .sort((a, b) => b.c - a.c);

  for (const { c, j } of cols) {
    const rows = [0, 1, 2]
      .map((r) => ({ r, rem: rowRemaining[r], rnd: Math.random() }))
      .sort((a, b) => b.rem - a.rem || a.rnd - b.rnd)
      .slice(0, c);
    for (const { r } of rows) {
      mask[r][j] = true;
      rowRemaining[r] -= 1;
    }
  }
  const ok = rowRemaining.every((r) => r === 0);
  return { mask, ok };
}

// Generate one valid ticket (3x9 grid of numbers / null).
export function generateTicket() {
  for (let attempt = 0; attempt < 500; attempt++) {
    const counts = columnCounts();
    const { mask, ok } = buildMask(counts);
    if (!ok) continue;

    const grid = [
      new Array(9).fill(null),
      new Array(9).fill(null),
      new Array(9).fill(null),
    ];

    for (let j = 0; j < 9; j++) {
      const [lo, hi] = COLUMN_RANGES[j];
      const pool = [];
      for (let n = lo; n <= hi; n++) pool.push(n);
      shuffle(pool);
      const chosen = pool.slice(0, counts[j]).sort((a, b) => a - b);
      let k = 0;
      for (let r = 0; r < 3; r++) {
        if (mask[r][j]) grid[r][j] = chosen[k++];
      }
    }
    return grid;
  }
  throw new Error('Failed to generate a valid ticket');
}

// A compact signature of a ticket's number layout, used to guarantee that no
// two tickets in a room are exactly the same.
export function ticketSignature(grid) {
  return grid.map((row) => row.map((c) => c ?? '_').join(',')).join('|');
}

// Generate `count` UNIQUE tickets, indexed 1..count (index 0 unused).
export function generateTicketPool(count) {
  const pool = { _count: count };
  const seen = new Set();
  for (let n = 1; n <= count; n++) {
    let grid;
    let tries = 0;
    do {
      grid = generateTicket();
      tries += 1;
    } while (seen.has(ticketSignature(grid)) && tries < 50);
    seen.add(ticketSignature(grid));
    pool[n] = grid;
  }
  return pool;
}

// --- pattern helpers used by claim validation ---

export function ticketNumbers(grid) {
  const out = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell != null) out.push(cell);
    }
  }
  return out;
}

export function rowNumbers(grid, r) {
  return grid[r].filter((cell) => cell != null);
}

// The four "corner" numbers: outermost filled cells of the top and bottom rows.
export function cornerNumbers(grid) {
  const corners = [];
  for (const r of [0, 2]) {
    const filled = grid[r]
      .map((cell, c) => ({ cell, c }))
      .filter((x) => x.cell != null)
      .sort((a, b) => a.c - b.c);
    if (filled.length > 0) {
      corners.push(filled[0].cell);
      corners.push(filled[filled.length - 1].cell);
    }
  }
  return [...new Set(corners)];
}

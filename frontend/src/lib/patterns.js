// Client-side mirror of the server's claim rules. Used only to give instant
// feedback (which prizes look claimable, which ticket to submit). The server
// remains the source of truth for every awarded prize.

export function ticketNumbers(grid) {
  const out = [];
  for (const row of grid) for (const cell of row) if (cell != null) out.push(cell);
  return out;
}
export function rowNumbers(grid, r) {
  return grid[r].filter((c) => c != null);
}
export function cornerNumbers(grid) {
  const corners = [];
  for (const r of [0, 2]) {
    const filled = grid[r].map((cell, c) => ({ cell, c })).filter((x) => x.cell != null).sort((a, b) => a.c - b.c);
    if (filled.length) {
      corners.push(filled[0].cell, filled[filled.length - 1].cell);
    }
  }
  return [...new Set(corners)];
}

export function isComplete(prizeId, grid, calledSet) {
  switch (prizeId) {
    case 'earlyFive':
      return ticketNumbers(grid).filter((n) => calledSet.has(n)).length >= 5;
    case 'topLine':
      return rowNumbers(grid, 0).every((n) => calledSet.has(n));
    case 'middleLine':
      return rowNumbers(grid, 1).every((n) => calledSet.has(n));
    case 'bottomLine':
      return rowNumbers(grid, 2).every((n) => calledSet.has(n));
    case 'fourCorners': {
      const c = cornerNumbers(grid);
      return c.length > 0 && c.every((n) => calledSet.has(n));
    }
    case 'fullHouse':
      return ticketNumbers(grid).every((n) => calledSet.has(n));
    default:
      return false;
  }
}

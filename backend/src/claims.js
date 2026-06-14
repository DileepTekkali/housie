// Server-side claim validation. A claim is valid only if every number the
// pattern requires has actually been called — the player's own strikes are
// purely cosmetic and never trusted.
import {
  ticketNumbers,
  rowNumbers,
  cornerNumbers,
} from './ticket.js';

// Returns true if the given prize pattern is fully satisfied on `grid`,
// given the Set of numbers that have been called so far.
export function isPatternComplete(prizeId, grid, calledSet) {
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
      const corners = cornerNumbers(grid);
      return corners.length > 0 && corners.every((n) => calledSet.has(n));
    }
    case 'fullHouse':
      return ticketNumbers(grid).every((n) => calledSet.has(n));
    default:
      return false;
  }
}

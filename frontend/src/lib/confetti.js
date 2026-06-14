import confetti from 'canvas-confetti';

export function celebrate() {
  const colors = ['#fde68a', '#fbbf24', '#a78bfa', '#f472b6', '#34d399'];
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors }), 150);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors }), 250);
}

export function bigCelebrate() {
  const end = Date.now() + 1200;
  const colors = ['#fde68a', '#fbbf24', '#a78bfa', '#f472b6'];
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

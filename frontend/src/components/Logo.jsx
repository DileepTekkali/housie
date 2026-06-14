import { motion } from 'framer-motion';

export default function Logo({ size = 'md', animate = false }) {
  const dims = size === 'lg' ? 'h-16 w-16 text-3xl' : size === 'sm' ? 'h-9 w-9 text-lg' : 'h-12 w-12 text-2xl';
  const title = size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'sm' ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl';

  const Ball = animate ? motion.div : 'div';
  const ballProps = animate
    ? {
        initial: { rotate: -25, scale: 0.6, opacity: 0 },
        animate: { rotate: 0, scale: 1, opacity: 1 },
        transition: { type: 'spring', stiffness: 200, damping: 12, delay: 0.05 },
      }
    : {};

  return (
    <div className="flex items-center gap-2.5">
      <Ball className={`ball flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-ink ${dims}`} {...ballProps}>
        90
      </Ball>
      <div className="leading-none">
        <span className={`block font-display font-extrabold tracking-tight ${title}`}>
          Tekkali’s<span className="text-gold-400"> Tambola</span>
        </span>
        {size !== 'sm' && <span className="text-xs font-medium uppercase tracking-[0.25em] text-white/50">Live · Online Housie</span>}
      </div>
    </div>
  );
}

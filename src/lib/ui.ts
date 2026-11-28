const base =
  'inline-flex min-h-11 items-center justify-center gap-2 border-2 px-5 py-2.5 font-mono text-sm uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'border-ink bg-ink text-paper hover:bg-brand-red hover:border-brand-red',
  danger: 'border-ink bg-brand-red text-paper hover:bg-ink',
  outline: 'border-stroke bg-row text-ink hover:border-ink hover:bg-card',
} as const;

export function btn(variant: keyof typeof variants = 'primary', extra = '') {
  return `${base} ${variants[variant]} ${extra}`.trim();
}
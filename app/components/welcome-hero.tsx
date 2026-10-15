import type { ReactNode } from 'react';

export type WelcomeHeroProps = {
  title?: string;
  description?: string;
  presenceText?: string;
  isPending?: boolean;
  isOnline?: boolean;
  date?: Date;
  rightSlot?: ReactNode;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function WelcomeHero({
  title = 'Cool, Calm, and Grounded',
  description = 'A clear place for the things you are carrying together.',
  presenceText,
  isPending = false,
  isOnline,
  date = new Date(),
  rightSlot,
}: WelcomeHeroProps) {
  return (
    <section
      className="flex animate-[rise-in_700ms_ease-out_both] flex-col justify-between gap-6 md:flex-row md:items-end md:gap-8"
      aria-labelledby="hero-heading"
    >
      <div>
        <p className="m-0 mb-2 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
          {dateFormatter.format(date)}
        </p>
        <h1
          id="hero-heading"
          suppressHydrationWarning
          className="m-0 max-w-[680px] font-display text-2xl leading-tight font-normal tracking-tight text-ink sm:text-3xl md:text-4xl lg:text-5xl"
        >
          {title}
        </h1>
        <p className="mt-2.5 mb-0 max-w-[440px] text-sm leading-relaxed text-muted sm:text-base">
          {description}
        </p>
      </div>

      {rightSlot ? (
        rightSlot
      ) : presenceText ? (
        <div
          className={`flex items-center gap-2.5 self-start pb-1 text-xs whitespace-nowrap transition-colors md:self-end ${
            isPending
              ? 'text-clay'
              : isOnline === false
                ? 'text-muted'
                : 'text-sage-dark'
          }`}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full transition-all ${
              isPending
                ? 'bg-clay shadow-[0_0_0_4px_var(--clay-soft)]'
                : isOnline === false
                  ? 'bg-stone shadow-[0_0_0_4px_#ebeae5]'
                  : 'animate-pulse bg-sage shadow-[0_0_0_4px_#dce8dd]'
            }`}
            aria-hidden="true"
          />
          <span>{presenceText}</span>
        </div>
      ) : null}
    </section>
  );
}

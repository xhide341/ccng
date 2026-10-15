'use client';

type DailyQuotesProps = {
  mantra: string;
  source: string;
  date?: Date;
  className?: string;
};

export function DailyQuotes({
  mantra,
  source,
  date = new Date(),
  className = '',
}: DailyQuotesProps) {
  return (
    <section
      className={`flex min-h-[150px] flex-col justify-between rounded-md border border-line bg-paper p-5 shadow-xs transition-all sm:min-h-[160px] sm:p-6 sm:pb-6.5 ${className}`}
      aria-labelledby="mantra-heading"
    >
      <div className="mb-0 flex h-6 items-center justify-between border-b border-line pb-2 sm:mb-3 md:mb-2">
        <p
          className="m-0 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase"
          id="mantra-heading"
        >
          Daily Quote
        </p>
        <span
          suppressHydrationWarning
          className="text-[11px] font-medium tracking-wide text-muted"
        >
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center pt-1 pb-1 sm:pt-2 sm:pb-2">
        <div className="flex items-start gap-1 md:gap-2 lg:gap-3">
          <div
            className="hidden font-display text-4xl leading-[0.8] text-[#c9d8cb] select-none sm:text-5xl lg:block"
            aria-hidden="true"
          >
            “
          </div>
          <div className="min-w-0 flex-1">
            <blockquote className="break-word m-0 font-display text-base leading-snug font-normal text-ink sm:text-lg md:text-base">
              {mantra}
            </blockquote>
            <cite className="mt-1.5 block text-xs text-muted not-italic">
              — {source}
            </cite>
          </div>
        </div>
      </div>
    </section>
  );
}

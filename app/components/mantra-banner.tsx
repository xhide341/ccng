'use client';

type MantraBannerProps = {
  mantra: string;
  source: string;
  date?: Date;
};

export function MantraBanner({
  mantra,
  source,
  date = new Date(),
}: MantraBannerProps) {
  return (
    <section
      className="relative my-8 grid grid-cols-[38px_minmax(0,1fr)] items-center gap-3.5 rounded-md border border-line bg-paper p-5 shadow-xs sm:p-7 md:my-14 md:grid-cols-[58px_minmax(0,1fr)_auto] md:gap-5 md:px-8"
      aria-labelledby="mantra-heading"
    >
      <div
        className="font-display text-5xl leading-[0.8] text-[#c9d8cb] select-none md:text-7xl"
        aria-hidden="true"
      >
        “
      </div>
      <div>
        <p
          className="m-0 mb-1.5 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase"
          id="mantra-heading"
        >
          Today&apos;s mantra
        </p>
        <blockquote className="m-0 font-display text-lg leading-snug font-normal text-ink sm:text-xl md:text-2xl">
          {mantra}
        </blockquote>
        <cite className="mt-1 block text-xs text-muted not-italic">
          {source}
        </cite>
      </div>
      <span
        suppressHydrationWarning
        className="hidden self-start text-xs font-medium tracking-wide text-sage-dark md:inline-block"
      >
        {date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
        })}
      </span>
    </section>
  );
}

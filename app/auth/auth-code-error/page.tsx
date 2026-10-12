import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen bg-linen text-ink">
      <header className="w-full h-14 px-5 md:px-12 flex items-center justify-between border-b border-line bg-linen text-ink">
        <Link
          className="flex items-center gap-2 text-ink text-base sm:text-lg font-bold tracking-tight no-underline"
          href="/"
          aria-label="CCnG home"
        >
          <span
            className="grid place-items-center w-6 h-6 rounded-full border border-sage-dark text-sage-dark font-display italic text-base leading-none"
            aria-hidden="true"
          >
            c
          </span>
          <span>ccng</span>
        </Link>
      </header>

      <div className="w-full max-w-[560px] mx-auto px-5 py-12 md:py-16">
        <section className="flex flex-col p-7 sm:p-8 rounded-md border border-line bg-paper shadow-xs">
          <p className="m-0 mb-1.5 text-sage-dark text-[10px] font-bold uppercase tracking-widest leading-tight">
            Authentication Notice
          </p>
          <h2 className="m-0 mb-3.5 text-ink font-display text-2xl font-normal">
            Unable to sign in
          </h2>
          <p className="m-0 mb-6 text-muted text-sm leading-relaxed">
            We could not complete your sign-in request. This may happen if the login link expired, the authentication code was already used, or Google credentials are not yet enabled in the Supabase Dashboard.
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center py-2.5 px-4 rounded border border-sage-dark bg-sage-dark text-white text-xs font-semibold tracking-wide hover:bg-[#395241] transition-colors no-underline"
            >
              Return to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

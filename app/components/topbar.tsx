'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOutUser } from '../lib/auth';

type TopbarProps = {
  spaceLabel?: string;
  userEmail?: string;
  isDemo?: boolean;
  activeCode?: string;
  isGuest?: boolean;
  onGoogleSignIn?: () => void;
  onDemoSignIn?: () => void;
  authLoading?: boolean;
  authError?: string | null;
  homeLink?: string;
};

export function Topbar({
  spaceLabel,
  userEmail,
  isDemo = false,
  activeCode,
  isGuest = false,
  onGoogleSignIn,
  onDemoSignIn,
  authLoading = false,
  authError,
  homeLink = '/space',
}: TopbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = isGuest
    ? null
    : userEmail
      ? userEmail.slice(0, 2).toUpperCase()
      : 'MJ';

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-line bg-linen px-5 text-ink md:px-12">
      <Link
        className="flex items-center gap-2 text-base font-bold tracking-tight text-ink no-underline sm:text-lg"
        href={homeLink}
        aria-label="CCnG home"
      >
        <span
          className="grid h-6 w-6 place-items-center rounded-full border border-sage-dark font-display text-base leading-none text-sage-dark italic"
          aria-hidden="true"
        >
          c
        </span>
        <span>ccng</span>
      </Link>

      <div className="flex items-center gap-4">
        {spaceLabel && (
          <span className="hidden text-xs text-muted md:inline">
            {spaceLabel}
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-[10px] font-bold tracking-wider text-sage-dark transition-all hover:-translate-y-0.5 hover:border-sage"
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={
              isGuest ? 'Account and login menu' : 'User profile and menu'
            }
            aria-expanded={isMenuOpen}
          >
            {isGuest ? (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              initials
            )}
          </button>

          {isMenuOpen && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 z-50 w-[min(320px,calc(100vw-32px))] animate-[rise-in_200ms_ease-out_both] rounded-md border border-line bg-paper p-5 shadow-xl"
              role="menu"
            >
              {isGuest ? (
                <>
                  <div className="mb-4">
                    <span className="mb-2 inline-block rounded-full border border-sage px-2 py-0.5 text-[9px] font-bold tracking-wider text-sage-dark uppercase">
                      Private Space
                    </span>
                    <h3 className="m-0 mb-1.5 font-display text-lg leading-tight font-normal text-ink">
                      Enter your Space
                    </h3>
                    <p className="m-0 text-xs leading-relaxed text-muted">
                      Sign in with Google to access your shared daily space.
                    </p>
                  </div>

                  {authError && (
                    <div
                      className="mb-3.5 rounded border border-clay bg-clay-soft p-2 text-xs text-ink"
                      role="alert"
                    >
                      <p className="m-0">{authError}</p>
                    </div>
                  )}

                  <div className="grid gap-2.5">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2.5 rounded border border-line bg-white px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] shadow-xs transition-all hover:-translate-y-0.5 hover:bg-[#fbfbfb] hover:shadow-sm disabled:opacity-65"
                      onClick={onGoogleSignIn}
                      disabled={authLoading}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                      >
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        {authLoading ? 'Connecting...' : 'Sign in with Google'}
                      </span>
                    </button>

                    <div className="relative my-0.5 text-center before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-line before:content-['']">
                      <span className="relative bg-paper px-2 text-[10px] font-bold tracking-wider text-muted uppercase">
                        or
                      </span>
                    </div>

                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded border border-line bg-paper-soft px-3.5 py-2.5 text-xs font-semibold text-ink transition-all hover:border-sage hover:bg-paper"
                      onClick={onDemoSignIn}
                    >
                      <span>Try Demo Mode</span>
                      <span className="rounded bg-sage px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                        Instant
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <span className="mb-2 inline-block rounded-full border border-sage px-2 py-0.5 text-[9px] font-bold tracking-wider text-sage-dark uppercase">
                      Active Session
                    </span>
                    <h3 className="m-0 mb-1 font-display text-lg leading-tight font-normal break-all text-ink">
                      {userEmail || 'Demo Guest (Mara)'}
                    </h3>
                    <p className="m-0 text-xs leading-relaxed text-muted">
                      {isDemo
                        ? 'Browsing in Demo Mode'
                        : 'Connected via Google Account'}
                    </p>
                    {activeCode && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-paper-soft px-2 py-1 text-xs text-sage-dark">
                        <span>Space Code:</span>{' '}
                        <strong className="font-mono font-bold tracking-wider text-ink">
                          {activeCode}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-line pt-2">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded border-0 bg-transparent p-2 text-left text-xs font-bold text-clay transition-colors hover:bg-clay-soft"
                      onClick={() => signOutUser()}
                    >
                      <span aria-hidden="true">←</span>
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

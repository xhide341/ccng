'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOutUser, exitDemoSession } from '../lib/auth';
import { leaveSpaceAction } from '../lib/actions/pairing';

export type HeaderProps = {
  spaceLabel?: string;
  userEmail?: string;
  userName?: string;
  userFullName?: string;
  userAvatarUrl?: string;
  isDemo?: boolean;
  activeCode?: string;
  isGuest?: boolean;
  canLeaveSpace?: boolean;
  onGoogleSignIn?: () => void;
  authLoading?: boolean;
  authError?: string | null;
  homeLink?: string;
};

export function Header({
  spaceLabel,
  userEmail,
  userName,
  userFullName,
  userAvatarUrl,
  isDemo = false,
  activeCode,
  isGuest = false,
  canLeaveSpace = false,
  onGoogleSignIn,
  authLoading = false,
  authError,
  homeLink = '/space',
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
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
    : userFullName
      ? userFullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : userName
        ? userName.slice(0, 2).toUpperCase()
        : userEmail
          ? userEmail.slice(0, 2).toUpperCase()
          : isDemo
            ? 'MJ'
            : 'U';

  async function handleConfirmLeave() {
    setIsLeaving(true);
    setLeaveError(null);
    try {
      if (isDemo) {
        exitDemoSession();
        return;
      }
      const res = await leaveSpaceAction();
      if (!res.success) {
        setLeaveError(res.error || 'Failed to leave space.');
        setIsLeaving(false);
        return;
      }
      window.location.href = '/space';
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to leave space.';
      setLeaveError(message);
      setIsLeaving(false);
    }
  }

  return (
    <>
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
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-sage bg-paper text-[10px] font-bold tracking-wider text-sage-dark transition-all"
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
              ) : userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatarUrl}
                  alt={userFullName || userName || 'User'}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </button>

            {isMenuOpen && (
              <div
                className={`absolute top-[calc(100%+8px)] right-0 z-50 ${
                  isGuest
                    ? 'w-[min(280px,calc(100vw-32px))] p-4'
                    : 'w-[min(220px,calc(100vw-32px))] p-3'
                } animate-[rise-in_200ms_ease-out_both] rounded-md border border-line bg-paper shadow-xl`}
                role="menu"
              >
                {isGuest ? (
                  <>
                    <div className="mb-4">
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
                        className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded border border-line bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] shadow-xs transition-all hover:bg-white disabled:opacity-65"
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
                          {authLoading
                            ? 'Connecting...'
                            : 'Sign in with Google'}
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2">
                      <div className="flex items-center gap-2.5">
                        {userAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={userAvatarUrl}
                            alt={userFullName || userName || 'User'}
                            className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
                          />
                        ) : (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-paper-soft text-[11px] font-bold text-sage-dark">
                            {initials}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          {/* Name on top */}
                          <p className="m-0 truncate text-sm leading-tight font-medium text-ink">
                            {userFullName ||
                              userName ||
                              (userEmail
                                ? userEmail.split('@')[0]
                                : isDemo
                                  ? 'Mara Jensen'
                                  : 'User')}
                          </p>

                          {/* Email below */}
                          {userEmail && (
                            <p
                              className="m-0 mt-0.5 truncate text-xs text-muted"
                              title={userEmail}
                            >
                              {userEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Space code if active or solo */}
                      {activeCode && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-paper-soft px-2 py-1 text-xs text-sage-dark">
                          <span>Space Code:</span>{' '}
                          <strong className="font-mono font-bold tracking-wider text-ink">
                            {activeCode}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Reduced vertical padding separator */}
                    <div className="my-1.5 border-t border-line" />

                    {/* Actions */}
                    <div className="flex flex-col gap-0.5">
                      {canLeaveSpace && (
                        <button
                          type="button"
                          className="flex w-full items-center rounded border-0 bg-transparent px-2.5 py-1.5 text-left text-xs font-normal text-ink transition-colors hover:bg-paper-soft hover:text-ink"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowLeaveModal(true);
                          }}
                        >
                          Leave space
                        </button>
                      )}

                      <button
                        type="button"
                        className="flex w-full items-center rounded border-0 bg-transparent px-2.5 py-1.5 text-left text-xs font-normal text-ink transition-colors hover:bg-paper-soft hover:text-ink"
                        onClick={() => signOutUser()}
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Modal for Leaving Space */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex animate-[fade-in_150ms_ease-out] items-center justify-center bg-ink/30 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-space-modal-title"
        >
          <div className="w-full max-w-sm animate-[rise-in_200ms_ease-out] rounded-lg border border-line bg-paper p-6 shadow-xl">
            <h3
              id="leave-space-modal-title"
              className="m-0 font-display text-xl font-normal text-ink"
            >
              Leave this shared Space?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {isDemo
                ? 'You will exit the demo session and return to the landing page.'
                : 'You will be disconnected from this Space and your partner. You can create a fresh Space or join another at any time.'}
            </p>

            {leaveError && (
              <div className="mt-3 rounded border border-clay bg-clay-soft p-2 text-xs text-clay">
                {leaveError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveError(null);
                }}
                disabled={isLeaving}
                className="rounded border border-line bg-transparent px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={isLeaving}
                className="rounded bg-clay px-3.5 py-1.5 text-xs font-normal text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLeaving ? 'Leaving...' : 'Confirm & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

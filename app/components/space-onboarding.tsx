'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSpaceAction,
  redeemPairingCodeAction,
} from '../lib/actions/pairing';
import { Header } from './header';

type SpaceOnboardingProps = {
  userEmail?: string;
  userName?: string;
  userFullName?: string;
  userAvatarUrl?: string;
  initialCode?: string;
};

export function SpaceOnboarding({
  userEmail,
  userName,
  userFullName,
  userAvatarUrl,
  initialCode = '',
}: SpaceOnboardingProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 6));
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateSpace() {
    setIsCreating(true);
    setError(null);
    try {
      const res = await createSpaceAction();
      if (!res.success) {
        setError(res.error || 'Could not create your Space. Please try again.');
        setIsCreating(false);
        return;
      }
      router.push(`/space?code=${res.code}`);
      router.refresh();
    } catch (err: unknown) {
      console.error('Error creating space:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Could not create your Space. Please try again.';
      setError(message);
      setIsCreating(false);
    }
  }

  async function handleJoinSpace(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 6) return;

    setIsJoining(true);
    setError(null);
    try {
      const res = await redeemPairingCodeAction(cleanCode);
      if (!res.success) {
        setError(res.error || 'This pairing code is invalid or has expired.');
        setIsJoining(false);
        return;
      }
      router.push('/space');
      router.refresh();
    } catch (err: unknown) {
      console.error('Error redeeming pairing code:', err);
      const message =
        err instanceof Error && err.message.includes('User already belongs')
          ? 'You already belong to a Space.'
          : 'This pairing code is invalid or has expired. Please verify with your partner.';
      setError(message);
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen bg-linen text-ink">
      <Header
        spaceLabel="Welcome"
        userEmail={userEmail}
        userName={userName}
        userFullName={userFullName}
        userAvatarUrl={userAvatarUrl}
        isGuest={false}
        homeLink="/space"
      />

      <div className="mx-auto w-full max-w-[900px] animate-[rise-in_600ms_ease-out_both] px-5 py-12 md:px-12 md:py-16">
        <div className="mb-9">
          <h1 className="m-0 mb-3.5 font-display text-4xl leading-tight font-normal tracking-tight text-ink sm:text-5xl md:text-6xl">
            Welcome to your Space
          </h1>
          <p className="m-0 max-w-[580px] text-base leading-relaxed text-muted">
            CCnG is a calm, shared place for two people to carry everyday life
            together. Start a fresh private Space or link to your partner&apos;s
            with a pairing code.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Start a new Space */}
          <section
            className="flex flex-col justify-between gap-7 rounded-md border border-line bg-paper p-7 shadow-xs transition-all hover:border-sage hover:shadow-md sm:p-8"
            aria-labelledby="create-space-heading"
          >
            <div>
              <span className="mb-2 inline-block px-0 py-0.5 text-[0.660rem] font-bold tracking-wider text-sage-dark uppercase">
                Option 1
              </span>
              <h2
                id="create-space-heading"
                className="m-0 mb-2.5 font-display text-2xl font-medium tracking-tight text-ink"
              >
                Start a new Space
              </h2>
              <p className="m-0 text-sm leading-relaxed text-muted">
                Create a quiet, private Space for you and your partner.
                You&apos;ll immediately receive a 6-character code to invite
                them.
              </p>
            </div>
            <div className="mt-auto">
              <button
                type="button"
                className="flex w-full items-center justify-center rounded border border-sage-dark bg-sage-dark px-5 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:-translate-y-0.5 hover:bg-[#395241] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCreateSpace}
                disabled={isCreating || isJoining}
                aria-label={isCreating ? 'Creating Space' : 'Create a Space'}
              >
                {isCreating ? (
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  'Create a Space'
                )}
              </button>
              {error && (
                <div
                  className="mt-4 flex items-center gap-1 rounded-md p-0 text-xs text-red-400"
                  role="alert"
                >
                  <svg
                    viewBox="0 0 20 20"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="shrink-0 text-clay"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Enter a Pairing Code */}
          <section
            className="flex flex-col justify-between gap-7 rounded-md border border-line bg-paper p-7 shadow-xs transition-all hover:border-sage hover:shadow-md sm:p-8"
            aria-labelledby="join-space-heading"
          >
            <div>
              <span className="mb-2 inline-block px-0 py-0.5 text-[0.660rem] font-bold tracking-wider text-sage-dark uppercase">
                Option 2
              </span>
              <h2
                id="join-space-heading"
                className="m-0 mb-2.5 font-display text-2xl font-medium tracking-tight text-ink"
              >
                Enter a Pairing Code
              </h2>
              <p className="m-0 text-sm leading-relaxed text-muted">
                Received a 6-character code from your partner? Enter it here to
                link your daily Space together.
              </p>
            </div>
            <form onSubmit={handleJoinSpace} className="mt-auto">
              <div className="mb-3">
                <input
                  type="text"
                  id="pairing-code"
                  className="w-full rounded border border-line bg-paper-soft px-3.5 py-2.5 font-mono text-base font-bold tracking-widest text-ink uppercase transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-stone focus:border-sage focus:bg-white focus:outline-none"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, '')
                        .slice(0, 6)
                    )
                  }
                  placeholder="e.g. K8M2P9"
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  disabled={isCreating || isJoining}
                  aria-label="6-character pairing code"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded border border-line bg-paper px-5 py-3 text-sm font-semibold tracking-wide text-ink transition-all hover:-translate-y-0.5 hover:border-sage hover:bg-paper-soft active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreating || isJoining || code.trim().length < 6}
                aria-label={isJoining ? 'Joining Space' : 'Join Space'}
              >
                {isJoining ? (
                  <svg
                    className="h-5 w-5 animate-spin text-ink"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  'Join Space'
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

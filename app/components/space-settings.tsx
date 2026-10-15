'use client';

import { useState } from 'react';
import { saveDiscordWebhookAction } from '../lib/actions/discord';
import { ConfirmDialog } from './confirm-dialog';

export type SpaceSettingsProps = {
  spaceId?: string;
  userName?: string;
  userAvatarUrl?: string;
  partnerName?: string;
  partnerAvatarUrl?: string;
  pairingCode?: string;
  isSolo?: boolean;
  hasGoogleCalendar?: boolean;
  initialDiscordWebhookUrl?: string | null;
  isDemo?: boolean;
  className?: string;
};

function maskWebhookUrl(url: string): string {
  try {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1] || '';
    const tokenTail = lastPart.slice(-4);
    return `https://discord.com/api/webhooks/••••••••${tokenTail}`;
  } catch {
    return 'https://discord.com/api/webhooks/••••••••';
  }
}

export function SpaceSettings({
  spaceId,
  userName = 'You',
  userAvatarUrl,
  partnerName,
  partnerAvatarUrl,
  pairingCode,
  isSolo = false,
  hasGoogleCalendar = false,
  initialDiscordWebhookUrl = null,
  isDemo = false,
  className = '',
}: SpaceSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(
    initialDiscordWebhookUrl ||
      (isDemo ? 'https://discord.com/api/webhooks/12345/demo-token-7x9a' : null)
  );
  const [inputUrl, setInputUrl] = useState('');
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();

    if (!trimmed) {
      setFeedback({ type: 'error', text: 'Please enter a webhook URL.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    if (isDemo || !spaceId) {
      setWebhookUrl(trimmed);
      setIsEditingWebhook(false);
      setInputUrl('');
      setIsSaving(false);
      setFeedback({ type: 'success', text: 'Webhook saved in preview mode.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    try {
      const res = await saveDiscordWebhookAction(spaceId, trimmed);
      if (res.success) {
        setWebhookUrl(trimmed);
        setIsEditingWebhook(false);
        setInputUrl('');
        setFeedback({ type: 'success', text: 'Discord webhook connected!' });
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'Failed to save webhook.',
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error saving webhook.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleRemoveWebhook = async () => {
    if (isDemo || !spaceId) {
      setWebhookUrl(null);
      setIsEditingWebhook(false);
      setFeedback({ type: 'success', text: 'Webhook removed.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveDiscordWebhookAction(spaceId, null);
      if (res.success) {
        setWebhookUrl(null);
        setIsEditingWebhook(false);
        setFeedback({ type: 'success', text: 'Webhook disconnected.' });
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'Failed to remove webhook.',
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error removing webhook.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <section
      className={`relative flex flex-col justify-between overflow-hidden rounded-md border border-line bg-paper p-5 shadow-xs sm:p-6 ${className}`}
      aria-labelledby="space-settings-heading"
    >
      <div>
        {/* Header */}
        <div className="mb-0 flex items-center justify-between border-b border-line pb-3">
          <div>
            <p className="m-0 mb-0.5 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
              Management
            </p>
            <h2
              id="space-settings-heading"
              className="m-0 font-display text-lg font-normal text-ink"
            >
              Space Settings
            </h2>
          </div>

          {/* Members Avatars in Header */}
          <div className="flex items-center gap-1.5" title="Members in space">
            {/* User Avatar */}
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatarUrl}
                alt={userName}
                className="h-7 w-7 rounded-full border border-line object-cover shadow-2xs sm:h-8 sm:w-8"
                title={`${userName} (You)`}
              />
            ) : (
              <span
                className="grid h-7 w-7 place-items-center rounded-full border border-line bg-paper-soft text-xs font-semibold text-ink sm:h-8 sm:w-8"
                title={`${userName} (You)`}
              >
                {userName.charAt(0).toUpperCase()}
              </span>
            )}

            {/* Partner Avatar or Waiting Slot */}
            {partnerName ? (
              partnerAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partnerAvatarUrl}
                  alt={partnerName}
                  className="h-7 w-7 rounded-full border border-line object-cover shadow-2xs sm:h-8 sm:w-8"
                  title={partnerName}
                />
              ) : (
                <span
                  className="grid h-7 w-7 place-items-center rounded-full border border-line bg-paper-soft text-xs font-semibold text-sage-dark sm:h-8 sm:w-8"
                  title={partnerName}
                >
                  {partnerName.charAt(0).toUpperCase()}
                </span>
              )
            ) : (
              <div className="flex items-center gap-1.5">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-stone bg-paper-soft text-[10px] text-muted sm:h-8 sm:w-8"
                  title="Waiting for partner"
                >
                  +
                </span>
                <span className="text-[11px] text-muted sm:text-xs">
                  Waiting…
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Settings list */}
        <div className="divide-y divide-line">
          {/* Space Code */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="shrink-0 text-[10px] font-bold tracking-wider text-muted uppercase sm:text-xs">
              Space Code
            </span>
            {pairingCode ? (
              <div className="flex items-center gap-2">
                <strong className="font-mono text-xs tracking-wider text-ink sm:text-sm">
                  {pairingCode}
                </strong>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex cursor-pointer items-center justify-center rounded p-0.5 text-muted transition-colors hover:text-ink"
                  title={isCopied ? 'Copied!' : 'Copy Space Code'}
                  aria-label={isCopied ? 'Copied' : 'Copy Space Code'}
                >
                  {isCopied ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      className="h-3.25 w-3.25 text-sage-dark"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      className="h-3.25 w-3.25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <span className="font-mono text-xs text-muted sm:text-sm">—</span>
            )}
          </div>

          {/* Calendar */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="shrink-0 text-[10px] font-bold tracking-wider text-muted uppercase sm:text-xs">
              Calendar
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasGoogleCalendar ? 'bg-sage' : 'bg-stone'
                }`}
              />
              <span className="text-xs text-muted sm:text-sm">
                {hasGoogleCalendar ? 'Google Synced' : 'Not linked'}
              </span>
            </div>
          </div>

          {/* Discord */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="shrink-0 text-[10px] font-bold tracking-wider text-muted uppercase sm:text-xs">
              Discord
            </span>

            {/* Connected — view state */}
            {webhookUrl && !isEditingWebhook && (
              <div className="flex min-w-0 items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl(webhookUrl);
                    setIsEditingWebhook(true);
                  }}
                  className="group flex min-w-0 items-center gap-1.5 rounded px-2 py-1 font-mono text-xs text-ink transition-colors hover:bg-black/5 hover:text-ink sm:text-xs"
                  title="Click to edit webhook URL"
                >
                  <span className="max-w-[150px] truncate sm:max-w-[240px]">
                    {maskWebhookUrl(webhookUrl)}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    className="shrink-0 text-muted/60 transition-colors group-hover:text-ink"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(true)}
                  disabled={isSaving}
                  className="h-7 shrink-0 cursor-pointer rounded border border-clay/40 bg-clay-soft px-2.5 text-xs font-medium text-ink transition-colors hover:border-clay/60 hover:bg-clay-soft/80 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Not connected — empty state */}
            {!webhookUrl && !isEditingWebhook && (
              <button
                type="button"
                onClick={() => setIsEditingWebhook(true)}
                className="h-7 shrink-0 cursor-pointer rounded border border-line bg-paper px-2.5 text-xs font-medium text-ink transition-colors hover:border-ink/40 hover:bg-paper-soft"
              >
                + Connect
              </button>
            )}

            {/* Editing — inline form (single-line matching button heights to eliminate layout shift) */}
            {isEditingWebhook && (
              <form
                onSubmit={handleSaveWebhook}
                className="flex min-w-0 flex-1 items-center justify-end gap-1.5"
              >
                <input
                  type="url"
                  required
                  autoFocus
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="h-7 max-w-[200px] min-w-0 flex-1 rounded border border-line bg-paper px-2.5 text-xs text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none sm:max-w-[260px]"
                />
                <button
                  type="submit"
                  disabled={isSaving || !inputUrl.trim()}
                  className="h-7 shrink-0 cursor-pointer rounded bg-ink px-2.5 text-xs font-semibold text-paper shadow-2xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : webhookUrl ? 'Save' : 'Connect'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingWebhook(false);
                    setInputUrl('');
                  }}
                  className="h-7 shrink-0 cursor-pointer rounded border border-line bg-paper px-2.5 text-xs font-medium text-muted transition-colors hover:text-ink"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <p
            className={`m-0 mt-3 text-[11px] font-medium ${
              feedback.type === 'success' ? 'text-sage-dark' : 'text-clay'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDisconnect}
        title="Disconnect webhook?"
        description="Channel notifications will stop immediately. You can reconnect at any time."
        confirmLabel="Disconnect"
        onConfirm={() => {
          setConfirmDisconnect(false);
          void handleRemoveWebhook();
        }}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </section>
  );
}

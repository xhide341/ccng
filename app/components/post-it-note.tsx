'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import { logBrowserActivity } from '../lib/activity-client';

type PostItNoteProps = {
  spaceId?: string;
  userId?: string;
  userName?: string;
  userAvatarUrl?: string;
  partnerId?: string;
  partnerName?: string;
  partnerAvatarUrl?: string;
  initialContent?: string;
  initialAuthorId?: string | null;
  initialUpdatedAt?: string | null;
  isDemo?: boolean;
  className?: string;
};

function formatNoteTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    if (diffMs >= 0 && diffMs < 45 * 1000) {
      return 'just now';
    }
    const diffMin = Math.floor(diffMs / (60 * 1000));
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return `today at ${timeStr}`;
    }
    if (isYesterday) {
      return `yesterday at ${timeStr}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

const NOTE_CHAR_LIMIT = 100;

export function PostItNote({
  spaceId,
  userId,
  userName = 'You',
  userAvatarUrl,
  partnerId,
  partnerName = 'Partner',
  partnerAvatarUrl,
  initialContent = '',
  initialAuthorId = null,
  initialUpdatedAt = null,
  isDemo = false,
  className = '',
}: PostItNoteProps) {
  const [content, setContent] = useState<string>(initialContent);
  const [authorId, setAuthorId] = useState<string | null>(initialAuthorId);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(initialContent);
  const lastExitEditTimeRef = useRef<number>(0);

  const [prevInitialKey, setPrevInitialKey] = useState(
    `${initialContent}|${initialAuthorId}|${initialUpdatedAt}`
  );
  const currentInitialKey = `${initialContent}|${initialAuthorId}|${initialUpdatedAt}`;
  if (prevInitialKey !== currentInitialKey) {
    setPrevInitialKey(currentInitialKey);
    if (!isEditing) {
      setContent(initialContent);
      setDraft(initialContent);
      setAuthorId(initialAuthorId);
      setUpdatedAt(initialUpdatedAt);
    }
  }

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    lastSavedContentRef.current = initialContent;
  }, [initialContent]);

  // Realtime subscription for live sync between partners (Broadcast + Postgres Changes)
  useEffect(() => {
    if (isDemo || !spaceId) return;

    const supabase = getSupabaseBrowserClient();
    const channelName = `realtime:space_notes:${spaceId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    channel
      .on(
        'broadcast',
        { event: 'note_updated' },
        ({
          payload,
        }: {
          payload: {
            content?: string;
            author_id?: string | null;
            updated_at?: string | null;
          };
        }) => {
          if (!isEditingRef.current) {
            const newText = payload.content || '';
            setContent(newText);
            setDraft(newText);
            setAuthorId(payload.author_id ?? null);
            setUpdatedAt(payload.updated_at ?? null);
            lastSavedContentRef.current = newText;
          }
        }
      )
      .on('broadcast', { event: 'note_cleared' }, () => {
        if (!isEditingRef.current) {
          setContent('');
          setDraft('');
          setAuthorId(null);
          setUpdatedAt(null);
          lastSavedContentRef.current = '';
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_notes',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            if (!isEditingRef.current) {
              setContent('');
              setDraft('');
              setAuthorId(null);
              setUpdatedAt(null);
              lastSavedContentRef.current = '';
            }
          } else if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as {
              content?: string;
              author_id?: string | null;
              updated_at?: string | null;
            };
            if (!isEditingRef.current) {
              const newText = row.content || '';
              setContent(newText);
              setDraft(newText);
              setAuthorId(row.author_id ?? null);
              setUpdatedAt(row.updated_at ?? null);
              lastSavedContentRef.current = newText;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime:space_notes:${spaceId}] Status:`, status);
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [isDemo, spaceId]);

  // Save implementation
  const persistNote = useCallback(
    async (textToSave: string) => {
      const trimmed = textToSave.trim();

      // Don't re-save if unchanged
      if (trimmed === lastSavedContentRef.current && authorId === userId) {
        return;
      }

      setSaveStatus('saving');
      const nowIso = new Date().toISOString();

      if (isDemo || !spaceId) {
        setContent(trimmed);
        setAuthorId(userId || 'demo-user');
        setUpdatedAt(nowIso);
        lastSavedContentRef.current = trimmed;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1800);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        if (trimmed === '') {
          // Clear note in database
          await supabase.from('space_notes').delete().eq('space_id', spaceId);
          setContent('');
          setAuthorId(null);
          setUpdatedAt(null);
          lastSavedContentRef.current = '';

          // Broadcast clear event to partner immediately
          if (channelRef.current) {
            void channelRef.current.send({
              type: 'broadcast',
              event: 'note_cleared',
              payload: {},
            });
          }
        } else {
          // Upsert note in database
          const { error } = await supabase.from('space_notes').upsert({
            space_id: spaceId,
            content: trimmed,
            author_id: userId || null,
            updated_at: nowIso,
          });

          if (error) {
            console.error('Failed to save sticky note:', error);
            setSaveStatus('idle');
            return;
          }

          setContent(trimmed);
          setAuthorId(userId || null);
          setUpdatedAt(nowIso);
          lastSavedContentRef.current = trimmed;

          // Broadcast updated note to partner immediately
          if (channelRef.current) {
            void channelRef.current.send({
              type: 'broadcast',
              event: 'note_updated',
              payload: {
                content: trimmed,
                author_id: userId || null,
                updated_at: nowIso,
              },
            });
          }

          // Log to Recent Activity
          void logBrowserActivity({
            spaceId,
            kind: 'note_updated',
            payload: {
              notePreview: trimmed.slice(0, 60),
            },
          });
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1800);
      } catch (err) {
        console.error('Error saving sticky note:', err);
        setSaveStatus('idle');
      }
    },
    [authorId, isDemo, spaceId, userId]
  );

  // Debounced auto-save while typing
  const scheduleAutoSave = useCallback(
    (text: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void persistNote(text);
      }, 1400);
    },
    [persistNote]
  );

  const startEditing = () => {
    if (Date.now() - lastExitEditTimeRef.current < 250) {
      return;
    }
    isEditingRef.current = true;
    setDraft(content);
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
      }
    }, 20);
  };

  const handleDone = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    lastExitEditTimeRef.current = Date.now();
    isEditingRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    void persistNote(draft);
    setIsEditing(false);
  };

  const handleBlur = () => {
    lastExitEditTimeRef.current = Date.now();
    isEditingRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    void persistNote(draft);
    setIsEditing(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    isEditingRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setDraft('');
    void persistNote('');
    setIsEditing(false);
  };

  // Determine attribution info
  const isSelf = authorId && userId && authorId === userId;
  const isPartner = authorId && partnerId && authorId === partnerId;

  const authorDisplayName = isSelf
    ? userName || 'You'
    : isPartner
      ? partnerName
      : authorId
        ? partnerName || 'Partner'
        : null;

  const authorAvatar = isSelf
    ? userAvatarUrl
    : isPartner
      ? partnerAvatarUrl
      : undefined;

  const authorInitial = authorDisplayName
    ? authorDisplayName.charAt(0).toUpperCase()
    : 'P';

  const timeLabel = formatNoteTime(updatedAt);

  return (
    <section
      className={`flex min-h-[150px] min-w-0 flex-col justify-between rounded-md border border-line bg-paper p-5 shadow-xs transition-all sm:min-h-[160px] sm:p-6 sm:pb-6.5 ${className}`}
      aria-labelledby="partner-note-heading"
    >
      {/* Header row matching other sections */}
      <div className="mb-1 flex h-6 items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <p
            className="m-0 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase"
            id="partner-note-heading"
          >
            Partner Note
          </p>
          {isEditing && (
            <span
              className={`font-sage text-[10.5px] transition-colors ${
                draft.length >= NOTE_CHAR_LIMIT
                  ? 'font-bold text-red-400'
                  : draft.length >= 90
                    ? 'font-semibold text-amber-700'
                    : 'text-muted'
              }`}
            >
              · {draft.length}/{NOTE_CHAR_LIMIT}
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-muted italic">· Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] font-medium text-sage-dark">
              · Saved
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {content && !isEditing && (
            <button
              type="button"
              onClick={handleClear}
              className="cursor-pointer rounded p-1 text-muted transition-colors hover:text-clay"
              title="Clear note"
              aria-label="Clear note"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          )}

          {!isEditing ? (
            <button
              type="button"
              onClick={startEditing}
              className="cursor-pointer rounded p-1 text-muted transition-colors hover:text-ink"
              title="Edit note"
              aria-label="Edit note"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleDone}
              className="cursor-pointer rounded bg-sage-dark px-2.5 py-0.5 text-xs font-semibold text-paper transition-colors hover:bg-[#395241]"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Note Content / Single-line Input */}
      <div
        onClick={!isEditing ? startEditing : undefined}
        className={`flex min-h-[36px] w-full min-w-0 flex-1 flex-col items-start justify-start pt-1 text-start ${!isEditing ? 'cursor-pointer' : ''}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={NOTE_CHAR_LIMIT}
            onChange={(e) => {
              const val = e.target.value.slice(0, NOTE_CHAR_LIMIT);
              setDraft(val);
              scheduleAutoSave(val);
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDone();
              } else if (e.key === 'Escape') {
                handleDone();
              }
            }}
            placeholder=""
            className="m-0 block w-full min-w-0 border-none bg-transparent p-0 text-start font-display text-sm leading-snug text-ink not-italic placeholder:text-muted/60 focus:ring-0 focus:outline-hidden sm:text-base"
          />
        ) : content ? (
          <p
            className="m-0 w-full min-w-0 p-0 text-start font-display text-sm leading-snug wrap-anywhere text-ink not-italic sm:text-base"
            title={content}
          >
            {content}
          </p>
        ) : (
          <div className="flex w-full items-center justify-start gap-1.5 text-start text-muted transition-colors hover:text-ink">
            <span
              className="text-sm select-none"
              role="img"
              aria-label="pencil"
            >
              ✏️
            </span>
            <span className="font-display text-xs text-muted not-italic sm:text-sm">
              Leave a note for your partner...
            </span>
          </div>
        )}
      </div>

      {/* Footer Attribution (Avatar + Author + Time) */}
      <div className="mt-3 flex h-5 items-center justify-between text-xs text-muted">
        {authorDisplayName && (content || draft) ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-ink-muted text-xs font-medium">
                Left by
              </span>
              {authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatar}
                  alt={authorDisplayName}
                  className="h-4.5 w-4.5 rounded-full object-cover shadow-2xs"
                />
              ) : (
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-sage-dark/10 text-[10px] font-semibold text-sage-dark shadow-2xs">
                  {authorInitial}
                </span>
              )}
            </div>

            {timeLabel && (
              <span className="text-[11px] text-muted">{timeLabel}</span>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted/60">Shared partner note</span>
        )}
      </div>
    </section>
  );
}

'use client';

import { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { CalendarEvent } from '../../lib/calendar-types';

type CalendarAgendaProps = {
  selectedDate: Date;
  events: CalendarEvent[];
  onAddPlan?: () => void;
  onUpdatePlan?: (
    eventId: string,
    input: {
      title: string;
      description?: string;
      location?: string;
      startDate: string;
      endDate?: string;
      allDay: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  onDeletePlan?: (eventId: string) => void;
  hasGoogleCalendar?: boolean;
  onSyncNow?: () => void;
  onSwitchAccount?: () => void;
  onUnlinkCalendar?: () => void;
  isSyncing?: boolean;
  isDemo?: boolean;
};

function formatEventTime(isoString: string, allDay: boolean): string {
  if (allDay) return 'All day';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getEventTimeInput(isoString: string): string {
  try {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '09:00';
  }
}

function InlineEventEditForm({
  event,
  onCancel,
  onSave,
}: {
  event: CalendarEvent;
  onCancel: () => void;
  onSave?: (
    eventId: string,
    input: {
      title: string;
      description?: string;
      location?: string;
      startDate: string;
      endDate?: string;
      allDay: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [title, setTitle] = useState(event.title);
  const [allDay, setAllDay] = useState(event.allDay);
  const [startTime, setStartTime] = useState(() =>
    getEventTimeInput(event.startDate)
  );
  const [endTime, setEndTime] = useState(() =>
    event.endDate ? getEventTimeInput(event.endDate) : '10:00'
  );
  const [location, setLocation] = useState(event.location || '');
  const [description, setDescription] = useState(event.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !onSave) return;

    setIsSaving(true);
    setError(null);

    const baseDate = new Date(event.startDate);
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    let finalStart: string;
    let finalEnd: string | undefined;

    if (allDay) {
      finalStart = dateStr;
      finalEnd = dateStr;
    } else {
      const [startH, startM] = (startTime || '09:00').split(':');
      const [endH, endM] = (endTime || '10:00').split(':');

      const sDate = new Date(baseDate);
      sDate.setHours(parseInt(startH, 10), parseInt(startM, 10), 0, 0);
      finalStart = sDate.toISOString();

      const eDate = new Date(baseDate);
      eDate.setHours(parseInt(endH, 10), parseInt(endM, 10), 0, 0);
      finalEnd = eDate.toISOString();
    }

    const res = await onSave(event.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startDate: finalStart,
      endDate: finalEnd,
      allDay,
    });

    if (res.success) {
      onCancel();
    } else {
      setError(res.error || 'Failed to save changes.');
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-wider text-sage-dark uppercase">
          Title
        </label>
        <input
          type="text"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          className="rounded border border-line bg-paper px-2.5 py-1 text-xs text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none"
          placeholder="Event title"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-wider text-sage-dark uppercase">
          Time
        </label>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-1.5 text-xs transition-opacity duration-200 ${
              allDay ? 'pointer-events-none opacity-30' : 'text-muted'
            }`}
          >
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={isSaving || allDay}
              className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink transition-colors focus:border-ink focus:outline-none disabled:cursor-not-allowed"
            />
            <span>–</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={isSaving || allDay}
              className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink transition-colors focus:border-ink focus:outline-none disabled:cursor-not-allowed"
            />
          </div>

          <label
            className={`group flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-ink transition-colors select-none hover:text-sage-dark ${
              isSaving ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                disabled={isSaving}
                className="peer sr-only"
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-all duration-150 ${
                  allDay
                    ? 'border-sage-dark bg-sage-dark text-paper shadow-2xs'
                    : 'border-line bg-paper text-transparent group-hover:border-sage-dark/60'
                } peer-focus-visible:ring-2 peer-focus-visible:ring-sage peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-paper`}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 12 12"
                  className={`h-2.5 w-2.5 transition-transform duration-150 ${
                    allDay ? 'scale-100' : 'scale-50'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6.2 4.7 8.5 9.5 3.5" />
                </svg>
              </span>
            </span>
            <span>All day</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-wider text-sage-dark uppercase">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isSaving}
          className="rounded border border-line bg-paper px-2.5 py-1 text-xs text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none"
          placeholder="Optional location"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-wider text-sage-dark uppercase">
          Notes
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSaving}
          className="resize-none rounded border border-line bg-paper px-2.5 py-1 text-xs text-ink transition-colors placeholder:text-muted focus:border-ink focus:outline-none"
          placeholder="Optional notes..."
        />
      </div>

      {error && (
        <p className="m-0 animate-[card-in_150ms_ease-out_both] text-[11px] font-medium text-clay">
          {error}
        </p>
      )}

      <div className="mt-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="cursor-pointer rounded border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="inline-flex min-h-7 min-w-16 cursor-pointer items-center justify-center rounded bg-ink px-3 py-1 text-xs font-semibold text-paper shadow-2xs transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <svg
              className="h-3.5 w-3.5 animate-spin text-paper"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="40 20"
              />
            </svg>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </form>
  );
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function AgendaEventCard({
  event,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  event: CalendarEvent;
  isEditing: boolean;
  onStartEdit?: () => void;
  onCancelEdit: () => void;
  onSaveEdit?: (
    eventId: string,
    input: {
      title: string;
      description?: string;
      location?: string;
      startDate: string;
      endDate?: string;
      allDay: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete?: () => void;
}) {
  const cardRef = useRef<HTMLLIElement>(null);
  const prevHeightRef = useRef<number | null>(null);
  const [prevIsEditing, setPrevIsEditing] = useState(isEditing);
  const [hasToggled, setHasToggled] = useState(false);

  if (isEditing !== prevIsEditing) {
    setPrevIsEditing(isEditing);
    if (prevIsEditing && !isEditing) {
      setHasToggled(true);
    }
  }

  useIsomorphicLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const currentHeight = el.offsetHeight;
    const prevHeight = prevHeightRef.current;
    prevHeightRef.current = currentHeight;

    if (prevHeight === null || Math.abs(currentHeight - prevHeight) < 4) {
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const anim = el.animate(
      [
        { height: `${prevHeight}px`, overflow: 'hidden' },
        { height: `${currentHeight}px`, overflow: 'hidden' },
      ],
      {
        duration: 250,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    );

    return () => {
      anim.cancel();
    };
  }, [isEditing]);

  const handleStartEdit = () => {
    if (cardRef.current) {
      prevHeightRef.current = cardRef.current.offsetHeight;
    }
    onStartEdit?.();
  };

  const handleCancelEdit = () => {
    if (cardRef.current) {
      prevHeightRef.current = cardRef.current.offsetHeight;
    }
    onCancelEdit();
  };

  const startTime = formatEventTime(event.startDate, event.allDay);
  const endTime = event.allDay ? '' : formatEventTime(event.endDate, false);
  const timeString = event.allDay ? 'All day' : `${startTime} – ${endTime}`;

  return (
    <li
      ref={cardRef}
      className={`flex flex-col rounded-md border transition-colors duration-200 ${
        isEditing
          ? 'border-ink/25 bg-paper p-3 shadow-xs'
          : 'group border-line bg-paper/60 p-3 shadow-2xs hover:border-ink/20'
      }`}
    >
      {isEditing ? (
        <div className="animate-[card-in_220ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <InlineEventEditForm
            event={event}
            onCancel={handleCancelEdit}
            onSave={onSaveEdit}
          />
        </div>
      ) : (
        <div
          className={
            hasToggled
              ? 'animate-[card-in_200ms_cubic-bezier(0.16,1,0.3,1)_both]'
              : ''
          }
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-ink">{event.title}</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] text-muted">
                {timeString}
              </span>
              {onStartEdit && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex cursor-pointer items-center justify-center rounded p-0.5 text-muted transition-colors hover:text-ink"
                  title="Edit plan"
                  aria-label={`Edit ${event.title || 'plan'}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex cursor-pointer items-center justify-center rounded p-0.5 text-muted transition-colors hover:text-clay"
                  title="Delete plan"
                  aria-label={`Delete ${event.title || 'plan'}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {event.location && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.description && (
            <p className="m-0 mt-1.5 line-clamp-2 text-xs text-muted/90">
              {event.description}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function CalendarAgenda({
  selectedDate,
  events,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  hasGoogleCalendar = false,
  onSyncNow,
  onSwitchAccount,
  onUnlinkCalendar,
  isSyncing = false,
  isDemo = false,
}: CalendarAgendaProps) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const today = useMemo(() => new Date(), []);
  const isSelectedToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  const selectedDateFormatted = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="m-0 text-[11px] font-bold tracking-wider text-sage-dark uppercase">
            {isSelectedToday ? 'Today’s Agenda' : 'Day Details'}
          </p>
          <h3
            suppressHydrationWarning
            className="m-0 font-display text-lg font-normal text-ink"
          >
            {selectedDateFormatted}
          </h3>
        </div>
        <div
          ref={settingsRef}
          className="relative flex items-center gap-1.5 self-start"
        >
          {onAddPlan && (
            <button
              type="button"
              onClick={onAddPlan}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-sage-dark px-3 text-xs font-semibold text-paper shadow-2xs transition-opacity hover:opacity-90 focus:outline-none"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                className="h-3.25 w-3.25"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Plan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            aria-label="Calendar settings"
            aria-expanded={isSettingsOpen}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line bg-paper text-muted shadow-2xs transition-colors hover:border-ink/40 hover:text-ink focus:outline-none"
            title="Calendar settings"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              className="h-3.75 w-3.75"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {isSettingsOpen && (
            <div className="absolute top-full right-0 z-30 mt-1.5 w-52 rounded-md border border-line bg-paper p-1 shadow-lg">
              {hasGoogleCalendar ? (
                <>
                  {onSyncNow && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onSyncNow();
                      }}
                      disabled={isSyncing}
                      className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-black/5 disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        className={`h-3.5 w-3.5 text-muted ${isSyncing ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 21h5v-5" />
                      </svg>
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  )}

                  {onSwitchAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onSwitchAccount();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-black/5"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        className="h-3.5 w-3.5 text-muted"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Switch Google Account
                    </button>
                  )}

                  <div className="my-1 border-t border-line/60" />

                  {onUnlinkCalendar && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onUnlinkCalendar();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-clay transition-colors hover:bg-clay/10"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                      Unlink Calendar
                    </button>
                  )}
                </>
              ) : isDemo || !onSwitchAccount ? (
                <div
                  className="flex w-full cursor-default select-none items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-muted"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    className="h-3.5 w-3.5 text-muted/60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Connect Google Calendar
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onSwitchAccount?.();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-sage-dark transition-colors hover:bg-sage/10"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    className="h-3.5 w-3.5 text-sage"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Connect Google Calendar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {events.length > 0 ? (
        <ul className="m-0 flex max-h-[420px] list-none flex-col gap-3 overflow-y-auto p-0 pr-1">
          {events.map((evt) => (
            <AgendaEventCard
              key={evt.id}
              event={evt}
              isEditing={editingEventId === evt.id}
              onStartEdit={
                onUpdatePlan ? () => setEditingEventId(evt.id) : undefined
              }
              onCancelEdit={() => setEditingEventId(null)}
              onSaveEdit={onUpdatePlan}
              onDelete={onDeletePlan ? () => onDeletePlan(evt.id) : undefined}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed border-line p-5 text-center">
          <p className="m-0 text-xs text-muted">
            No plans scheduled for this day.
          </p>
          <p className="m-0 mt-1 text-[11px] text-muted/70">
            Enjoy the open space together.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';

type CalendarEventModalProps = {
  isOpen: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSave: (event: {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
  }) => Promise<void>;
  isSaving: boolean;
};

function formatDateToIsoString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarEventModal({
  isOpen,
  selectedDate,
  onClose,
  onSave,
  isSaving,
}: CalendarEventModalProps) {
  const defaultDateStr = formatDateToIsoString(selectedDate);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDateStr);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current || isSaving) return;

    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please enter a title for the plan.');
      return;
    }

    let startIso: string;
    let endIso: string;

    if (allDay) {
      startIso = date;
      endIso = date;
    } else {
      startIso = `${date}T${startTime}:00`;
      endIso = `${date}T${endTime}:00`;
      if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
        setError('End time must be after start time.');
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await onSave({
        title: cleanTitle,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDate: startIso,
        endDate: endIso,
        allDay,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save event';
      setError(msg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-event-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-md border border-line bg-paper p-6 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <p className="m-0 text-[10px] font-bold tracking-widest text-sage-dark uppercase">
              New Shared Plan
            </p>
            <h3
              id="modal-event-title"
              className="m-0 font-display text-xl font-normal text-ink"
            >
              Add to Google Calendar
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-3 -mr-3 flex h-7 w-7 cursor-pointer items-center justify-center self-start rounded text-muted transition-colors hover:text-ink focus:outline-none"
            aria-label="Close modal"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="event-title-input"
              className="mb-1 block text-xs font-semibold text-ink"
            >
              Plan Title *
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner Date, Weekend Trip, Movie Night"
              className="w-full rounded border border-line bg-white/60 px-3 py-2 text-xs text-ink placeholder:text-muted/60 focus:border-sage focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="event-date-input"
                className="mb-1 block text-xs font-semibold text-ink"
              >
                Date
              </label>
              <input
                id="event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-line bg-white/60 px-3 py-2 text-xs text-ink focus:border-sage focus:outline-hidden"
              />
            </div>

            <div className="flex items-center pt-5 sm:pt-6">
              <label className="group flex cursor-pointer items-center gap-2 text-xs font-medium text-ink transition-colors select-none hover:text-sage-dark">
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
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
                <span>All-Day Event</span>
              </label>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 gap-3 transition-opacity duration-200 ${
              allDay ? 'pointer-events-none opacity-35' : ''
            }`}
          >
            <div>
              <label
                htmlFor="start-time-input"
                className={`mb-1 block text-xs font-semibold transition-colors ${
                  allDay ? 'text-muted' : 'text-ink'
                }`}
              >
                Start Time
              </label>
              <input
                id="start-time-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting || isSaving || allDay}
                className="w-full rounded border border-line bg-white/60 px-3 py-2 text-xs text-ink transition-colors focus:border-sage focus:outline-hidden disabled:cursor-not-allowed disabled:bg-black/5"
              />
            </div>

            <div>
              <label
                htmlFor="end-time-input"
                className={`mb-1 block text-xs font-semibold transition-colors ${
                  allDay ? 'text-muted' : 'text-ink'
                }`}
              >
                End Time
              </label>
              <input
                id="end-time-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting || isSaving || allDay}
                className="w-full rounded border border-line bg-white/60 px-3 py-2 text-xs text-ink transition-colors focus:border-sage focus:outline-hidden disabled:cursor-not-allowed disabled:bg-black/5"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="location-input"
              className="mb-1 block text-xs font-semibold text-ink"
            >
              Location (optional)
            </label>
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Little Tokyo or Home"
              className="w-full rounded border border-line bg-white/60 px-3 py-2 text-xs text-ink placeholder:text-muted/60 focus:border-sage focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="desc-input"
              className="mb-1 block text-xs font-semibold text-ink"
            >
              Notes (optional)
            </label>
            <textarea
              id="desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details, links, or notes..."
              className="w-full resize-none rounded border border-line bg-white/60 px-3 py-2 text-xs text-ink placeholder:text-muted/60 focus:border-sage focus:outline-hidden"
            />
          </div>

          {error && (
            <p className="m-0 text-xs font-medium text-clay">{error}</p>
          )}

          <div className="rounded-md border border-line bg-stone/10 p-2.5 text-[11px] leading-relaxed text-muted">
            ✨ This event will be synced to your Google Calendar and shared with
            your partner.
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded border border-line px-3 py-1.5 text-xs text-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSaving}
              className="inline-flex min-h-7 min-w-19 items-center justify-center rounded bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting || isSaving ? (
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
                'Add Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

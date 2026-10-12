'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { CalendarEvent, getDemoCalendarEvents } from '../../lib/calendar-types';
import {
  getCalendarEventsAction,
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
  unlinkGoogleCalendarAction,
} from '../../lib/actions/calendar';
import { signInWithGoogle } from '../../lib/auth';
import { CalendarMonthGrid } from './calendar-month-grid';
import { CalendarAgenda } from './calendar-agenda';
import { CalendarEventModal } from './calendar-event-modal';

export type SharedCalendarProps = {
  spaceId?: string;
  initialEvents?: CalendarEvent[];
  hasGoogleCalendar?: boolean;
  isDemo?: boolean;
};

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SharedCalendar({
  spaceId,
  initialEvents,
  hasGoogleCalendar = false,
  isDemo = false,
}: SharedCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);
  const [events, setEvents] = useState<CalendarEvent[]>(
    () =>
      initialEvents ??
      (isDemo || !hasGoogleCalendar ? getDemoCalendarEvents() : [])
  );
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isManuallyUnlinked, setIsManuallyUnlinked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isLinked = hasGoogleCalendar && !isManuallyUnlinked;

  const lastFetchedRef = useRef<number>(0);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const d = new Date(evt.startDate);
      const key = formatDateKey(d);
      const existing = map.get(key) || [];
      existing.push(evt);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  const selectedKey = formatDateKey(selectedDate);
  const selectedDayEvents = eventsByDate.get(selectedKey) || [];

  // Silent background refresh
  const refreshEvents = useCallback(async () => {
    try {
      setSyncError(null);
      const updatedEvents = await getCalendarEventsAction(isDemo);
      setEvents(updatedEvents);
      lastFetchedRef.current = Date.now();
    } catch (err) {
      console.error('Failed to auto-refresh calendar:', err);
      if (hasGoogleCalendar) {
        setSyncError('Sync issue');
      }
    }
  }, [isDemo, hasGoogleCalendar]);

  // Tab visibility & focus auto-refresh with 60-second cooldown
  useEffect(() => {
    lastFetchedRef.current = Date.now();

    function handleVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchedRef.current;
        if (timeSinceLastFetch > 60000) {
          void refreshEvents();
        }
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [refreshEvents]);

  // Create new plan action
  async function handleCreateEvent(input: {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
  }) {
    if (isCreatingPlan) return;
    setIsCreatingPlan(true);

    try {
      if (spaceId && !isDemo) {
        const res = await createCalendarEventAction(spaceId, input);
        if (!res.success) {
          throw new Error(
            res.error || 'Failed to create plan in Google Calendar'
          );
        }
        if (res.event) {
          setEvents((prev) => [...prev, res.event!]);
        }
      } else {
        // Demo mode fallback
        const demoEvent: CalendarEvent = {
          id: `demo-${Date.now()}`,
          title: input.title,
          description: input.description,
          location: input.location,
          startDate: input.startDate,
          endDate: input.endDate || input.startDate,
          allDay: input.allDay,
        };
        setEvents((prev) => [...prev, demoEvent]);
      }
      lastFetchedRef.current = Date.now();
    } finally {
      setIsCreatingPlan(false);
    }
  }

  async function handleDeletePlan(eventId: string) {
    const eventToDelete = events.find((e) => e.id === eventId);
    if (!eventToDelete) return;

    const confirmed = window.confirm(
      `Delete "${eventToDelete.title}" from Google Calendar?`
    );
    if (!confirmed) return;

    // Optimistically remove from state
    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    if (isDemo) {
      return;
    }

    try {
      const res = await deleteCalendarEventAction(
        eventId,
        spaceId,
        eventToDelete.title
      );
      if (!res.success) {
        // Rollback on failure
        setEvents((prev) => [...prev, eventToDelete]);
        alert(res.error || 'Failed to delete event from Google Calendar.');
      }
    } catch {
      // Rollback on unexpected error
      setEvents((prev) => [...prev, eventToDelete]);
      alert('Failed to delete event. Please try again.');
    }
  }

  async function handleUpdatePlan(
    eventId: string,
    input: {
      title: string;
      description?: string;
      location?: string;
      startDate: string;
      endDate?: string;
      allDay: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (isDemo || !hasGoogleCalendar) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                title: input.title,
                description: input.description,
                location: input.location,
                startDate: input.startDate,
                endDate: input.endDate || input.startDate,
                allDay: input.allDay,
              }
            : e
        )
      );
      return { success: true };
    }

    try {
      const res = await updateCalendarEventAction(eventId, input, spaceId);
      if (!res.success) {
        return { success: false, error: res.error || 'Failed to update plan.' };
      }
      if (res.event) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? res.event! : e))
        );
      }
      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update plan.';
      return { success: false, error: message };
    }
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      await refreshEvents();
    } finally {
      setIsSyncing(false);
    }
  }

  function handleSwitchAccount() {
    void signInWithGoogle('/space', { prompt: 'select_account consent' });
  }

  async function handleUnlinkCalendar() {
    const confirmed = window.confirm(
      'Disconnect Google Calendar? Scheduled plans from Google will no longer be visible.'
    );
    if (!confirmed) return;

    try {
      const res = await unlinkGoogleCalendarAction();
      if (!res.success) {
        alert(res.error || 'Failed to unlink Google Calendar.');
        return;
      }
      setIsManuallyUnlinked(true);
      setEvents(isDemo ? getDemoCalendarEvents() : []);
    } catch {
      alert('Failed to unlink Google Calendar. Please try again.');
    }
  }

  return (
    <section
      className="my-8 flex flex-col rounded-md border border-line bg-paper p-6 shadow-xs sm:p-8"
      aria-labelledby="calendar-heading"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          {/* <p className="m-0 mb-1 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
            Shared Plans
          </p> */}
          <h2
            id="calendar-heading"
            className="m-0 font-display text-2xl font-normal text-ink"
          >
            Shared Calendar
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isLinked ? (
            syncError ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-clay">
                <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                Sync issue ·{' '}
                <button
                  type="button"
                  onClick={() => void refreshEvents()}
                  className="cursor-pointer underline hover:text-ink"
                >
                  Retry
                </button>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                Google Calendar Synced
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle('/space')}
              className="rounded border border-sage/60 bg-sage/15 px-2.5 py-1 font-semibold text-sage-dark transition-colors hover:bg-sage/25"
            >
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
        <CalendarMonthGrid
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={() =>
            setCurrentMonth(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() - 1,
                1
              )
            )
          }
          onNextMonth={() =>
            setCurrentMonth(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + 1,
                1
              )
            )
          }
        />

        <CalendarAgenda
          selectedDate={selectedDate}
          events={selectedDayEvents}
          onAddPlan={() => setIsEventModalOpen(true)}
          onUpdatePlan={handleUpdatePlan}
          onDeletePlan={handleDeletePlan}
          hasGoogleCalendar={isLinked}
          onSyncNow={handleSyncNow}
          onSwitchAccount={handleSwitchAccount}
          onUnlinkCalendar={handleUnlinkCalendar}
          isSyncing={isSyncing}
        />
      </div>

      {/* Create New Plan Modal */}
      {isEventModalOpen && (
        <CalendarEventModal
          isOpen={isEventModalOpen}
          selectedDate={selectedDate}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleCreateEvent}
          isSaving={isCreatingPlan}
        />
      )}
    </section>
  );
}

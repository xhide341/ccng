'use client';

import { useMemo } from 'react';
import { CalendarEvent } from '../../lib/calendar-types';

type CalendarMonthGridProps = {
  currentMonth: Date;
  selectedDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday?: () => void;
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarMonthGrid({
  currentMonth,
  selectedDate,
  eventsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarMonthGridProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const selectedKey = formatDateKey(selectedDate);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month, firstDayOfWeek, daysInCurrentMonth, daysInPrevMonth]);

  const monthTitle = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col">
      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <h3
          suppressHydrationWarning
          className="m-0 text-lg font-semibold text-ink"
        >
          {monthTitle}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded border border-line text-sm transition-colors hover:bg-black/5"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded border border-line text-sm text-ink transition-colors hover:bg-black/5"
          >
            ›
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const dateKey = formatDateKey(date);
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedKey;
          const dayEvents = eventsByDate.get(dateKey) || [];
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`group relative flex h-10 flex-col items-center justify-center rounded-md text-xs transition-all ${
                isSelected
                  ? 'bg-sage-dark font-semibold text-paper shadow-xs'
                  : isToday
                    ? 'border border-sage bg-sage/10 font-bold text-sage-dark'
                    : isCurrentMonth
                      ? 'text-ink hover:bg-black/5'
                      : 'text-muted/40 hover:text-muted'
              }`}
              aria-label={`${date.toDateString()}${hasEvents ? `, ${dayEvents.length} events` : ''}`}
            >
              <span>{date.getDate()}</span>
              {hasEvents && (
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    isSelected ? 'bg-paper' : 'bg-sage'
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="m-0 mt-4 text-[11px] text-muted">
        Dots denote scheduled couple moments. Click any day to view plans.
      </p>
    </div>
  );
}

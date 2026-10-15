import type { Json } from './supabase/types';

export type ActivityKind =
  | 'todo_created'
  | 'todo_updated'
  | 'todo_completed'
  | 'todo_uncompleted'
  | 'todo_deleted'
  | 'calendar_created'
  | 'calendar_updated'
  | 'calendar_deleted'
  | 'pairing_redeemed'
  | 'note_updated';

export type ActivityPayload = {
  title?: string;
  tag?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  location?: string;
  partnerName?: string;
  notePreview?: string;
  [key: string]: Json | undefined;
};

export type SpaceActivity = {
  id: string;
  space_id: string;
  actor_id: string;
  kind: ActivityKind;
  payload: ActivityPayload;
  created_at: string;
};

export function formatActivityTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    if (diffMs >= 0 && diffMs < 45 * 1000) {
      return 'Just now';
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
      return `Today at ${timeStr}`;
    }

    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

export function getActivityDotColor(kind: ActivityKind): string {
  switch (kind) {
    case 'todo_completed':
      return 'bg-sage';
    case 'todo_created':
    case 'calendar_created':
      return 'bg-clay';
    case 'pairing_redeemed':
      return 'bg-sage-dark';
    case 'note_updated':
      return 'bg-amber-400';
    case 'todo_updated':
    case 'todo_uncompleted':
    case 'todo_deleted':
    case 'calendar_updated':
    case 'calendar_deleted':
    default:
      return 'bg-stone';
  }
}

export function getDemoActivities(): SpaceActivity[] {
  const now = new Date();
  const todayMorning = new Date(now);
  todayMorning.setHours(8, 42, 0, 0);

  const yesterdayEvening = new Date(now);
  yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
  yesterdayEvening.setHours(19, 15, 0, 0);

  const yesterdayMorning = new Date(now);
  yesterdayMorning.setDate(yesterdayMorning.getDate() - 1);
  yesterdayMorning.setHours(9, 2, 0, 0);

  return [
    {
      id: 'demo-act-1',
      space_id: 'demo-space',
      actor_id: 'partner-id',
      kind: 'todo_completed',
      payload: { title: 'Confirm train tickets for the weekend' },
      created_at: todayMorning.toISOString(),
    },
    {
      id: 'demo-act-2',
      space_id: 'demo-space',
      actor_id: 'user-id',
      kind: 'todo_created',
      payload: { title: 'Send the venue details' },
      created_at: yesterdayEvening.toISOString(),
    },
    {
      id: 'demo-act-3',
      space_id: 'demo-space',
      actor_id: 'system',
      kind: 'pairing_redeemed',
      payload: {},
      created_at: yesterdayMorning.toISOString(),
    },
  ];
}


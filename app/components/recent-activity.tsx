'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import {
  SpaceActivity,
  formatActivityTimestamp,
  getActivityDotColor,
  getDemoActivities,
} from '../lib/activity-types';

type RecentActivityProps = {
  spaceId?: string;
  userId?: string;
  partnerName?: string;
  initialActivities?: SpaceActivity[];
  isDemo?: boolean;
};

function renderActivityDescription(
  activity: SpaceActivity,
  userId?: string,
  partnerName?: string
) {
  if (activity.kind === 'pairing_redeemed') {
    return (
      <span>
        <strong>Both</strong> connected their shared Space.
      </span>
    );
  }

  const isMe = userId && activity.actor_id === userId;
  const actor = isMe ? 'You' : partnerName || 'Partner';
  const title = activity.payload?.title || 'item';

  switch (activity.kind) {
    case 'todo_completed':
      return (
        <span>
          <strong>{actor}</strong> checked off <em>{title}</em>.
        </span>
      );
    case 'todo_uncompleted':
      return (
        <span>
          <strong>{actor}</strong> reopened <em>{title}</em>.
        </span>
      );
    case 'todo_created':
      return (
        <span>
          <strong>{actor}</strong> added a new todo <em>{title}</em>.
        </span>
      );
    case 'todo_updated':
      return (
        <span>
          <strong>{actor}</strong> updated todo <em>{title}</em>.
        </span>
      );
    case 'todo_deleted':
      return (
        <span>
          <strong>{actor}</strong> removed todo <em>{title}</em>.
        </span>
      );
    case 'calendar_created':
      return (
        <span>
          <strong>{actor}</strong> scheduled plan <em>{title}</em>.
        </span>
      );
    case 'calendar_updated':
      return (
        <span>
          <strong>{actor}</strong> updated plan <em>{title}</em>.
        </span>
      );
    case 'calendar_deleted':
      return (
        <span>
          <strong>{actor}</strong> cancelled plan <em>{title}</em>.
        </span>
      );
    default:
      return (
        <span>
          <strong>{actor}</strong> updated the Space.
        </span>
      );
  }
}

export function RecentActivity({
  spaceId,
  userId,
  partnerName,
  initialActivities,
  isDemo = false,
}: RecentActivityProps) {
  const [activities, setActivities] = useState<SpaceActivity[]>(() => {
    if (isDemo) return getDemoActivities();
    return initialActivities || [];
  });
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Subscribe to real-time additions to the activities table
  useEffect(() => {
    if (isDemo || !spaceId) return;

    const client = getSupabaseBrowserClient();
    const channelName = `realtime:activities:${spaceId}`;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const newRow = payload.new as SpaceActivity;
          if (!newRow?.id) return;
          setActivities((current) => {
            if (current.some((a) => a.id === newRow.id)) return current;
            return [newRow, ...current];
          });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [spaceId, isDemo]);

  const displayedActivities = isHistoryExpanded
    ? activities
    : activities.slice(0, 6);

  return (
    <section
      className="flex flex-col rounded-md border border-line bg-paper p-6 shadow-xs sm:p-8"
      aria-labelledby="activity-heading"
    >
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3.5">
        <div>
          <p className="m-0 mb-1 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
            Recent
          </p>
          <h2
            id="activity-heading"
            className="m-0 font-display text-xl font-normal text-ink"
          >
            Space Activity
          </h2>
        </div>
        {activities.length > 6 && (
          <button
            type="button"
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            className="cursor-pointer text-xs text-muted transition-colors hover:text-ink focus:outline-none"
          >
            {isHistoryExpanded ? 'Show Recent' : `History (${activities.length})`}
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line p-6 text-center">
          <p className="m-0 text-xs font-medium text-ink">
            No activity recorded yet
          </p>
          <p className="m-0 mt-1 text-[11px] text-muted">
            Add a todo or schedule a plan together to see updates here.
          </p>
        </div>
      ) : (
        <ol
          className={`m-0 flex list-none flex-col gap-4 p-0 transition-all duration-300 ${
            isHistoryExpanded ? 'max-h-[380px] overflow-y-auto pr-1' : ''
          }`}
        >
          {displayedActivities.map((activity) => (
            <li
              key={activity.id}
              className="flex items-start gap-3 animate-[rise-in_220ms_cubic-bezier(0.16,1,0.3,1)_both]"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getActivityDotColor(
                  activity.kind
                )}`}
                aria-hidden="true"
              />
              <div className="text-sm leading-relaxed text-ink">
                {renderActivityDescription(activity, userId, partnerName)}
                <small className="mt-0.5 block text-xs text-muted">
                  {formatActivityTimestamp(activity.created_at)}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

import { getSupabaseServerClient } from './supabase/server';
import type { Json } from './supabase/types';

export type RecapTaskItem = {
  id: string;
  title: string;
  tag?: string;
  completed: boolean;
  assigneeName?: string;
  priority?: boolean;
};

export type DailyRecap = {
  summary: string;
  completedCount: number;
  dateLabel: string;
  tasks?: RecapTaskItem[];
};

export function getPHDateInfo(): {
  todayPH: string;
  yesterdayPH: string;
  dateLabel: string;
  startOfTodayPHUtc: string;
} {
  const now = new Date();
  const todayPH = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(now);

  const startOfTodayPH = new Date(`${todayPH}T00:00:00+08:00`);

  const yesterdayPHDate = new Date(
    startOfTodayPH.getTime() - 24 * 60 * 60 * 1000
  );
  const yesterdayPH = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(yesterdayPHDate);

  const dateLabel = yesterdayPHDate.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  });

  return {
    todayPH,
    yesterdayPH,
    dateLabel,
    startOfTodayPHUtc: startOfTodayPH.toISOString(),
  };
}

export function getDemoRecap(
  userName = 'You',
  partnerName = 'Partner'
): DailyRecap {
  const { dateLabel } = getPHDateInfo();
  return {
    summary:
      'Yesterday was steady and well-carried! You checked off dinner reservations and planned the weekend trip, while fresh sourdough was picked up for breakfast.',
    completedCount: 3,
    dateLabel,
    tasks: [
      {
        id: 'demo-1',
        title: 'Pick up fresh sourdough from bakery',
        tag: 'home',
        completed: true,
        assigneeName: partnerName,
      },
      {
        id: 'demo-2',
        title: 'Confirm dinner reservations for 7 PM',
        tag: 'care',
        completed: true,
        assigneeName: userName,
      },
      {
        id: 'demo-3',
        title: 'Plan weekend trip itinerary',
        tag: 'weekend',
        completed: true,
        assigneeName: 'Shared',
      },
      {
        id: 'demo-4',
        title: 'Water the balcony ferns',
        tag: 'home',
        completed: false,
        assigneeName: partnerName,
      },
    ],
  };
}

export async function getDailyRecap({
  spaceId,
  userName,
  partnerName,
  isDemo,
  userId,
}: {
  spaceId?: string;
  userName?: string;
  partnerName?: string;
  isDemo?: boolean;
  userId?: string;
}): Promise<DailyRecap> {
  const { yesterdayPH, dateLabel, startOfTodayPHUtc } = getPHDateInfo();

  if (isDemo || !spaceId) {
    return getDemoRecap(userName, partnerName);
  }

  const supabase = await getSupabaseServerClient();

  // 1. Try reading cached recap from Supabase
  try {
    const { data: cached } = await supabase
      .from('daily_recaps')
      .select('summary, completed_count, tasks')
      .eq('space_id', spaceId)
      .eq('recap_date', yesterdayPH)
      .maybeSingle();

    if (cached?.summary) {
      const parsedTasks = Array.isArray(cached.tasks)
        ? (cached.tasks as unknown as RecapTaskItem[])
        : [];
      return {
        summary: cached.summary,
        completedCount: cached.completed_count,
        dateLabel,
        tasks: parsedTasks,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Unexpected error reading cached daily recap:', message);
  }

  // 2. Midnight Reset: Fetch all tasks from `todos` created before startOfTodayPHUtc (PH time 00:00)
  // These represent yesterday's active or finished tasks. We archive both into the recap!
  let allYesterdayTasks: RecapTaskItem[] = [];
  let completedCount = 0;

  try {
    const { data: oldTodos } = await supabase
      .from('todos')
      .select('*')
      .eq('space_id', spaceId)
      .lt('created_at', startOfTodayPHUtc);

    if (oldTodos && oldTodos.length > 0) {
      allYesterdayTasks = oldTodos.map((t) => {
        const assigneeName = t.assignee_user_id
          ? t.assignee_user_id === userId
            ? userName || 'You'
            : partnerName || 'Partner'
          : 'Shared';

        if (t.completed) completedCount++;

        return {
          id: t.id,
          title: t.title,
          tag: t.tag,
          completed: t.completed,
          assigneeName,
          priority: t.priority,
        };
      });

      // Wipe old tasks from `todos` table so today starts with a clean slate
      await supabase
        .from('todos')
        .delete()
        .eq('space_id', spaceId)
        .lt('created_at', startOfTodayPHUtc);
    }
  } catch (err: unknown) {
    console.warn('Failed to archive and reset yesterday todos:', err);
  }

  // 3. Fallback to completed tasks from activities table if oldTodos had no completed tasks
  if (completedCount === 0 && allYesterdayTasks.length === 0) {
    try {
      const { data: activities } = await supabase
        .from('activities')
        .select('actor_id, payload, created_at')
        .eq('space_id', spaceId)
        .eq('kind', 'todo_completed')
        .lt('created_at', startOfTodayPHUtc);

      if (activities && activities.length > 0) {
        allYesterdayTasks = activities.map((act) => {
          const title = (act.payload as { title?: string })?.title || 'task';
          const actorName = partnerName || 'Partner';
          return {
            id: act.created_at,
            title,
            completed: true,
            assigneeName: actorName,
          };
        });
        completedCount = allYesterdayTasks.length;
      }
    } catch {
      // ignore
    }
  }

  // 4. Clean up daily_recaps older than 2 days
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    await supabase
      .from('daily_recaps')
      .delete()
      .eq('space_id', spaceId)
      .lt('recap_date', twoDaysAgo);
  } catch {
    // ignore
  }

  // 5. Generate summary via DeepSeek if DEEPSEEK_API_KEY is available
  const apiKey = process.env.DEEPSEEK_API_KEY;
  let summary = '';

  const completedList = allYesterdayTasks.filter((t) => t.completed);

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const promptUser =
        completedCount > 0
          ? `Yesterday, the couple completed ${completedCount} tasks: ${completedList
              .map((t) => `"${t.title}"`)
              .join(', ')}. Names: ${userName || 'You'} and ${partnerName || 'Partner'}.`
          : `Yesterday, no tasks were checked off. The couple took a quiet rest day. Names: ${userName || 'You'} and ${partnerName || 'Partner'}.`;

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                "You are a warm, thoughtful companion for a couple's shared digital space called 'ccng'. Write a brief, uplifting 2-sentence recap of what was accomplished yesterday. Be warm, appreciative, grounded, and concise (maximum 2 sentences). Mention partner names naturally. If no tasks were completed, write a gentle 1-sentence note celebrating a quiet rest day.",
            },
            {
              role: 'user',
              content: promptUser,
            },
          ],
          max_tokens: 140,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.warn(
          `DeepSeek API returned HTTP ${res.status}: ${errorText.slice(0, 200)}`
        );
      } else {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          summary = content;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('DeepSeek API request failed or timed out:', message);
    }
  }

  // 6. Default / Fallback summary
  if (!summary) {
    if (completedCount > 0) {
      summary = partnerName
        ? `Yesterday, ${userName || 'you'} and ${partnerName} knocked out ${completedCount} task${completedCount === 1 ? '' : 's'} together. Wonderful work keeping momentum!`
        : `Yesterday you checked off ${completedCount} task${completedCount === 1 ? '' : 's'}. Nice work moving things forward!`;
    } else {
      summary =
        'Yesterday was a quiet, rest day with no tasks checked off. A calm pause before today’s rhythm.';
    }
  }

  // 7. Try saving to daily_recaps cache table with tasks
  try {
    const { error: upsertError } = await supabase.from('daily_recaps').upsert({
      space_id: spaceId,
      recap_date: yesterdayPH,
      summary,
      completed_count: completedCount,
      tasks: allYesterdayTasks as unknown as Json,
    });

    if (upsertError) {
      console.warn('Failed to cache daily recap in Supabase:', upsertError.message);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Unexpected error caching daily recap in Supabase:', message);
  }

  return {
    summary,
    completedCount,
    dateLabel,
    tasks: allYesterdayTasks,
  };
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { DailyEntry } from '../lib/daily-content';
import type { CalendarEvent } from '../lib/calendar-types';
import {
  createTodo,
  updateTodo,
  deleteTodo,
} from '../lib/space-repository';
import { createPairingCodeAction } from '../lib/actions/pairing';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import { TodoItem } from './todo-item';
import { SharedCalendar } from './calendar/shared-calendar';
import { Topbar } from './topbar';
import { WelcomeHeader } from './welcome-header';
import { MantraBanner } from './mantra-banner';
import { NoticeToast } from './notice-toast';
import { PartnerCursor } from './partner-cursor';
import { RecentActivity } from './recent-activity';
import { logBrowserActivity } from '../lib/activity-client';
import type { SpaceActivity } from '../lib/activity-types';

type Todo = {
  id: number | string;
  title: string;
  tag: string;
  assignee: string;
  priority?: boolean;
  completed: boolean;
  isNew?: boolean;
};

type SpaceDashboardProps = {
  spaceId?: string;
  userId?: string;
  partnerId?: string;
  isSolo?: boolean;
  isUser1?: boolean;
  code?: string;
  userEmail?: string;
  userName?: string;
  partnerName?: string;
  initialTodos?: Todo[];
  initialCalendarEvents?: CalendarEvent[];
  hasGoogleCalendar?: boolean;
  isDemo?: boolean;
  dailyEntry?: DailyEntry | null;
  initialActivities?: SpaceActivity[];
};

const demoTodos: Todo[] = [
  {
    id: 1,
    title: 'Pick up the market order',
    tag: 'home',
    assignee: 'Chara',
    priority: true,
    completed: false,
  },
  {
    id: 2,
    title: 'Send the venue details',
    tag: 'weekend',
    assignee: 'Both',
    completed: false,
  },
  {
    id: 3,
    title: 'Water the window herbs',
    tag: 'home',
    assignee: 'Shon',
    completed: true,
  },
  {
    id: 4,
    title: 'Book the dentist appointment',
    tag: 'care',
    assignee: 'Chara',
    completed: false,
  },
];

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function SpaceDashboard({
  spaceId,
  userId,
  partnerId,
  isSolo,
  isUser1,
  code,
  userEmail,
  userName,
  partnerName: initialPartnerName,
  initialTodos: serverTodos,
  initialCalendarEvents,
  hasGoogleCalendar,
  isDemo,
  dailyEntry: initialDailyEntry,
  initialActivities,
}: SpaceDashboardProps = {}) {
  const [todos, setTodos] = useState<Todo[]>(() =>
    isDemo ? demoTodos : (serverTodos ?? [])
  );
  const [notice, setNotice] = useState('');

  const [activeCode, setActiveCode] = useState<string | undefined>(code);
  const [copied, setCopied] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Realtime state
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerCursor, setPartnerCursor] = useState<{
    x: number;
    y: number;
    name?: string;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const [partnerEditingTodoId, setPartnerEditingTodoId] = useState<
    string | number | null
  >(null);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const lastCursorSentRef = useRef<number>(0);
  const hasLoggedBroadcastRef = useRef<boolean>(false);
  const hasLoggedReceiveRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isSolo || !spaceId || activeCode) {
      return;
    }

    let isMounted = true;

    async function setupInitialPairingCode() {
      try {
        const res = await createPairingCodeAction();
        if (isMounted && res.success && res.code) {
          setActiveCode(res.code);
        }
      } catch (err) {
        console.error('Failed to auto-generate pairing code:', err);
      }
    }

    void setupInitialPairingCode();

    return () => {
      isMounted = false;
    };
  }, [isSolo, spaceId, activeCode]);

  async function handleCopyCode() {
    if (!activeCode) return;
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setNotice(`Pairing code ${activeCode} copied.`);
    } catch {
      setNotice(`Pairing code: ${activeCode}`);
    }
  }

  async function handleGenerateNewCode() {
    if (!spaceId) return;
    setIsGeneratingCode(true);
    try {
      const res = await createPairingCodeAction();
      if (res.success && res.code) {
        setActiveCode(res.code);
        setNotice(`New pairing code generated: ${res.code}`);
      } else {
        setNotice(res.error || 'Could not generate new code. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate new code:', err);
      setNotice('Could not generate new code. Please try again.');
    } finally {
      setIsGeneratingCode(false);
    }
  }

  const today = new Date();
  const dailyEntry = initialDailyEntry ?? null;
  const completedTodos = todos.filter((todo) => todo.completed).length;

  const spaceLabel = activeCode
    ? `Space: #${activeCode}`
    : isSolo
      ? 'Your Space (Solo)'
      : 'Our Space';

  const partnerName = isDemo
    ? 'Jon'
    : initialPartnerName || (isSolo ? 'Partner' : 'Partner');

  const displayName = isDemo ? 'Mara' : userName;
  const greeting = getGreeting(today);
  const headerTitle = displayName
    ? `${greeting}, ${displayName}`
    : 'Cool, Calm, and Grounded';

  const presenceText = isDemo
    ? 'Mara & Jon · Demo Mode'
    : isSolo
      ? 'Waiting for partner'
      : partnerOnline
        ? `${partnerName} is here right now`
        : `${partnerName} is away`;

  const loadSpaceTodos = useCallback(async () => {
    if (!spaceId || isDemo) return;
    try {
      const client = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      const { data, error } = await client
        .from('todos')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const effectiveUserId = userId || user?.id;
        setTodos(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            tag: row.tag,
            assignee: row.assignee_user_id
              ? effectiveUserId && row.assignee_user_id === effectiveUserId
                ? displayName || 'User'
                : partnerName || 'Partner'
              : 'Both',
            priority: row.priority,
            completed: row.completed,
          }))
        );
      }
    } catch (err) {
      console.warn('Could not load space todos from database:', err);
    }
  }, [spaceId, isDemo, userId, displayName, partnerName]);

  // Supabase Realtime: Presence, Broadcast (Cursors + Currently Editing), and Postgres Changes (CDC)
  useEffect(() => {
    if (!spaceId || isDemo) return;

    const client = getSupabaseBrowserClient();
    const channelName = `space:${spaceId}`;
    const channel = client.channel(channelName, {
      config: {
        presence: { key: userId || 'anonymous' },
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // Presence: track online status of users in this space
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState<{
        userId: string;
        userName: string;
      }>();
      const presences = Object.values(presenceState).flat();
      const otherUserPresent = presences.some(
        (p) => p.userId && p.userId !== userId
      );
      setPartnerOnline(otherUserPresent);
    });

    let cursorTimeout: ReturnType<typeof setTimeout> | null = null;

    // Broadcast: Live Cursors
    channel.on(
      'broadcast',
      { event: 'cursor' },
      ({
        payload,
      }: {
        payload: {
          contentX?: number;
          x?: number;
          y: number;
          containerWidth?: number;
          senderName?: string;
        };
      }) => {
        if (!hasLoggedReceiveRef.current) {
          console.log(
            `[Realtime] Received partner cursor from "${payload.senderName || partnerName}"`
          );
          hasLoggedReceiveRef.current = true;
        }

        const contentRect =
          contentContainerRef.current?.getBoundingClientRect();
        const mainRect = dashboardRef.current?.getBoundingClientRect();

        let targetX = payload.x ?? 0;
        if (typeof payload.contentX === 'number' && contentRect && mainRect) {
          const myLeft = contentRect.left - mainRect.left;
          const scale =
            payload.containerWidth && payload.containerWidth > 0
              ? contentRect.width / payload.containerWidth
              : 1;
          targetX = Math.round(myLeft + payload.contentX * scale);
        }

        setPartnerCursor({
          x: targetX,
          y: payload.y,
          name: payload.senderName || partnerName,
          visible: true,
        });

        if (cursorTimeout) clearTimeout(cursorTimeout);
        cursorTimeout = setTimeout(() => {
          setPartnerCursor((prev) => ({ ...prev, visible: false }));
        }, 4000);
      }
    );

    channel.on('broadcast', { event: 'cursor_leave' }, () => {
      if (cursorTimeout) clearTimeout(cursorTimeout);
      setPartnerCursor((prev) => ({ ...prev, visible: false }));
    });

    // Broadcast: Currently Editing Todo
    channel.on(
      'broadcast',
      { event: 'editing_todo' },
      ({
        payload,
      }: {
        payload: { todoId: string | number; isEditing: boolean };
      }) => {
        setPartnerEditingTodoId(payload.isEditing ? payload.todoId : null);
      }
    );

    // Broadcast: Instant cross-client todo updates, creates, and deletions
    channel.on(
      'broadcast',
      { event: 'todo_deleted' },
      ({ payload }: { payload: { id: string | number } }) => {
        setTodos((current) => current.filter((t) => t.id !== payload.id));
      }
    );

    channel.on(
      'broadcast',
      { event: 'todo_updated' },
      ({
        payload,
      }: {
        payload: { id: string | number; updated: Partial<Todo> };
      }) => {
        setTodos((current) =>
          current.map((t) =>
            t.id === payload.id ? { ...t, ...payload.updated } : t
          )
        );
      }
    );

    channel.on(
      'broadcast',
      { event: 'todo_created' },
      ({ payload }: { payload: { todo: Todo } }) => {
        setTodos((current) => {
          if (current.some((t) => t.id === payload.todo.id)) return current;
          return [payload.todo, ...current.filter((t) => !t.isNew)];
        });
      }
    );

    // Postgres Changes: Sync database row modifications in real time
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'todos',
      },
      () => {
        void loadSpaceTodos();
      }
    );

    channel.subscribe(async (status) => {
      console.log(`[Realtime:space:${spaceId}] Subscription status:`, status);
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        await channel.track({
          userId: userId || 'anonymous',
          userName: displayName || 'User',
          onlineAt: new Date().toISOString(),
        });
      } else {
        isSubscribedRef.current = false;
      }
    });

    if (typeof window !== 'undefined') {
      (
        window as unknown as {
          __debugCursor?: (x?: number, y?: number) => void;
        }
      ).__debugCursor = (x = 250, y = 250) => {
        console.log('[Realtime Debug] Triggering test cursor at', { x, y });
        const contentRect =
          contentContainerRef.current?.getBoundingClientRect();
        const mainRect = dashboardRef.current?.getBoundingClientRect();
        const myLeft =
          contentRect && mainRect ? contentRect.left - mainRect.left : 0;
        setPartnerCursor({
          x: myLeft + x,
          y,
          name: `${displayName || 'Partner'} (Test)`,
          visible: true,
        });
      };
    }

    return () => {
      if (cursorTimeout) clearTimeout(cursorTimeout);
      if (typeof window !== 'undefined') {
        delete (
          window as unknown as {
            __debugCursor?: unknown;
          }
        ).__debugCursor;
      }
      isSubscribedRef.current = false;
      channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [spaceId, isDemo, userId, displayName, loadSpaceTodos, partnerName]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!channelRef.current || !isSubscribedRef.current || isDemo) return;
    const now = Date.now();
    if (now - lastCursorSentRef.current < 40) return;
    lastCursorSentRef.current = now;

    const mainRect = dashboardRef.current?.getBoundingClientRect();
    const contentRect = contentContainerRef.current?.getBoundingClientRect();
    if (!mainRect || !contentRect) return;

    // Document-relative vertical Y anchored inside <main>
    const y = Math.round(e.clientY - mainRect.top);

    // Container-relative horizontal X anchored to centered content
    const contentX = Math.round(e.clientX - contentRect.left);
    const containerWidth = Math.round(contentRect.width);

    if (!hasLoggedBroadcastRef.current) {
      console.log('[Realtime] Broadcasting mouse positions to space channel.');
      hasLoggedBroadcastRef.current = true;
    }

    void channelRef.current.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        contentX,
        y,
        containerWidth,
        senderName: displayName || userName || 'Partner',
      },
    });
  }

  function handleMouseLeave() {
    if (!channelRef.current || !isSubscribedRef.current || isDemo) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_leave',
      payload: {},
    });
  }

  function handleTodoEditingChange(
    todoId: string | number,
    isEditing: boolean
  ) {
    if (!channelRef.current || !isSubscribedRef.current || isDemo) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'editing_todo',
      payload: { todoId, isEditing },
    });
  }

  async function toggleTodo(id: number | string) {
    const target = todos.find((t) => t.id === id);
    const newCompleted = target ? !target.completed : true;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: newCompleted } : todo
      )
    );
    setNotice(newCompleted ? 'Todo completed.' : 'Todo reopened.');

    if (isSubscribedRef.current && channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'todo_updated',
        payload: { id, updated: { completed: newCompleted } },
      });
    }

    if (!isDemo && spaceId && typeof id === 'string') {
      try {
        await updateTodo(id, {
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        });
        void logBrowserActivity({
          spaceId,
          kind: newCompleted ? 'todo_completed' : 'todo_uncompleted',
          payload: { title: target?.title || 'Todo' },
        });
      } catch (err) {
        console.error('Failed to sync todo status:', err);
      }
    }
  }


  async function handleUpdateTodo(
    id: number | string,
    updated: { title: string; tag: string; assignee: string; priority: boolean }
  ) {
    const isTempId = typeof id === 'number';

    setTodos((current) =>
      current.map((t) => (t.id === id ? { ...t, ...updated, isNew: false } : t))
    );
    setNotice('Todo updated in your shared Space.');

    if (isSubscribedRef.current && channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'todo_updated',
        payload: { id, updated },
      });
    }

    if (!isDemo && spaceId) {
      const currentSpaceId = spaceId;
      try {
        let assigneeUserId: string | null = null;
        if (
          updated.assignee === 'You' ||
          updated.assignee.toLowerCase() === 'you' ||
          (displayName &&
            updated.assignee.toLowerCase() === displayName.toLowerCase())
        ) {
          assigneeUserId = userId || null;
        } else if (
          updated.assignee.toLowerCase() ===
          (partnerName || 'partner').toLowerCase()
        ) {
          assigneeUserId = partnerId || null;
        } else {
          assigneeUserId = null;
        }

        if (isTempId) {
          const created = await createTodo({
            space_id: currentSpaceId,
            title: updated.title,
            tag: updated.tag,
            priority: updated.priority,
            assignee_user_id: assigneeUserId,
          });
          if (created?.id) {
            void logBrowserActivity({
              spaceId: currentSpaceId,
              kind: 'todo_created',
              payload: { title: updated.title, tag: updated.tag },
            });
            setTodos((current) =>
              current.map((t) => (t.id === id ? { ...t, id: created.id } : t))
            );
            if (isSubscribedRef.current && channelRef.current) {
              void channelRef.current.send({
                type: 'broadcast',
                event: 'todo_created',
                payload: {
                  todo: {
                    id: created.id,
                    title: updated.title,
                    tag: updated.tag,
                    assignee: updated.assignee,
                    priority: updated.priority,
                    completed: false,
                  },
                },
              });
            }
          }
        } else {
          await updateTodo(String(id), {
            title: updated.title,
            tag: updated.tag,
            priority: updated.priority,
            assignee_user_id: assigneeUserId,
          });
          void logBrowserActivity({
            spaceId: currentSpaceId,
            kind: 'todo_updated',
            payload: { title: updated.title, tag: updated.tag },
          });
        }
      } catch (err) {
        console.error('Failed to sync todo update:', err);
      }
    }
  }

  async function handleDeleteTodo(id: number | string) {
    const targetToDelete = todos.find((t) => t.id === id);
    setTodos((current) => current.filter((t) => t.id !== id));
    setNotice('Todo removed from your Space.');

    if (isSubscribedRef.current && channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'todo_deleted',
        payload: { id },
      });
    }

    if (!isDemo && spaceId && typeof id === 'string') {
      try {
        await deleteTodo(id);
        void logBrowserActivity({
          spaceId,
          kind: 'todo_deleted',
          payload: { title: targetToDelete?.title || 'Todo' },
        });
      } catch (err) {
        console.error('Failed to delete todo:', err);
      }
    }
  }

  function addTodo() {
    if (todos.some((t) => t.isNew)) return;

    const newId = Date.now();
    setTodos((current) => [
      {
        id: newId,
        title: '',
        tag: 'home',
        assignee: displayName || 'User',
        priority: false,
        completed: false,
        isNew: true,
      },
      ...current,
    ]);
  }

  const isViewerUser1 = isUser1 ?? true;

  const column1Name = isViewerUser1
    ? displayName || 'User'
    : partnerName || 'Partner';
  const column2Name = isViewerUser1
    ? partnerName || 'Partner'
    : displayName || 'User';
  const isColumn1Viewer = isViewerUser1;
  const isColumn2Viewer = !isViewerUser1;

  const column1Todos = todos.filter((t) => {
    if (t.isNew && isColumn1Viewer) return true;
    if (t.assignee === 'Both') return true;
    if (column1Name && t.assignee.toLowerCase() === column1Name.toLowerCase())
      return true;
    if (
      isColumn1Viewer &&
      (t.assignee === 'You' || t.assignee.toLowerCase() === 'you')
    )
      return true;
    return false;
  });

  const column2Todos = todos.filter((t) => {
    if (t.isNew && isColumn2Viewer) return true;
    if (t.assignee === 'Both') return true;
    if (column2Name && t.assignee.toLowerCase() === column2Name.toLowerCase())
      return true;
    if (
      isColumn2Viewer &&
      (t.assignee === 'You' || t.assignee.toLowerCase() === 'you')
    )
      return true;
    return false;
  });

  return (
    <main
      ref={dashboardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-x-hidden bg-linen text-ink"
    >
      <PartnerCursor
        x={partnerCursor.x}
        y={partnerCursor.y}
        name={partnerCursor.name || partnerName}
        visible={partnerCursor.visible && !isDemo}
      />
      <Topbar
        spaceLabel={spaceLabel}
        userEmail={userEmail}
        isDemo={isDemo}
        activeCode={activeCode}
        homeLink="/space"
      />

      <div
        ref={contentContainerRef}
        className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 md:px-12 md:py-16"
      >
        <WelcomeHeader
          title={headerTitle}
          presenceText={presenceText}
          isPending={isSolo}
          isOnline={isSolo ? undefined : partnerOnline}
          date={today}
          rightSlot={
            isSolo && activeCode ? (
              <div className="flex flex-col items-start gap-1.5 self-start md:items-end md:self-end">
                <span className="text-[11px] font-medium tracking-wide text-sage-dark">
                  Invite partner
                </span>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2.5 rounded-md border border-line bg-paper p-1 pl-3 shadow-xs">
                    <span className="font-mono text-xs font-semibold tracking-widest text-ink uppercase">
                      {activeCode}
                    </span>
                    <button
                      type="button"
                      className="cursor-pointer rounded bg-sage-dark px-2.5 py-1 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[#395241]"
                      onClick={handleCopyCode}
                      aria-label="Copy pairing code"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="cursor-pointer rounded-md border border-line bg-paper p-1.5 text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-wait disabled:opacity-50"
                    onClick={handleGenerateNewCode}
                    disabled={isGeneratingCode}
                    title="Generate fresh code"
                    aria-label="Generate fresh pairing code"
                  >
                    <svg
                      className={`h-4 w-4 ${isGeneratingCode ? 'animate-spin' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : undefined
          }
        />

        {dailyEntry && (
          <MantraBanner
            mantra={dailyEntry.mantra}
            source={dailyEntry.source}
            date={today}
          />
        )}

        {/* Expanded Todo Section */}
        <section
          className="my-8 flex flex-col rounded-md border border-line bg-paper p-6 shadow-xs sm:p-8"
          aria-labelledby="todos-heading"
        >
          <div className="flex items-center justify-between pb-0">
            <div>
              <p className="m-0 mb-1 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
                In the Space
              </p>
              <h2
                id="todos-heading"
                className="m-0 font-display text-2xl font-normal text-ink"
              >
                Todos
              </h2>
            </div>
            <button
              type="button"
              onClick={() => addTodo()}
              className="cursor-pointer text-xs font-semibold tracking-wide text-sage-dark transition-colors hover:text-ink"
            >
              + New Todo
            </button>
          </div>

          <div
            className="my-3.5 h-1 w-full overflow-hidden rounded-full bg-paper-soft"
            role="progressbar"
            aria-label={`${completedTodos} of ${todos.length} Todos complete`}
          >
            <div
              className="h-full bg-sage transition-all duration-300"
              style={{
                width: `${todos.length > 0 ? (completedTodos / todos.length) * 100 : 0}%`,
              }}
            />
          </div>

          <p className="m-0 mb-4 text-xs text-muted">
            <strong className="font-semibold text-ink">{completedTodos}</strong>{' '}
            of {todos.length} Todos complete
          </p>

          <div className="grid grid-cols-1 divide-y divide-line pt-2 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Column 1 (User 1 - Space Creator) */}
            <div className="pb-6 md:pr-6 md:pb-0">
              <div className="mb-1 flex items-center justify-between border-b border-line/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-medium text-ink">
                    {column1Name}
                  </span>
                  {isColumn1Viewer && (
                    <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sage-dark">
                      You
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {column1Todos.filter((t) => t.completed).length} /{' '}
                  {column1Todos.length}
                </span>
              </div>
              {column1Todos.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted italic">
                  No todos for {column1Name} yet
                </p>
              ) : (
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {column1Todos.map((todo) => (
                    <TodoItem
                      key={`col1-${todo.id}`}
                      todo={todo}
                      initialEditing={todo.isNew}
                      partnerName={partnerName}
                      userName={displayName || 'User'}
                      isPartnerEditing={partnerEditingTodoId === todo.id}
                      editingPartnerName={partnerName}
                      onEditingChange={(editing) =>
                        handleTodoEditingChange(todo.id, editing)
                      }
                      onToggle={() => toggleTodo(todo.id)}
                      onSave={(updated) => handleUpdateTodo(todo.id, updated)}
                      onDelete={() => handleDeleteTodo(todo.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Column 2 (User 2 - Partner) */}
            <div className="pt-6 md:pt-0 md:pl-6">
              <div className="mb-1 flex items-center justify-between border-b border-line/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-medium text-ink">
                    {column2Name}
                  </span>
                  {isColumn2Viewer && (
                    <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sage-dark">
                      You
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {column2Todos.filter((t) => t.completed).length} /{' '}
                  {column2Todos.length}
                </span>
              </div>
              {column2Todos.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted italic">
                  No todos for {column2Name} yet
                </p>
              ) : (
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {column2Todos.map((todo) => (
                    <TodoItem
                      key={`col2-${todo.id}`}
                      todo={todo}
                      initialEditing={todo.isNew}
                      partnerName={partnerName}
                      userName={displayName || 'User'}
                      isPartnerEditing={partnerEditingTodoId === todo.id}
                      editingPartnerName={partnerName}
                      onEditingChange={(editing) =>
                        handleTodoEditingChange(todo.id, editing)
                      }
                      onToggle={() => toggleTodo(todo.id)}
                      onSave={(updated) => handleUpdateTodo(todo.id, updated)}
                      onDelete={() => handleDeleteTodo(todo.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Shared Calendar */}
        <SharedCalendar
          spaceId={spaceId}
          initialEvents={initialCalendarEvents}
          hasGoogleCalendar={hasGoogleCalendar}
          isDemo={isDemo}
        />

        {/* Lower Grid: Activity & Pairing summary */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <RecentActivity
            spaceId={spaceId}
            userId={userId}
            partnerName={partnerName}
            initialActivities={initialActivities}
            isDemo={isDemo}
          />

          <aside
            className="relative flex flex-col justify-between overflow-hidden rounded-md border border-line bg-paper p-6 shadow-xs sm:p-8"
            aria-labelledby="pairing-title"
          >
            <div>
              <p className="m-0 mb-1 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
                Connected Space
              </p>
              <h2
                id="pairing-title"
                className="m-0 mb-2 font-display text-2xl font-normal text-ink"
              >
                Just the two of you.
              </h2>
              <p className="m-0 text-sm leading-relaxed text-muted">
                Link accounts with your partner to share a calm, synchronized
                Space.
              </p>
            </div>

            <div className="my-6 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-paper-soft font-display text-sm font-semibold text-sage-dark">
                M
              </span>
              <span className="w-4 border-t border-dashed border-stone" />
              <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-paper-soft font-display text-sm font-semibold text-sage-dark">
                J
              </span>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-muted">Pairing Code</span>
              <strong className="font-mono text-sm tracking-wider text-ink">
                {activeCode || code || 'CCNG-PAIR'}
              </strong>
            </div>
          </aside>
        </div>
      </div>

      <NoticeToast message={notice} onDismiss={() => setNotice('')} />
    </main>
  );
}

'use client';

import { useState } from 'react';
import type { DailyEntry } from '../lib/daily-content';
import { signInWithGoogle } from '../lib/auth';
import { DailyTodo } from './daily-todo';
import { SharedCalendar } from './calendar/shared-calendar';
import { GoogleOneTap } from './google-one-tap';
import { Header } from './header';
import { WelcomeHero } from './welcome-hero';
import { DailyQuotes } from './daily-quotes';
import { PostItNote } from './post-it-note';
import { NoticeToast } from './notice-toast';
import { RecentActivity } from './recent-activity';
import { SpaceRecap } from './space-recap';
import { SpaceSettings } from './space-settings';

type Todo = {
  id: number;
  title: string;
  tag: string;
  assignee: string;
  priority?: boolean;
  completed: boolean;
  isNew?: boolean;
};

const initialTodos: Todo[] = [
  {
    id: 1,
    title: 'Pick up the market order',
    tag: 'home',
    assignee: 'Mara',
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
    assignee: 'Jon',
    completed: true,
  },
  {
    id: 4,
    title: 'Book the dentist appointment',
    tag: 'care',
    assignee: 'Mara',
    completed: false,
  },
];

const demoYesterdayTasks = [
  { id: 'dy-1', title: 'Pick up fresh sourdough from bakery', tag: 'home', completed: true, assigneeName: 'Jon' },
  { id: 'dy-2', title: 'Confirm dinner reservations for 7 PM', tag: 'care', completed: true, assigneeName: 'Mara' },
  { id: 'dy-3', title: 'Plan weekend trip itinerary', tag: 'weekend', completed: true, assigneeName: 'Shared' },
  { id: 'dy-4', title: 'Water the balcony ferns', tag: 'home', completed: false, assigneeName: 'Jon' },
];

type HomeContentProps = {
  dailyEntry?: DailyEntry | null;
};

export function HomeContent({ dailyEntry: initialDailyEntry }: HomeContentProps = {}) {
  const [todos, setTodos] = useState(initialTodos);
  const [notice, setNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const demoDateLabel = yesterday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const dailyEntry = initialDailyEntry ?? null;
  const completedTodos = todos.filter((todo) => todo.completed).length;

  const userName = 'Mara';
  const partnerName = 'Jon';
  const userTodos = todos.filter(
    (t) => t.isNew || t.assignee === 'Both' || t.assignee.toLowerCase() !== partnerName.toLowerCase()
  );
  const partnerTodos = todos.filter(
    (t) => !t.isNew && (t.assignee.toLowerCase() === partnerName.toLowerCase() || t.assignee === 'Both')
  );

  async function handleGoogleLogin() {
    try {
      setAuthLoading(true);
      setAuthError('');
      await signInWithGoogle();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to start Google sign in. Check Supabase credentials or use Demo mode.';
      setAuthError(message);
      setAuthLoading(false);
    }
  }


  function toggleTodo(id: number) {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
    setNotice('Todo updated in preview.');
  }

  function handleUpdateTodo(
    id: number,
    updated: { title: string; tag: string; assignee: string; priority: boolean }
  ) {
    setTodos((current) =>
      current.map((t) =>
        t.id === id ? { ...t, ...updated, isNew: false } : t
      )
    );
    setNotice('Todo updated in preview.');
  }

  function handleDeleteTodo(id: number) {
    setTodos((current) => current.filter((t) => t.id !== id));
    setNotice('Todo removed from preview.');
  }

  function addTodo() {
    if (todos.some((t) => t.isNew)) return;
    const newId = Date.now();
    setTodos((current) => [
      {
        id: newId,
        title: '',
        tag: 'home',
        assignee: userName,
        priority: false,
        completed: false,
        isNew: true,
      },
      ...current,
    ]);
  }

  return (
    <main className="min-h-screen bg-linen text-ink">
      <GoogleOneTap />

      <Header
        spaceLabel="Previewing Space"
        isGuest={true}
        onGoogleSignIn={handleGoogleLogin}
        authLoading={authLoading}
        authError={authError}
        homeLink="/"
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 md:px-12 md:py-16">
        <WelcomeHero
          presenceText="Preview Mode · Sign in above"
          date={today}
        />

        <div className="my-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          {dailyEntry && (
            <DailyQuotes
              mantra={dailyEntry.mantra}
              source={dailyEntry.source}
              date={today}
              className="h-full"
            />
          )}

          <PostItNote
            userName="Shon"
            partnerName="Chara"
            initialContent="Don't forget we have dinner reservations at 7! Can't wait ✨"
            initialAuthorId="demo-partner"
            initialUpdatedAt={new Date().toISOString()}
            isDemo={true}
            className="h-full"
          />
        </div>

        {/* Expanded Todo Section */}
        <section
          className="my-8 flex flex-col rounded-md border border-line bg-paper p-6 shadow-xs sm:p-8"
          aria-labelledby="todos-heading"
        >
          <div className="flex items-center justify-between border-b border-line pb-3.5">
            <div>
              <p className="m-0 mb-1 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
                In the Space
              </p>
              <h2 id="todos-heading" className="m-0 font-display text-2xl font-normal text-ink">
                Todos
              </h2>
            </div>
            <button
              type="button"
              onClick={addTodo}
              className="text-xs font-semibold tracking-wide text-sage-dark transition-colors hover:text-ink cursor-pointer"
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
              style={{ width: `${todos.length > 0 ? (completedTodos / todos.length) * 100 : 0}%` }}
            />
          </div>

          <p className="m-0 mb-4 text-xs text-muted">
            <strong className="font-semibold text-ink">{completedTodos}</strong> of{' '}
            {todos.length} Todos complete
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line pt-2">
            {/* Left Column: User */}
            <div className="pb-6 md:pb-0 md:pr-6">
              <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-line/60">
                <span className="font-display text-base font-medium text-ink">{userName}</span>
                <span className="text-xs text-muted">
                  {userTodos.filter((t) => t.completed).length} / {userTodos.length}
                </span>
              </div>
              {userTodos.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted italic">No todos for {userName} yet</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {userTodos.map((todo) => (
                    <DailyTodo
                      key={`user-${todo.id}`}
                      todo={todo}
                      initialEditing={todo.isNew}
                      partnerName={partnerName}
                      userName={userName}
                      onToggle={() => toggleTodo(todo.id)}
                      onSave={(updated) => handleUpdateTodo(todo.id, updated)}
                      onDelete={() => handleDeleteTodo(todo.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Right Column: Partner */}
            <div className="pt-6 md:pt-0 md:pl-6">
              <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-line/60">
                <span className="font-display text-base font-medium text-ink">{partnerName}</span>
                <span className="text-xs text-muted">
                  {partnerTodos.filter((t) => t.completed).length} / {partnerTodos.length}
                </span>
              </div>
              {partnerTodos.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted italic">
                  No todos for {partnerName} yet
                </p>
              ) : (
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {partnerTodos.map((todo) => (
                    <DailyTodo
                      key={`partner-${todo.id}`}
                      todo={todo}
                      initialEditing={todo.isNew}
                      partnerName={partnerName}
                      userName="You"
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
        <SharedCalendar isDemo={true} />

        {/* Lower Grid: Activity & Pairing summary */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentActivity isDemo={true} />

          <div className="flex flex-col gap-6">
            <SpaceRecap
              summary="Yesterday was steady and well-carried! You checked off dinner reservations and planned the weekend trip, while Jon picked up fresh sourdough and scheduled the vet visit."
              completedCount={3}
              dateLabel={demoDateLabel}
              userName={userName}
              partnerName={partnerName}
              isSolo={false}
              tasks={demoYesterdayTasks}
            />

            <SpaceSettings
              userName={userName}
              partnerName={partnerName}
              pairingCode="CCNG-DEMO"
              hasGoogleCalendar={false}
              isDemo={true}
            />
          </div>
        </div>
      </div>

      <NoticeToast message={notice} onDismiss={() => setNotice('')} />
    </main>
  );
}

'use client';

import { useState } from 'react';
import type { DailyEntry } from '../lib/daily-content';
import { signInWithGoogle, signInAsDemo } from '../lib/auth';
import { TodoItem } from './todo-item';
import { SharedCalendar } from './calendar/shared-calendar';
import { GoogleOneTap } from './google-one-tap';
import { Topbar } from './topbar';
import { WelcomeHeader } from './welcome-header';
import { MantraBanner } from './mantra-banner';
import { NoticeToast } from './notice-toast';
import { RecentActivity } from './recent-activity';

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

type HomeContentProps = {
  dailyEntry?: DailyEntry | null;
};

export function HomeContent({ dailyEntry: initialDailyEntry }: HomeContentProps = {}) {
  const [todos, setTodos] = useState(initialTodos);
  const [notice, setNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const today = new Date();
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

  function handleDemoLogin() {
    signInAsDemo();
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

      <Topbar
        spaceLabel="Previewing Space"
        isGuest={true}
        onGoogleSignIn={handleGoogleLogin}
        onDemoSignIn={handleDemoLogin}
        authLoading={authLoading}
        authError={authError}
        homeLink="/"
      />

      <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 py-10 md:py-16">
        <WelcomeHeader
          presenceText="Preview Mode · Sign in above"
          date={today}
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
                    <TodoItem
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
                    <TodoItem
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
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
          <RecentActivity isDemo={true} />

          <aside
            className="relative flex flex-col justify-between p-6 sm:p-8 rounded-md border border-line bg-paper shadow-xs overflow-hidden"
            aria-labelledby="pairing-title"
          >
            <div>
              <p className="m-0 mb-1 text-sage-dark text-[10px] font-bold uppercase tracking-widest leading-tight">
                Connected Space
              </p>
              <h2 id="pairing-title" className="m-0 mb-2 text-ink font-display text-2xl font-normal">
                Just the two of you.
              </h2>
              <p className="m-0 text-muted text-sm leading-relaxed">
                Link accounts with your partner to share a calm, synchronized Space.
              </p>
            </div>

            <div className="flex items-center gap-3 my-6">
              <span className="grid place-items-center w-9 h-9 rounded-full border border-line bg-paper-soft text-sage-dark font-display font-semibold text-sm">
                M
              </span>
              <span className="w-4 border-t border-dashed border-stone" />
              <span className="grid place-items-center w-9 h-9 rounded-full border border-line bg-paper-soft text-sage-dark font-display font-semibold text-sm">
                J
              </span>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-line">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded border border-sage-dark bg-sage-dark text-white text-xs font-semibold hover:bg-[#395241] transition-all"
                onClick={handleGoogleLogin}
                disabled={authLoading}
              >
                {authLoading ? 'Connecting...' : 'Sign in to pair'}
              </button>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Pairing Code</span>
                <strong className="text-ink font-mono tracking-wider">CCNG-DEMO</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <NoticeToast message={notice} onDismiss={() => setNotice('')} />
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { RecapTaskItem } from '../lib/recap';

type SpaceRecapProps = {
  summary: string;
  completedCount: number;
  dateLabel: string;
  userName?: string;
  partnerName?: string;
  isSolo?: boolean;
  pairingCode?: string;
  onCopyPairingCode?: () => void;
  isCopied?: boolean;
  className?: string;
  tasks?: RecapTaskItem[];
};

export function SpaceRecap({
  summary,
  completedCount,
  dateLabel,
  userName = 'You',
  partnerName,
  isSolo = false,
  pairingCode,
  onCopyPairingCode,
  isCopied = false,
  className = '',
  tasks = [],
}: SpaceRecapProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const completedTasks = tasks.filter((t) => t.completed);
  const unfinishedTasks = tasks.filter((t) => !t.completed);

  const userColName = userName || 'You';
  const partnerColName = partnerName || 'Partner';

  const userTasks = tasks.filter((t) => {
    if (isSolo) return true;
    if (!t.assigneeName) return true;
    const lower = t.assigneeName.toLowerCase();
    if (lower === 'both' || lower === 'shared') return true;
    if (lower === 'you' || lower === userColName.toLowerCase()) return true;
    return false;
  });

  const partnerTasks = tasks.filter((t) => {
    if (isSolo) return false;
    if (!t.assigneeName) return true;
    const lower = t.assigneeName.toLowerCase();
    if (lower === 'both' || lower === 'shared') return true;
    if (partnerColName && lower === partnerColName.toLowerCase()) return true;
    if (lower === 'partner') return true;
    return false;
  });

  const completionPercentage =
    tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

  return (
    <>
      <section
        className={`relative flex flex-col justify-between overflow-hidden rounded-md border border-line bg-paper p-5 shadow-xs sm:p-6 ${className}`}
        aria-labelledby="recap-heading"
      >
        <div>
          <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2.5">
            <div>
              <p className="m-0 mb-0.5 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
                AI Generated
              </p>
              <h2
                id="recap-heading"
                className="m-0 font-display text-lg font-normal text-ink"
              >
                Yesterday&apos;s Recap
              </h2>
            </div>
            {dateLabel && (
              <span className="text-[11px] font-medium tracking-wide text-muted">
                {dateLabel}
              </span>
            )}
          </div>

          <p className="m-0 font-display text-xs leading-relaxed text-ink/90 sm:text-sm">
            {summary}
          </p>
        </div>

        <div className="mt-3.5 flex items-center justify-between border-t border-line pt-2.5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                completedCount > 0 ? 'bg-sage-dark' : 'bg-stone/50'
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px]">
              {completedCount} {completedCount === 1 ? 'task' : 'tasks'}{' '}
              completed
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="group inline-flex cursor-pointer items-center gap-0.5 text-xs font-medium text-sage-dark transition-colors hover:text-ink focus:outline-none"
          >
            <span>View Recap</span>
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              className=""
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Technical Space Recap Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="space-recap-modal-title"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border border-line bg-paper p-5 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-line pb-3.5">
              <div>
                <p className="m-0 mb-0.5 text-[10px] leading-tight font-bold tracking-widest text-sage-dark uppercase">
                  Archive Log · {dateLabel}
                </p>
                <h3
                  id="space-recap-modal-title"
                  className="m-0 font-display text-xl font-normal text-ink"
                >
                  Yesterday&apos;s Space Log
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="-mt-1 -mr-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:text-ink focus:outline-none"
                aria-label="Close modal"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
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

            {/* Technical Progress & Metrics Bar */}
            <div className="mt-4 border-b border-line pb-3.5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <div>
                  <strong className="font-semibold text-ink">
                    {completedTasks.length}
                  </strong>{' '}
                  of {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}{' '}
                  completed{' '}
                  <span className="text-[11px] text-muted">
                    ({completionPercentage}%)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-sage-dark">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage-dark" />
                    {completedTasks.length} Completed
                  </span>
                  <span className="flex items-center gap-1.5 text-clay">
                    <span className="h-1.5 w-1.5 rounded-full bg-clay/60" />
                    {unfinishedTasks.length} Unfinished
                  </span>
                </div>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-paper-soft"
                role="progressbar"
                aria-label={`${completedTasks.length} of ${tasks.length} tasks completed`}
              >
                <div
                  className="h-full bg-sage transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Left and Right Columns (Similar layout to Todo Section) */}
            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
                {/* Column 1 (User / You) */}
                <div className="pb-6 md:pr-6 md:pb-0">
                  <div className="mb-2 flex items-center justify-between border-b border-line/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-medium text-ink">
                        {userColName}
                      </span>
                      <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sage-dark">
                        You
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {userTasks.filter((t) => t.completed).length} /{' '}
                      {userTasks.length}
                    </span>
                  </div>

                  {userTasks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted italic">
                      No tasks recorded for {userColName}
                    </p>
                  ) : (
                    <ul className="m-0 list-none divide-y divide-line/60 p-0">
                      {userTasks.map((task) => (
                        <li
                          key={`user-${task.id}`}
                          className="flex items-start justify-between gap-3 py-2 text-xs"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            {task.completed ? (
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-dark text-paper">
                                <svg
                                  viewBox="0 0 12 12"
                                  className="h-2.5 w-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <polyline points="2.5 6 4.8 8.5 9.5 3.5" />
                                </svg>
                              </span>
                            ) : (
                              <span
                                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-line bg-paper-soft"
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0">
                              <span
                                className={`block text-xs leading-5 [overflow-wrap:anywhere] break-words ${
                                  task.completed
                                    ? 'text-muted line-through decoration-[#b7c2b8]'
                                    : 'font-medium text-ink'
                                }`}
                              >
                                {task.title}
                              </span>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                                {task.priority && (
                                  <span className="inline-flex items-center gap-0.5 font-semibold text-clay">
                                    ★ Priority
                                  </span>
                                )}
                                {task.tag && (
                                  <span className="text-clay">#{task.tag}</span>
                                )}
                                {(task.assigneeName === 'Shared' ||
                                  task.assigneeName === 'Both') && (
                                  <span className="inline-flex items-center gap-1 font-medium text-sage-dark">
                                    <span className="h-1 w-1 rounded-full bg-sage" />
                                    Shared
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Column 2 (Partner) */}
                <div className="pt-6 md:pt-0 md:pl-6">
                  <div className="mb-2 flex items-center justify-between border-b border-line/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-medium text-ink">
                        {partnerColName}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {partnerTasks.filter((t) => t.completed).length} /{' '}
                      {partnerTasks.length}
                    </span>
                  </div>

                  {isSolo ? (
                    <p className="py-8 text-center text-xs text-muted italic">
                      Waiting for partner · No tasks recorded
                    </p>
                  ) : partnerTasks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted italic">
                      No tasks recorded for {partnerColName}
                    </p>
                  ) : (
                    <ul className="m-0 list-none divide-y divide-line/60 p-0">
                      {partnerTasks.map((task) => (
                        <li
                          key={`partner-${task.id}`}
                          className="flex items-start justify-between gap-3 py-2 text-xs"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            {task.completed ? (
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-dark text-paper">
                                <svg
                                  viewBox="0 0 12 12"
                                  className="h-2.5 w-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <polyline points="2.5 6 4.8 8.5 9.5 3.5" />
                                </svg>
                              </span>
                            ) : (
                              <span
                                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-line bg-paper-soft"
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0">
                              <span
                                className={`block text-xs leading-5 [overflow-wrap:anywhere] break-words ${
                                  task.completed
                                    ? 'text-muted line-through decoration-[#b7c2b8]'
                                    : 'font-medium text-ink'
                                }`}
                              >
                                {task.title}
                              </span>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                                {task.priority && (
                                  <span className="inline-flex items-center gap-0.5 font-semibold text-clay">
                                    ★ Priority
                                  </span>
                                )}
                                {task.tag && (
                                  <span className="text-clay">#{task.tag}</span>
                                )}
                                {(task.assigneeName === 'Shared' ||
                                  task.assigneeName === 'Both') && (
                                  <span className="inline-flex items-center gap-1 font-medium text-sage-dark">
                                    <span className="h-1 w-1 rounded-full bg-sage" />
                                    Shared
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[10px] text-muted">
                Archived at 00:00 · Cleared after 24h
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded bg-ink px-3 py-1.5 text-xs font-semibold text-paper shadow-2xs transition-opacity hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

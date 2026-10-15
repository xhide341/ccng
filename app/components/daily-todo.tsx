'use client';

import { useState, useRef, useEffect } from 'react';

export type TodoData = {
  id?: string | number;
  title: string;
  tag: string;
  assignee: string;
  priority?: boolean;
  completed: boolean;
};

export type DailyTodoProps = {
  todo?: TodoData;
  title?: string;
  tag?: string;
  assignee?: string;
  priority?: boolean;
  completed?: boolean;
  onToggle: () => void;
  onSave?: (updated: {
    title: string;
    tag: string;
    assignee: string;
    priority: boolean;
  }) => void;
  onDelete?: () => void;
  partnerName?: string;
  userName?: string;
  initialEditing?: boolean;
  isPartnerEditing?: boolean;
  editingPartnerName?: string;
  onEditingChange?: (isEditing: boolean) => void;
};

export function DailyTodo(props: DailyTodoProps) {
  const title = props.todo ? props.todo.title : (props.title ?? '');
  const tag = props.todo ? props.todo.tag : (props.tag ?? '');
  const assignee = props.todo ? props.todo.assignee : (props.assignee ?? '');
  const priority = props.todo
    ? (props.todo.priority ?? false)
    : (props.priority ?? false);
  const completed = props.todo
    ? props.todo.completed
    : (props.completed ?? false);
  const {
    onToggle,
    onSave,
    onDelete,
    partnerName = 'Partner',
    userName = 'You',
    isPartnerEditing = false,
    editingPartnerName,
    onEditingChange,
  } = props;

  const [isEditingTitle, setIsEditingTitle] = useState(
    Boolean(props.initialEditing)
  );
  const [draftTitle, setDraftTitle] = useState(title);

  const [isEditingTag, setIsEditingTag] = useState(false);
  const [draftTag, setDraftTag] = useState(tag);

  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingTag) {
      tagInputRef.current?.focus();
      tagInputRef.current?.select();
    }
  }, [isEditingTag]);

  useEffect(() => {
    onEditingChange?.(isEditingTitle || isEditingTag);
  }, [isEditingTitle, isEditingTag, onEditingChange]);

  useEffect(() => {
    if (!isAssigneeOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAssigneeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAssigneeOpen]);

  function handleSaveTitle() {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      if (!title && onDelete) {
        onDelete();
        return;
      }
      setDraftTitle(title);
      setIsEditingTitle(false);
      return;
    }

    if (trimmed !== title && onSave) {
      onSave({
        title: trimmed,
        tag,
        assignee,
        priority,
      });
    }
    setIsEditingTitle(false);
  }

  function handleCancelTitle() {
    if (!title && onDelete) {
      onDelete();
      return;
    }
    setDraftTitle(title);
    setIsEditingTitle(false);
  }

  function handleSaveTag() {
    const cleanTag = draftTag.trim().replace(/^#/, '');
    const finalTag = cleanTag || tag || 'home';
    if (finalTag !== tag && onSave) {
      onSave({
        title,
        tag: finalTag,
        assignee,
        priority,
      });
    }
    setDraftTag(finalTag);
    setIsEditingTag(false);
  }

  function handleSelectAssignee(newAssignee: string) {
    setIsAssigneeOpen(false);
    if (newAssignee !== assignee && onSave) {
      onSave({
        title,
        tag,
        assignee: newAssignee,
        priority,
      });
    }
  }

  return (
    <li
      className={`group -mx-2 flex items-start gap-3 rounded-md border-b border-line px-2 py-3 transition-all last:border-b-0 ${
        isPartnerEditing ? 'bg-sage-dark/[0.04] ring-1 ring-sage/50' : ''
      } ${completed ? 'opacity-65' : ''}`}
    >
      {/* Checkbox button */}
      <button
        aria-label={`${completed ? 'Reopen' : 'Complete'} ${title || 'todo'}`}
        className={`mt-0.5 grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border transition-all ${
          completed
            ? 'border-sage bg-sage'
            : 'border-[#b8c4b9] bg-transparent hover:scale-105 hover:border-sage-dark'
        }`}
        onClick={onToggle}
        type="button"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            completed ? 'bg-paper' : 'bg-transparent'
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title: inline input if editing, else clickable text */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveTitle();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelTitle();
              }
            }}
            placeholder="What needs to be carried?"
            className="-mx-1 block w-full rounded border border-line/60 bg-paper px-1 py-0.5 text-sm leading-5 text-ink outline-none"
            aria-label="Todo title"
          />
        ) : (
          <span
            onClick={() => {
              if (onSave) {
                setDraftTitle(title);
                setIsEditingTitle(true);
              }
            }}
            className={`-mx-1 block cursor-text rounded border border-transparent px-1 py-0.5 text-sm leading-5 break-words [overflow-wrap:anywhere] transition-colors ${
              completed
                ? 'text-muted line-through decoration-[#b7c2b8]'
                : 'text-ink'
            }`}
            title="Click to edit title"
          >
            {title || <span className="text-muted italic">Untitled todo</span>}
          </span>
        )}

        {/* Sub-row: Tag & Assignee */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {/* Tag: inline input or clickable hashtag */}
          {isEditingTag ? (
            <div className="-mx-1 inline-flex items-center rounded border border-line/60 bg-paper px-1 py-0.5 text-xs focus-within:border-sage">
              <span className="text-clay">#</span>
              <input
                ref={tagInputRef}
                type="text"
                value={draftTag}
                onChange={(e) => setDraftTag(e.target.value)}
                onBlur={handleSaveTag}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveTag();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setDraftTag(tag);
                    setIsEditingTag(false);
                  }
                }}
                className="w-16 bg-transparent p-0 text-xs text-ink outline-none"
                placeholder="tag"
                aria-label="Todo tag"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onSave) {
                  setDraftTag(tag);
                  setIsEditingTag(true);
                }
              }}
              className="-mx-1 inline-flex cursor-pointer items-center rounded border border-transparent px-1 py-0.5 text-xs text-clay transition-colors hover:bg-paper-soft hover:underline"
              title="Click to edit hashtag"
            >
              #{tag || 'home'}
            </button>
          )}

          <span>·</span>

          {/* Assignee Mini Dropdown */}
          <div className="relative inline-block" ref={assigneeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAssigneeOpen((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-paper-soft hover:text-ink"
              title="Click to change assignee"
              aria-haspopup="true"
              aria-expanded={isAssigneeOpen}
            >
              {assignee === 'Both' ? (
                <span className="inline-flex items-center gap-1 font-medium text-sage-dark">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-sage"
                    aria-hidden="true"
                  />
                  Shared
                </span>
              ) : (
                <span>
                  {assignee === 'You' ? userName : assignee || userName}
                </span>
              )}
              <span className="text-[9px] text-muted/70">▾</span>
            </button>

            {isAssigneeOpen && (
              <div
                role="menu"
                className="absolute top-full left-0 z-30 mt-1 min-w-[120px] rounded-md border border-line bg-paper py-1 shadow-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectAssignee(userName)}
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-paper-soft ${
                    assignee === 'You' ||
                    assignee.toLowerCase() === userName.toLowerCase()
                       ? 'font-semibold text-sage-dark'
                      : 'text-ink'
                  }`}
                >
                  <span>{userName}</span>
                  {(assignee === 'You' ||
                    assignee.toLowerCase() === userName.toLowerCase()) && (
                    <span className="text-[10px] text-sage-dark">✓</span>
                  )}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectAssignee(partnerName)}
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-paper-soft ${
                    assignee === partnerName
                      ? 'font-semibold text-sage-dark'
                      : 'text-ink'
                  }`}
                >
                  <span>{partnerName}</span>
                  {assignee === partnerName && (
                    <span className="text-[10px] text-sage-dark">✓</span>
                  )}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectAssignee('Both')}
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-paper-soft ${
                    assignee === 'Both'
                      ? 'font-semibold text-sage-dark'
                      : 'text-ink'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-sage"
                      aria-hidden="true"
                    />
                    Shared
                  </span>
                  {assignee === 'Both' && (
                    <span className="text-[10px] text-sage-dark">✓</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {isPartnerEditing && (
            <>
              <span>·</span>
              <span className="inline-flex animate-pulse items-center gap-1 rounded bg-sage/10 px-1.5 py-0.5 text-[10px] font-medium text-sage-dark">
                <span className="h-1 w-1 rounded-full bg-sage" />
                {editingPartnerName || partnerName} is editing...
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right controls: Delete */}
      {onDelete && (
        <div className="flex shrink-0 items-center self-stretch px-1.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onDelete}
            className="flex cursor-pointer items-center justify-center text-muted opacity-0 transition-colors group-hover:opacity-100 hover:text-clay focus:opacity-100"
            title="Delete todo"
            aria-label={`Delete ${title || 'todo'}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              className="h-4.5 w-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}

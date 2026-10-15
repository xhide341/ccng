'use client';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  hideCancel = false,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-md border border-line bg-paper p-6 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            id="confirm-dialog-title"
            className="m-0 font-display text-base font-normal text-ink"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="-mt-0.5 -mr-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:text-ink focus:outline-none"
            aria-label="Close"
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

        <p className="m-0 mb-5 text-xs leading-relaxed text-muted">
          {description}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded border border-line bg-paper px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={
              variant === 'danger'
                ? 'cursor-pointer rounded border border-clay/40 bg-clay-soft px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-clay/60 hover:bg-clay-soft/80'
                : 'cursor-pointer rounded bg-ink px-3 py-1.5 text-xs font-semibold text-paper shadow-2xs transition-opacity hover:opacity-90'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

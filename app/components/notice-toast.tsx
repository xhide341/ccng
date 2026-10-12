'use client';

type NoticeToastProps = {
  message: string;
  onDismiss: () => void;
};

export function NoticeToast({ message, onDismiss }: NoticeToastProps) {
  if (!message) return null;

  return (
    <aside
      className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 max-w-[min(420px,calc(100vw-32px))] py-3 px-4 rounded border border-line bg-ink text-[#f4f0e8] shadow-2xl text-xs text-left animate-[notice-in_280ms_ease-out_both]"
      aria-live="polite"
    >
      <span
        className="grid place-items-center w-5 h-5 rounded-full bg-sage text-white text-[11px] font-bold shrink-0"
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="flex-1">{message}</span>
      <button
        className="ml-auto pl-2 text-[#aeb7ac] hover:text-white text-base leading-none bg-transparent border-0 cursor-pointer transition-colors"
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss notice"
      >
        ×
      </button>
    </aside>
  );
}

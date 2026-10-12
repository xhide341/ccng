'use client';

type PartnerCursorProps = {
  x: number;
  y: number;
  name: string;
  visible: boolean;
};

export function PartnerCursor({ x, y, name, visible }: PartnerCursorProps) {
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-50 select-none transition-[left,top] duration-[35ms] ease-linear"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-1px, -1px)',
      }}
    >
      {/* Sleek SVG pointer */}
      <svg
        width="16"
        height="18"
        viewBox="0 0 16 18"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M1 1L6.5 16.5L8.8 10.2L15 7.8L1 1Z"
          fill="#496552"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name badge */}
      <div className="-mt-2.5 ml-3.5 inline-flex items-center rounded-full bg-sage-dark px-2 py-0.5 text-[10px] font-medium tracking-wide text-white shadow-md">
        {name}
      </div>
    </div>
  );
}

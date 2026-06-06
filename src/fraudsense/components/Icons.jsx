// Lightweight inline SVG icons (stroke-based, currentColor) — no icon library.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

export function FingerprintIcon({ className = 'w-5 h-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 11a2 2 0 0 0-2 2c0 2 .3 3.5-.5 5.5" />
      <path d="M12 6a7 7 0 0 0-7 7c0 1.6-.3 2.5-.8 3.5" />
      <path d="M12 8.5A4.5 4.5 0 0 0 7.5 13c0 2.2-.2 3.8-1 5.5" />
      <path d="M16.5 13a4.5 4.5 0 0 0-1.6-3.4" />
      <path d="M19 13c0-3.9-3.1-7-7-7-1.2 0-2.4.3-3.4.9" />
      <path d="M13.5 13c0 3.2.2 5.5-.7 7.8" />
      <path d="M16.8 16.5c.4-1.1.6-2.3.6-3.5" />
    </svg>
  );
}

export function SearchIcon({ className = 'w-5 h-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function SpinnerIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function CheckIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
}

export function PlusIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronIcon({ className = 'w-4 h-4', open = false }) {
  return (
    <svg
      {...base}
      className={`${className} transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AlertIcon({ className = 'w-5 h-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function PaperclipIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 17.8a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
    </svg>
  );
}

export function CloseIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function FileIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function ImageIcon({ className = 'w-4 h-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-5-5L5 21" />
    </svg>
  );
}

// Mobile-style 3-bar signal strength meter. `bars` = how many to fill (1–3).
export function SignalBars({ bars = 0, color = 'var(--accent-cyan)', className = 'w-5 h-5' }) {
  const heights = [5, 9, 13];
  return (
    <svg viewBox="0 0 18 16" className={className} aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={1 + i * 6}
          y={15 - h}
          width="4"
          height={h}
          rx="0.5"
          fill={i < bars ? color : 'var(--border-active)'}
        />
      ))}
    </svg>
  );
}

// Faint decorative hex/circuit texture for the top-right of the page.
export function CircuitTexture({ className = '' }) {
  return (
    <svg
      className={className}
      width="420"
      height="420"
      viewBox="0 0 420 420"
      fill="none"
      stroke="var(--accent-cyan)"
      strokeWidth="1"
      aria-hidden="true"
    >
      <defs>
        <pattern id="hex" width="56" height="48" patternUnits="userSpaceOnUse">
          <path d="M14 0 42 0 56 24 42 48 14 48 0 24Z" />
          <circle cx="28" cy="24" r="2" fill="var(--accent-cyan)" stroke="none" />
        </pattern>
      </defs>
      <rect width="420" height="420" fill="url(#hex)" />
      <path d="M0 120 H180 L210 90 H420 M0 300 H120 L150 330 H420" />
    </svg>
  );
}

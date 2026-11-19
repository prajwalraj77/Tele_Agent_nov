// Shared lightweight SVG icon component

const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),

  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),

  phone: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.62 2.65a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.25-1.25a2 2 0 0 1 2.11-.45c.86.29 1.75.5 2.65.62A2 2 0 0 1 22 16.92z" />
    </>
  ),

  callback: (
    <>
      <path d="M3 5h18" />
      <path d="M5 3v4" />
      <path d="M19 3v4" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),

  demo: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5l7-3 7 3v16" />
      <path d="M9 9h2" />
      <path d="M13 9h2" />
      <path d="M9 13h2" />
      <path d="M13 13h2" />
      <path d="M10 21v-4h4v4" />
    </>
  ),

  analytics: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="m7 15 3-4 3 2 5-7" />
    </>
  ),

  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 .83 1.7 1.7 0 0 0-.18 1.17v.08h-2.6v-.08a1.7 1.7 0 0 0-.18-1.17 1.7 1.7 0 0 0-1-.83 1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 7.6 15a1.7 1.7 0 0 0-.83-1 1.7 1.7 0 0 0-1.17-.18h-.08v-2.6h.08A1.7 1.7 0 0 0 6.77 11a1.7 1.7 0 0 0 .83-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.8-1.8.06.06A1.7 1.7 0 0 0 11 6.6a1.7 1.7 0 0 0 1-.83 1.7 1.7 0 0 0 .18-1.17v-.08h2.6v.08A1.7 1.7 0 0 0 15 5.77a1.7 1.7 0 0 0 1 .83 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19.4 11a1.7 1.7 0 0 0 .83 1c.39.22.83.28 1.27.18h.08v2.6h-.08A1.7 1.7 0 0 0 19.4 15z" />
    </>
  ),

  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),

  refresh: (
    <>
      <path d="M20 11a8.1 8.1 0 0 0-14.5-4.9L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 14.5 4.9L21 15" />
      <path d="M21 20v-5h-5" />
    </>
  ),

  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),

  arrowUp: (
    <>
      <path d="m18 15-6-6-6 6" />
    </>
  ),

  arrowDown: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),

  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),

  microphone: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v5" />
      <path d="M8 22h8" />
    </>
  ),

  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),

  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

function Icon({ name, size = 20, strokeWidth = 1.8, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

export default Icon;
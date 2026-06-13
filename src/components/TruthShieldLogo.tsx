/**
 * Custom TruthShield brand logo — a shield with an integrated verification
 * checkmark and horizontal scan-line detail. Designed to be monochrome and
 * inherit `currentColor` so it adapts to the primary theme color.
 */
export function TruthShieldLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield body */}
      <path
        d="M12 2L3 6.5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6.5L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M8.5 12.5L10.8 14.8L15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Scan lines — subtle horizontal detail */}
      <line
        x1="6.5"
        y1="8"
        x2="17.5"
        y2="8"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeOpacity="0.35"
      />
      <line
        x1="5.5"
        y1="17"
        x2="18.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeOpacity="0.35"
      />
    </svg>
  );
}

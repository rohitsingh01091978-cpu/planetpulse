// Inline SVG header illustration: a green planet with a pulse line. No external assets.
export default function PlanetMark({ size = 56 }) {
  return (
    <svg
      className="planet-mark"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="29" fill="#14532d" />
      <path
        d="M13 25c4-9 14-13 21-9 5 3 3 9-3 10-5 1-6 6-3 9 3 4-2 8-8 6-6-3-10-9-7-16z"
        fill="#86efac"
      />
      <path d="M41 37c5-3 11-2 13 3-2 7-9 12-16 11 1-5 0-11 3-14z" fill="#bbf7d0" />
      <path
        d="M5 35h13l4-9 6 17 5-13 4 5h22"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

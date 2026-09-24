// Small inline SVG illustrations for empty states. No external images.
// variant "leaf": nothing logged yet. variant "earth": filters matched nothing.
function Illustration({ variant, size }) {
  return (
    <svg
      className="empty-art"
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="48" cy="48" r="44" fill="#e6f2e8" />
      {variant === 'earth' ? (
        <>
          <circle cx="48" cy="48" r="34" fill="none" stroke="#14532d" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 5" />
          <circle cx="48" cy="48" r="25" fill="#14532d" />
          <path d="M34 42c3-7 11-10 17-7 4 2 2 7-2 8s-5 5-2 8c2 3-2 6-6 5-5-2-8-8-7-14z" fill="#86efac" />
          <path d="M56 52c4-2 9-1 10 3-1 5-7 9-12 8 1-4 0-8 2-11z" fill="#bbf7d0" />
          <circle cx="76" cy="27" r="4" fill="#2e9b57" />
        </>
      ) : (
        <>
          <path d="M28 62c0-22 14-34 40-36 2 24-8 40-32 42-3 0-6-2-8-6z" fill="#2e9b57" />
          <path d="M31 66c9-13 19-23 32-30" fill="none" stroke="#e6f2e8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M29 68l-7 9" fill="none" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// `action` is an optional element (for example a button) shown under the hint.
export default function EmptyState({ variant = 'leaf', title, children, action, size = 88 }) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <Illustration variant={variant} size={size} />
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export { Illustration };

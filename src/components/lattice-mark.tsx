/**
 * A lattice: nodes on a grid with the connecting edges drawn between them.
 * The diagonals are what the product is actually about, so they carry the
 * solid weight and the orthogonal grid sits behind them.
 */
export function LatticeMark({ className }: { className?: string }) {
  const p = [4, 12, 20];
  const nodes = p.flatMap((x) => p.map((y) => ({ x, y })));

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" strokeLinecap="round" opacity="0.35">
        <path d="M4 4h16M4 12h16M4 20h16" strokeWidth="1.1" />
        <path d="M4 4v16M12 4v16M20 4v16" strokeWidth="1.1" />
      </g>
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M4 12 12 4l8 8-8 8z" />
      </g>
      {nodes.map((n) => (
        <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r="1.7" fill="currentColor" />
      ))}
    </svg>
  );
}

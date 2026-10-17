const A = 27;
const H = 15.5;
const V = 27;

function Cube({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon
        points={`${x},${y} ${x + A},${y + H} ${x},${y + 2 * H} ${x - A},${y + H}`}
        fill="#f7bf67"
      />
      <polygon
        points={`${x - A},${y + H} ${x},${y + 2 * H} ${x},${y + 2 * H + V} ${x - A},${y + H + V}`}
        fill="#e9a54a"
      />
      <polygon
        points={`${x},${y + 2 * H} ${x + A},${y + H} ${x + A},${y + H + V} ${x},${y + 2 * H + V}`}
        fill="#c97b2c"
      />
    </g>
  );
}

export default function CubeStack({ className }: { className?: string }) {
  const x = 80;
  const y = 4;
  const ground = y + 2 * (H + V) + H;

  return (
    <svg viewBox="0 0 160 112" className={className} aria-hidden="true">
      <polygon
        points={`${x - 2 * A - 20},${ground - 8} ${x - 2 * A + 4},${ground - 22} ${x + 2},${ground + 10} ${x - 22},${ground + 22}`}
        fill="white"
        opacity="0.8"
      />
      <Cube x={x - A} y={y + H + V} />
      <Cube x={x + A} y={y + H + V} />
      <Cube x={x} y={y} />
    </svg>
  );
}

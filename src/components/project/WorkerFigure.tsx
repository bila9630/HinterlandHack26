import { useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { Group, Mesh } from "three";

const SKIN = "#f5c9a0";
const HELMET = "#f2b632";
const LEGS = "#1e2a44";
// How far the worker floats above its shadow, and how much it bobs, in floor squares.
const HOVER = 0.03;
const BOB = 0.02;

// A worker in a hard hat hovering over its shadow, sized in floor squares and drawn
// larger than life so it reads from afar.
export default function WorkerFigure({
  x,
  z,
  color,
  onClick,
}: {
  x: number;
  z: number;
  color: string;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const body = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  // Each worker bobs on its own beat, so a group of them doesn't move in lockstep.
  const phase = useMemo(() => (x * 7.3 + z * 3.1) % (Math.PI * 2), [x, z]);

  useFrame(({ clock }) => {
    const lift = (Math.sin(clock.elapsedTime * 2.2 + phase) + 1) / 2;
    body.current?.position.setY(HOVER + lift * BOB);
    shadow.current?.scale.setScalar(1 - lift * 0.15);
  });

  return (
    <group position={[x, 0, z]} scale={1.7} onClick={onClick}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
        <circleGeometry args={[0.07, 32]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.22} />
      </mesh>
      <group ref={body} position-y={HOVER}>
        <mesh position={[0, 0.06, 0]}>
          <capsuleGeometry args={[0.036, 0.05, 6, 20]} />
          <meshBasicMaterial color={LEGS} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <capsuleGeometry args={[0.046, 0.045, 6, 20]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.245, 0]}>
          <sphereGeometry args={[0.04, 20, 12]} />
          <meshBasicMaterial color={SKIN} />
        </mesh>
        <mesh position={[0, 0.255, 0]}>
          <sphereGeometry args={[0.043, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={HELMET} />
        </mesh>
      </group>
    </group>
  );
}

// The same worker as a flat icon, for the role list.
export function WorkerAvatar({ tone }: { tone: { bg: string; fg: string } }) {
  return (
    <span className="flex size-8 shrink-0 items-end justify-center overflow-hidden rounded-lg" style={{ backgroundColor: tone.bg }}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect x="12.5" y="23" width="7" height="10" rx="3.5" fill={LEGS} />
        <rect x="11" y="15" width="10" height="11" rx="5" fill={tone.fg} />
        <circle cx="16" cy="11" r="4" fill={SKIN} />
        <path d="M11.7 10.5a4.3 4.3 0 0 1 8.6 0z" fill={HELMET} />
      </svg>
    </span>
  );
}

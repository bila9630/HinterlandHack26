import { KeyboardEvent, MouseEvent, ReactNode, SVGProps, createContext, useContext } from "react";
import { Footprint } from "../layout";
import { Iso, Pt, Triple, createIso, pts } from "../iso";

export * from "../colors";

// The scene's projection, from the layout's camera.
export const IsoContext = createContext<Iso>(createIso());
export const useIso = () => useContext(IsoContext);

export { SelectionContext } from "../selection";

// A box standing on its footprint: left face, right face, then the top.
export function Box({ at: [u0, v0, W, D], z = 0, h, c, opacity }: { at: Footprint; z?: number; h: number; c: Triple; opacity?: number }) {
  const { box } = useIso();
  const faces = box(u0, v0, W, D, z, h);
  return (
    <g opacity={opacity}>
      <polygon points={pts(faces.left)} fill={c[1]} />
      <polygon points={pts(faces.right)} fill={c[2]} />
      <polygon points={pts(faces.top)} fill={c[0]} />
    </g>
  );
}

// A flat quad on the floor between two world corners.
export function FloorRect({ rect: [u0, v0, u1, v1], ...rest }: { rect: [number, number, number, number] } & SVGProps<SVGPolygonElement>) {
  const { iso } = useIso();
  return <polygon points={pts([iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)])} {...rest} />;
}

export function FloorLine({ from, to, color, width, dash }: { from: Pt; to: Pt; color: string; width: number; dash?: string }) {
  const { iso } = useIso();
  const [x1, y1] = iso(...from);
  const [x2, y2] = iso(...to);
  return (
    <line
      x1={x1.toFixed(1)}
      y1={y1.toFixed(1)}
      x2={x2.toFixed(1)}
      y2={y2.toFixed(1)}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
}

// Something the user can pick: a person or a vehicle.
export function Selectable({
  id,
  label,
  onSelect,
  children,
}: {
  id: string;
  label: string;
  onSelect?: (id: string) => void;
  children: ReactNode;
}) {
  const pick = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    onSelect?.(id);
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer outline-none transition-[filter] duration-150 hover:brightness-110 focus-visible:brightness-110"
      onClick={pick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pick(event);
        }
      }}
    >
      {children}
    </g>
  );
}

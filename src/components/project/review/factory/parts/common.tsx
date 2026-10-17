import { KeyboardEvent, MouseEvent, ReactNode, SVGProps, createContext, useContext } from "react";
import { Footprint } from "../layout";
import { Iso, Pt, Triple, createIso, pts } from "../iso";

// Colours of the boxes things are built from, from generate_scene.py: [top, left, right].
export const BOX: Triple = ["#F7BE6C", "#E39A3E", "#C97F27"];
export const BLUE: Triple = ["#6E98FF", "#2456E6", "#1A43B8"];
export const ORANGE: Triple = ["#FFC977", "#E8871E", "#C96F0E"];
export const BELT_TOP: Triple = ["#B8D27A", "#7FA83A", "#668A2B"];
export const DESK: Triple = ["#F1F4F9", "#C3CCDB", "#AEB9CC"];
export const YELLOW: Triple = ["#FFD45C", "#E8A912", "#C98F0A"];
export const DARK: Triple = ["#3E4A63", "#2C364B", "#1F2737"];
export const PALLET: Triple = ["#D9B582", "#C9A06A", "#AD8452"];
export const WHITE: Triple = ["#FFFFFF", "#E3E8F0", "#CDD5E2"];
export const BELT: Triple = ["#5B6B8C", "#45526C", "#3A465C"];
export const BEAM: Triple = ["#FFB15C", "#E8871E", "#C96F0E"];
export const WRAP: Triple = ["#F4F7FB", "#DCE3EE", "#C6D0DF"];
export const HEDGE: Triple = ["#8ED3A8", "#5FB585", "#4E9C70"];
export const GLASS: Triple = ["#DDE7F7", "#9FB2D1", "#8BA0C2"];
export const CHARGER: Triple = ["#E3E8F0", "#AEB9CC", "#93A3BD"];
export const CHARGE_LIGHT: Triple = ["#1FA25A", "#1FA25A", "#1FA25A"];
export const CONTAINERS: Triple[] = [BLUE, ORANGE, ["#C7D2E3", "#93A3BD", "#7C8DA9"], ["#9ED9C2", "#3FAE84", "#2F8F6A"]];
export const CARS: Triple[] = [
  ["#F7F9FC", "#D5DCE8", "#BFC9D9"],
  ["#FF8A8A", "#E5484D", "#C2383C"],
  BLUE,
  YELLOW,
  ["#C7D2E3", "#93A3BD", "#7C8DA9"],
];
export const PRIMARY = "#2456E6";
export const PRIMARY_DARK = "#1A43B8";
export const WARNING = "#E8871E";
export const INK = "#0F1B33";
export const SHADOW = "rgba(15,27,51,.18)";
export const FONT = "Plus Jakarta Sans, system-ui, sans-serif";

// The scene's projection, from the layout's camera.
export const IsoContext = createContext<Iso>(createIso());
export const useIso = () => useContext(IsoContext);

// The id of the selected person or vehicle, if any.
export const SelectionContext = createContext<string | null>(null);

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

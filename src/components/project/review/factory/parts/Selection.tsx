import { Person, Vehicle } from "../layout";
import { FONT, PRIMARY, PRIMARY_DARK, useIso } from "./common";
import { Mover, routePath } from "./Vehicle";

// A dark pill with a name and a detail, pointing down at (0, 19).
function NameTag({ name, detail = "" }: { name: string; detail?: string }) {
  const w = (name + detail).length * 6.2 + 34;
  return (
    <g>
      <rect x={-w / 2} y={-14} width={w} height={26} rx={8} fill={PRIMARY_DARK} />
      <path d="M-6,12 L0,19 L6,12 Z" fill={PRIMARY_DARK} />
      <text x={-w / 2 + 10} y={4} fontFamily={FONT} fontSize={12} fontWeight={800} fill="#FFFFFF">
        {name}
      </text>
      {detail && (
        <text x={-w / 2 + 16 + name.length * 7.2} y={4} fontFamily={FONT} fontSize={11} fontWeight={600} fill="#C9D8FF">
          {detail}
        </text>
      )}
    </g>
  );
}

// Corner brackets and a name tag that follow a selected vehicle, drawn above the whole scene.
export function VehicleTag({ vehicle }: { vehicle: Vehicle }) {
  const { iso } = useIso();
  return (
    <Mover path={routePath(vehicle, iso)} loopSec={vehicle.loopSec}>
      <g transform="translate(0 -92)" pointerEvents="none">
        <path
          d="M-30,64 l-8,0 0,8 M30,64 l8,0 0,8 M-30,104 l-8,0 0,-8 M30,104 l8,0 0,-8"
          stroke={PRIMARY}
          strokeWidth={2}
          fill="none"
          transform="translate(0 -6)"
        >
          <animate attributeName="opacity" values="1;.35;1" dur="1.4s" repeatCount="indefinite" />
        </path>
        <NameTag name={vehicle.id} detail={vehicle.task} />
      </g>
    </Mover>
  );
}

// A name tag over a selected person's head, drawn above the whole scene so nothing hides it.
// The pulsing ring stays on the floor with the person.
export function PersonTag({ person }: { person: Person }) {
  const { iso } = useIso();
  const [x, y] = iso(...person.at);
  return (
    <g transform={`translate(${x.toFixed(1)} ${(y - 62).toFixed(1)})`} pointerEvents="none">
      <NameTag name={person.name} detail={person.role} />
    </g>
  );
}

import { StationKind, Subtask } from "./model";

export const MTM_CODES = ["KA", "HA1", "HA2", "HA3", "BA2", "BA3", "AA1", "AA2", "AA3", "VA", "ZA"];

export type Workflow = { id: string; kind: StationKind; name: string; subtasks: Omit<Subtask, "id">[] };

const workflow = (kind: StationKind, name: string, subtasks: [string, string, number][]): Workflow => ({
  id: `${kind}:${name}`,
  kind,
  name,
  subtasks: subtasks.map(([code, label, seconds]) => ({ code, label, seconds })),
});

// Standard MTM-UAS workflows per kind of stop, times per pallet.
export const WORKFLOWS: Workflow[] = [
  workflow("inbound-dock", "Unload truck", [
    ["KA", "Walk to truck, 5 m", 4.0],
    ["HA2", "Position pallet jack under pallet", 6.1],
    ["BA2", "Lift pallet with jack", 2.2],
    ["KA", "Pull pallet to staging lane, 12 m", 9.4],
    ["AA3", "Lower and place pallet", 3.5],
    ["VA", "Visual check for damage", 1.8],
  ]),
  workflow("inbound-dock", "Goods receipt check", [
    ["VA", "Compare delivery note", 5.2],
    ["HA1", "Scan pallet label", 3.1],
    ["VA", "Count packages", 6.4],
    ["ZA", "Confirm receipt in WMS", 3.8],
  ]),
  workflow("inbound-dock", "Label & scan pallet", [
    ["HA1", "Pick label", 2.0],
    ["HA2", "Apply label", 3.6],
    ["HA1", "Scan label", 2.4],
    ["ZA", "Confirm in WMS", 4.2],
  ]),
  workflow("inbound-dock", "Stage for put-away", [
    ["BA2", "Lift pallet with jack", 2.2],
    ["KA", "Move to staging, 6 m", 4.8],
    ["AA3", "Lower and place pallet", 2.8],
  ]),
  workflow("pallet-rack", "Put away pallet", [
    ["HA2", "Fork into pallet", 4.5],
    ["KA", "Drive to rack location, 20 m", 14.0],
    ["BA3", "Lift to level 3", 8.5],
    ["AA3", "Place pallet in bay", 4.0],
    ["HA1", "Scan bay label", 2.0],
  ]),
  workflow("pallet-rack", "Pick pallet", [
    ["KA", "Drive to bay, 15 m", 12.0],
    ["BA3", "Lower pallet from level", 7.5],
    ["HA2", "Withdraw forks", 3.0],
    ["HA1", "Scan pallet", 2.0],
  ]),
  workflow("pallet-rack", "Replenish pick face", [
    ["KA", "Fetch reserve pallet", 15.0],
    ["AA3", "Place in pick face", 4.0],
    ["ZA", "Confirm in WMS", 2.0],
  ]),
  workflow("assembly-line", "Assemble module", [
    ["HA2", "Take part from bin", 2.4],
    ["AA2", "Position part", 3.1],
    ["HA3", "Fasten 4 screws", 14.0],
    ["VA", "Check fit", 2.5],
  ]),
  workflow("assembly-line", "Kitting", [
    ["HA1", "Pick 6 parts", 9.6],
    ["AA1", "Place in kit tray", 4.2],
    ["VA", "Check kit", 2.2],
  ]),
  workflow("assembly-line", "Sequence parts", [
    ["HA1", "Scan sequence sheet", 2.0],
    ["KA", "Walk to rack, 4 m", 3.2],
    ["HA2", "Pick part", 2.4],
    ["AA2", "Place in sequence slot", 2.6],
  ]),
  workflow("packing-table", "Pack carton", [
    ["HA2", "Fold carton", 6.0],
    ["AA2", "Place goods", 4.5],
    ["HA2", "Add filler", 3.0],
    ["HA3", "Tape carton", 5.5],
  ]),
  workflow("packing-table", "Label shipment", [
    ["HA1", "Print label", 3.0],
    ["HA2", "Apply label", 2.6],
    ["HA1", "Scan label", 2.0],
  ]),
  workflow("packing-table", "Wrap pallet", [
    ["KA", "Walk around pallet 3 times", 18.0],
    ["HA2", "Cut film", 2.5],
  ]),
  workflow("outbound-dock", "Load truck", [
    ["BA2", "Lift pallet", 2.2],
    ["KA", "Drive into trailer, 10 m", 8.0],
    ["AA3", "Lower and place pallet", 3.5],
    ["KA", "Return to dock, 10 m", 8.0],
  ]),
  workflow("outbound-dock", "Shipping check", [
    ["VA", "Check labels", 4.0],
    ["HA1", "Scan pallet", 2.0],
    ["ZA", "Confirm in WMS", 3.8],
  ]),
  workflow("outbound-dock", "Stage for loading", [
    ["BA2", "Lift pallet", 2.2],
    ["KA", "Move to loading lane, 8 m", 6.4],
    ["AA3", "Lower and place pallet", 2.8],
  ]),
];

export const subtaskSeconds = (subtasks: { seconds: number }[]) =>
  subtasks.reduce((sum, subtask) => sum + subtask.seconds, 0);

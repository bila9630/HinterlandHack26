import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";
import { CAMERA } from "../iso";
import { boxGeometry, quadGeometry, worldScale } from "./geometry";
import { ScaleContext, Trees } from "./parts";
import { SiteDock, siteScenery } from "./site";

// The scenery is a little lower than in the factory scene, so trucks stand about as tall as
// the dock doors of a floor drawn in real metres.
const HEIGHT = 0.8;
const noRaycast = () => null;

// The site around a hall from (0, 0) to (columns, rows) floor squares, standing on y = 0.
export default function SiteScenery({ columns, rows, docks }: { columns: number; rows: number; docks: SiteDock[] }) {
  const scale = useMemo(() => {
    const standard = worldScale(CAMERA);
    return { ...standard, z: standard.z * HEIGHT, up: standard.up * HEIGHT };
  }, []);
  const site = useMemo(() => siteScenery(columns, rows, docks), [columns, rows, docks]);
  const ground = useMemo(() => quadGeometry(site.quads), [site]);
  const boxes = useMemo(() => boxGeometry(site.boxes, scale.z), [site, scale]);
  useEffect(() => () => ground.dispose(), [ground]);
  useEffect(() => () => boxes.dispose(), [boxes]);

  return (
    <ScaleContext.Provider value={scale}>
      <mesh geometry={ground} raycast={noRaycast}>
        <meshBasicMaterial vertexColors side={DoubleSide} />
      </mesh>
      <mesh geometry={boxes} raycast={noRaycast}>
        <meshBasicMaterial vertexColors side={DoubleSide} />
      </mesh>
      <Trees key={site.trees.length} trees={site.trees} />
    </ScaleContext.Provider>
  );
}

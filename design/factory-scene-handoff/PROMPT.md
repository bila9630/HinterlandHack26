Paste into Claude Code from the root of your app repo, after copying this folder to `design/factory-scene-handoff/`:

---

Implement the factory simulation scene from `design/factory-scene-handoff/`.

Read `SPEC.md` first, then `layout.json`. Open `reference.html` to see the target. `generate_scene.py` is the exact reference implementation of geometry, colours, draw order and animation; port its logic, don't call it.

Build:
1. A pure TypeScript module `iso.ts` with the projection (`C=0.866, S=0.42, ZS=1.15, L=70`) and a `box()` helper that returns the three face polygons.
2. A React component `<FactoryScene layout={layout} selectedId? onSelect? />`, rendered as one `<svg>` with the given viewBox and `preserveAspectRatio="xMidYMid slice"`, so it fills its container with no empty space.
3. Sub-components for floor, walls (low cutaway), racks, conveyor, forklift, pallet jack, person, truck, tree, car, label. Follow the zone and depth sorting rules in SPEC.md exactly.
4. Animations: forklifts, pallet jack and conveyor items follow their routes and loop times from `layout.json`; workers bob. Drive positions from a single simulation clock (`requestAnimationFrame`) so pause and speed are possible later.
5. People and vehicles are clickable: call `onSelect(id)`, show a pulsing ring or bracket tag on the selected one, and use a pointer cursor on hover.
6. A dev page that renders the scene full-screen so I can compare it side by side with `reference.html`.

Match the reference visually; keep everything data-driven from `layout.json`. Ask me before choosing a framework if the repo doesn't already have React.

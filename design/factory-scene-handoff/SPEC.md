# Factory scene — implementation spec (from mockup F8.1.2)

The Review step of CostCube shows a live-looking 3D simulation of the hall. The mockup is a
**2.5D isometric SVG**. Build it the same way (React + SVG). There's no need for WebGL.

## Files in this package
| File | What it is |
|---|---|
| `reference.html` | Full frame (header + scene). Open it in a browser. This is the visual target. |
| `scene.svg` | Scene only, same output. |
| `generate_scene.py` | The script that produced the mockup. **Source of truth** for every shape, colour, draw order and animation. Port its logic; don't ship it. |
| `layout.json` | The scene data pulled out of the script. It should become the component's input. |
| `PROMPT.md` | Prompt to paste into Claude Code. |

## Projection
```
screen.x = OX + C·(u − v)·L
screen.y = OY + S·(u + v)·L − z·ZS
C = 0.866, S = 0.42 (low camera → flatter floor), ZS = 1.15, L = 70 px per cell
```
Zoom and pan come only from the SVG `viewBox` (`-470 -110 1000 574`, `preserveAspectRatio="xMidYMid slice"`),
so the scene always fills the container edge to edge.

## Primitives
- **Box** `(u0, v0, W, D, z0, H, [top, left, right])`: three polygons. The left face is the +v side, the right face the +u side, then the top. Every object is built from boxes.
- **Person**: a small 2D sprite (shadow, legs, vest, head, hard hat) placed at `iso(u, v)`, with an optional bob animation.
- **Forklift / pallet jack**: boxes in local coordinates (relative to `(0, 0)`), moved with `<animateMotion>` along a path.
- **Tree / car / container / hedge**: see `tree()` and `scenery()` in the script.
- **Label**: a pill with a numbered circle, anchored at `iso(u, v, z)`. Orange outline when `warning`.

## Draw order (important)
1. Ground layer, in insertion order: grass → site paving → roads → yards → car park → hall slab → floor cells → lane lines.
2. Objects are split into zones by their reference point: **back** (u<0 or v<0), **in** (inside the hall), **front** (u>8 or v>7).
3. Render: back objects → back walls (u=0, v=0) → inside objects → front walls (u=8, v=7) → front objects → labels.
4. Within a zone, sort by `u + v` (painter's algorithm). Ties keep insertion order.

## Walls
F8.1.2 uses **low cutaway walls** (height 26): a light fill with a blue top edge. Open docks are gaps with a coloured frame; closed docks are filled roller doors with horizontal lines.
(Variant F8.1.3 uses full-height walls: corrugated at the back, glass at the front. The script supports both: `build(rot, H, front_kind, back_kind)`.)

## Animation
SMIL in the mockup: `animateMotion` for forklifts, the pallet jack and conveyor items; `animateTransform` for worker bob.
In the app, prefer driving positions from a simulation clock (`requestAnimationFrame`, or state from the backend), so that pause, speed and scrubbing are possible later.

## Interaction to support
- Clicking a person or vehicle raises `onSelect(id)`. The app then shows a profile panel (mockup F8.2 shows Maria Kovač's profile).
- Selected state: pulsing ring (people) or corner brackets with a tag (vehicles; see `forklift(tag=…)`).
- Hover: cursor pointer and a slight highlight.

## Out of scope / placeholders
All numbers, names and utilisations are placeholders. MTM codes elsewhere in the app are illustrative only.

# Spherical Harmonics Visualizer

Interactive browser app for exploring real spherical harmonics basis functions with both 2D and 3D views.

## Features

1. **Collapsible left sidebar**
   - Left panel contains `l`, `m`, and hover exact-value toggle.
   - Sidebar can collapse/expand by clicking the hamburger button.

2. **Top-right 2D/3D switch**
   - `2D Map` and `3D Surface` buttons are placed in the top-right control card.
   - View switching is instant and keeps the same `l,m` state.

3. **Equation panel below the switch**
   - Right panel shows general equations, current `(l,m)` equations, and hover values.
   - Math is rendered via KaTeX in LaTeX format with `\sqrt{}` terms preserved.

4. **Fixed rendering + interaction bugs**
   - 2D map and 3D sphere render correctly.
   - 3D hover/raycast reports valid `(\theta, \phi)` samples.
   - Coverage display is boundary-only (no coverage ratio text).

## File structure

- `index.html` — app shell and panel layout
- `src/main.js` — app state + event wiring
- `src/math/sphericalHarmonics.js` — mathematical core (`P_l^m`, `Y_l^m`)
- `src/renderers/map2d.js` — 2D map renderer and hover sampling
- `src/renderers/view3d.js` — Three.js 3D renderer + interaction
- `src/ui/equationPanel.js` — KaTeX rendering for equations and hover values
- `src/styles.css` — professional UI styling

## How to run

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Then open the printed local URL (default: `http://localhost:5173`).

Build for production:

```bash
npm run build
```

## Manual test checklist

1. Click the sidebar hamburger and verify left control panel collapses/expands.
2. Switch `2D Map` / `3D Surface` from top-right; both views should show non-black output.
3. In 3D mode, drag to orbit and hover over the surface to update `(\theta,\phi)` values.
4. Enable/disable exact hover values and verify equation-value panel updates accordingly.
5. Set `l=1,m=0` and confirm 2D gradient is smooth (no artificial segmented blocks).
6. Confirm all equations render in KaTeX LaTeX, including normalization `\sqrt{...}`.

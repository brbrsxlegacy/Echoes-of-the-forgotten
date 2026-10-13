# Asset provenance

All four source illustrations were generated specifically for this original project. No external game characters, music samples or environment art were imported.

Shipping assets are alpha-aligned WebP atlases and a painted forest background. Nilo: 8×4 / 32 frames. Environment/props/boss: 4×4 / 16 assets. Enemies: 6×3 / 18 poses. `public/assets/frames.json` and `public/assets/enemies/frames.json` define actual source rectangles. The renderer uses these in live gameplay; collisions and room layouts are independently authored in `src/world/rooms.ts`.

The extraction pipeline crops transparent bounds, normalizes baselines and removes guide lines. Generated originals are working inputs, not required at runtime. Every generated illustration is integrated into the shipping game. PWA icons are derived from the actual Nilo atlas. Some attack frames retain edge clipping from the original grid; correcting these by hand is future art polish.

Music motifs and synthesized timbres are original code in `src/audio/score.ts`. No third-party recorded music or SFX are bundled.

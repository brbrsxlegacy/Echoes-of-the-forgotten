# Asset provenance

All eight source illustrations were generated specifically for this original project. No external game characters, music samples or environment art were imported.

Shipping assets are alpha-aligned WebP atlases and a painted forest background. Nilo: 8×4 / 32 frames. Environment/props/boss: 4×4 / 16 assets. Enemies: 6×3 / 18 poses. `public/assets/frames.json` and `public/assets/enemies/frames.json` define actual source rectangles. The renderer uses these in live gameplay; collisions and room layouts are independently authored in `src/world/rooms.ts`.

The extraction pipeline crops transparent bounds, normalizes baselines and removes guide lines. Generated originals are working inputs, not required at runtime. Every generated illustration is integrated into the shipping game. PWA icons are derived from the actual Nilo atlas. Some attack frames retain edge clipping from the original grid; correcting these by hand is future art polish.

Music motifs and synthesized timbres are original code in `src/audio/score.ts`. No third-party recorded music or SFX are bundled.

## 0.3 region production

Two original 1536×1024 backgrounds and two transparent 6×5 sheets were generated specifically for the Cathedral and Ashen regions. `tools/prepare_expansion_art.py` trims transparent bounds, aligns each cell to a consistent baseline and encodes two 1536×1280 WebP atlases (30 entries each). JSON frame rectangles preserve the actual bounds. Rows contain six environment modules, two six-pose enemy families, a six-pose boss and six interactive/NPC/prop assets. Every sheet and background is used by the live renderer. NPC and boss portraits are derived from those same assets.

The runtime uses independent region artwork for parallax, terrain, foliage/embers, architecture, water/vents, NPCs, enemies, bosses, relics, valves, wheel switches and gates. World collision remains separate room data; backgrounds are never collision maps. Some generated cell edges retain clipped foliage/weapon tips, and pose-to-pose cloth shapes are not perfectly invariant. No hand-painted or motion-captured production process is claimed.

Original new exploration motifs and phase-sensitive boss arrangements are implemented in `src/audio/score.ts`. All instruments and effects are synthesized through Web Audio after a user gesture.

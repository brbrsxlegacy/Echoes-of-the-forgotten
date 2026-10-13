# Echoes of the Forgotten — Whispering Grove 0.2

An original browser metroidvania by BRBRS Games. **This release contains the first region, not the seven-region campaign or a finished AAA game.**

## Play locally

Node.js 24+:

```sh
npm ci
npm run dev
```

Open the local address shown by Vite. `npm run build` creates the static production site in `dist`. Vercel settings are supplied in `vercel.json` (Vite, build `npm run build`, output `dist`).

## Implemented

- Nine connected Whispering Grove rooms: Lantern Refuge, Whispering Roots, Luminous Canopy, Broken Crossing, Root Archive, Three Chimes Courtyard, Last Vigil, Bellkeeper arena and Memory Threshold.
- Nilo's 32 painted animation frames, original modular terrain/props, three animated enemy families and four Bellkeeper poses. Separate collision geometry, parallax scenery, lighting, mist, water, particles, camera follow and impact feedback.
- Accelerated/decelerated movement, variable jump, coyote time, jump buffer, wall slide/jump, three-hit combo, up/down attacks, enemy bounce, charged strike, perfect parry, damage invulnerability, energy burst and healing.
- Three-phase, 48-health Bellkeeper fight with melee attacks, ground waves, falling resonance projectiles and punishable recoveries. Defeat unlocks an air/ground dash and the light-barrier traversal route.
- Musical puzzle (I → III → II), health/energy secrets, Elda and Orin conversations, currency, Orin's health upgrade, lore journal and discovered-room map with markers and travel between activated shrines.
- Three versioned local save slots, checkpoint respawn, corrupt-save validation, settings persistence, menus, adjustable touch controls, keyboard rebinding, standard gamepad mapping and accessibility options.
- Original composed Web Audio score (title/exploration/shrine/boss/victory arrangements) and SFX. Audio begins only after interaction.
- PWA manifest, icons and offline caching after an online visit.

## Controls

| Action | Keyboard | Standard gamepad | Touch |
|---|---|---|---|
| Move | A/D or arrows | Stick / D-pad | ‹ / › |
| Jump / wall jump | Space (hold for height) | Bottom face / Cross | ZIPLA |
| Attack / charge | J / hold J | Left face / Square | VUR / hold |
| Up / down strike | W/S + J | D-pad up/down + attack | ↓ + VUR |
| Parry | K | L1 | KORU |
| Dash (after boss) | Shift | Right face / Circle | DASH |
| Echo Burst | L | Top face / Triangle | ✦ |
| Interact | E | R1 | EL |
| Heal | H | L2 | CAN |
| Map / inventory | M / I | Select for map | Top map / pause |
| Pause | Escape | Start / Options | Ⅱ |

Use a lantern to restore health and set a checkpoint. Reloading or continuing starts at that lantern. Saves belong to the browser/device and are not cloud accounts.

## Architecture and validation

TypeScript + Vite; modular Canvas 2D renderer, fixed 120 Hz gameplay simulation, native Web Audio and Gamepad APIs. Source is split into movement, combat/AI, room data, saving, input, audio, rendering and menus. This deliberately small custom engine keeps movement/combat independently testable and the runtime bundle compact.

`npm test` runs deterministic gameplay/save/input tests. `tools/browser-qa.mjs` supplements them with a real Chromium browser, actual input, checkpoint reloads, puzzle gates and a full Bellkeeper combat simulation. `docs/QA.md` records results and verification limits. Browser setup is documented in the script; it is not part of the shipped game.

## Scope and limitations

The remaining six regions and eleven bosses are **planned**, not implemented. Tide Breath, Ember Guard, double jump/Astral Leap, Memory Echo, Dream Shift, Harmonic Blade, Refrain Shield, Last Note, water-level/light puzzles, equipment and campaign endings are absent. No gameplay duration is claimed.

Art consists of generated, aligned painted atlases; some poses change proportions slightly, especially wide sword attacks. The renderer has atmospheric approximations rather than true volumetric lighting or skeletal animation. The score uses synthesized instruments, not recorded orchestral music. Physical iPhone Safari, Android devices and a physical DualSense have not been tested. Mobile layout/pointer behavior and controller mappings can be tested through browser emulation and API fixtures. 60 FPS is a target, not a measured guarantee on physical hardware.

Vercel publication currently requires project creation permission in BRBRS Games. No live deployment is claimed unless a verified URL is supplied separately.

# Jump and mobile hotfix — 0.2.1

- **33 deterministic tests passed, 0 failed**. Platform reachability is now checked with the actual player collision/movement simulation across all nine rooms. Eight pre-boss rooms are reachable without dash using both held jumps and short touch taps; moving platforms are checked at top/center/bottom travel positions. The last room requires the intended dash through its light barrier. Room spawns are checked against terrain and accidental immediate transitions.
- **18 browser checks passed, 0 failed; zero critical console errors**. Existing gameplay/save/boss checks plus 390×844 portrait layout, visible player/camera, undistorted viewport scaling, blocked text selection/context menus and rotation back to landscape.
- Jump launch speed changed from 650 to 760; a 120 ms minimum rise supports quick taps while retaining variable-height jumping. Near-top 8 px corner forgiveness prevents catching platform edges. Added thirteen intermediate platforms and lowered awkward first steps. Corrected three spawn placements, including the canopy exit that returned immediately to the previous room.
- Portrait gameplay now uses a narrower camera and fills the area above the controls. Touch controls remain below the scene. iOS-specific user-select/touch-callout CSS and context/selection/drag prevention cover gameplay and controls.
- Safari on a physical iPhone was not available. Portrait/touch behavior was verified in Chromium mobile emulation; the native Safari callout suppression is implemented but not claimed as physically tested.
- Save format remains v2; existing save slots/checkpoints are preserved. Service-worker cache identifier is updated for this release.

---

# Release validation — 2026-10-13

- TypeScript check and Vite production build: PASS. Runtime JS about 59 kB / 22 kB gzip; art atlases approximately 2.8 MB.
- Node deterministic tests: **13 passed, 0 failed**. Movement/friction, variable jump, coyote/buffer, wall collision/jump, dash gating/reset, melee/pogo, damage/parry, boss patterns/phases/defeat, musical sequence, room links, versioned save slots/corruption, quota failure, touch cancellation and gamepad mapping/disconnection.
- Chromium gameplay suite: **15 passed, 0 failed**, with **zero critical console errors**. Title/assets; new game/audio initialization; keyboard move/jump/land; shrine save/refresh/Continue; NPC dialogue; map/marker/inventory; enemy damage/defeat; enemy attack/hazard recovery; real parry input; puzzle opening the room gate; complete Bellkeeper combat simulation; saved dash unlock and real dash through the light barrier; screenshots/resize; mobile viewport/pointer movement/jump; console check.
- Bellkeeper simulation starts with normal 6 health, 100 energy, assist OFF, no health/invulnerability injection during the encounter. The controller learns the telegraphs and uses normal attack/parry/ability actions through the same game update. It won with minimum health 5, 12 melee initiations and 26 parry attempts. This is automated simulation evidence, not a human difficulty or play-duration claim.
- Desktop browser capture: 1280×720. Mobile emulation: 844×390, touch and DPR emulation; adaptive mobile rendering uses a 1280×720 canvas for frame pacing.

## Verification limits

Physical iPhone Safari/Android and a physical controller were not available. Controller mappings were checked with Gamepad API fixtures. Subjective music quality, real hardware frame rate, long-session stability and 15–30 minute play duration have not been established. Offline behavior is implemented but not validated across browser eviction or first-visit timing. Wide sword sprites retain slight alignment/clipping imperfections.

The last six regions and eleven bosses are not present. The complete AAA campaign is not claimed. The browser tests use development-only inspection hooks to arrange individual mechanics; the full boss simulation uses live game logic. Production excludes these hooks.

## Hosting

Vercel project lookup returned 404; repository-filtered project list returned no matching project. Creating `echoes-of-the-forgotten` in BRBRS Games returned **403 forbidden: You don't have permission to create the project**. No independent Vercel CLI authentication was available. Consequently no production deployment or live-site verification is claimed.

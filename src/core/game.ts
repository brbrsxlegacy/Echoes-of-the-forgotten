import {
  regions,
  regionOf,
  isBoss,
  gateOpen,
  questItems,
  relics,
} from "../world/regions";
import { awardBoss, returnFragments } from "../systems/progression";
import {
  clamp,
  overlaps,
  type Enemy,
  type Particle,
  type Player,
  type Room,
  type SaveData,
  type Shot,
  type Settings,
  type Platform,
} from "./types";
import { rooms, ringBell } from "../world/rooms";
import { makePlayer, movePlayer } from "../player/physics";
import {
  makeEnemy,
  updateEnemies,
  strike,
  hurtPlayer,
  attackBox,
  type CombatEvent,
} from "../combat/enemies";
import { Input } from "../input/controls";
import { Score } from "../audio/score";
import { SaveStore, newSave } from "../saving/store";
import { Assets } from "../render/assets";
import { Renderer } from "../render/renderer";
import { UI } from "../ui/menus";
export class Game {
  store: SaveStore;
  settings: Settings;
  input: Input;
  audio: Score;
  assets = new Assets();
  renderer: Renderer;
  ui: UI;
  data: SaveData = newSave();
  player: Player = makePlayer(200, 630);
  room: Room = rooms.lantern;
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  particles: Particle[] = [];
  platforms: Platform[] = [];
  mode: "title" | "playing" | "pause" | "dialogue" | "dead" = "title";
  slot = 0;
  time = 0;
  camera = { x: 0, y: 0 };
  shake = 0;
  hitstop = 0;
  transition = 0;
  roomTitle = 0;
  deathTimer = 0;
  bellProgress: number[] = [];
  toast = "";
  toastTimer = 0;
  nearest: string | null = null;
  oxygen = 14;
  fps = 60;
  last = 0;
  accumulator = 0;
  dialogueLines: string[] = [];
  dialogueName = "";
  dialogueIndex = 0;
  dialogueTime = 0;
  dialoguePortrait = "npc";
  onDialogueEnd: (() => void) | null = null;
  constructor(public canvas: HTMLCanvasElement) {
    this.store = new SaveStore(localStorage);
    this.settings = this.store.settings();
    this.input = new Input(this.settings);
    this.audio = new Score(this.settings);
    this.renderer = new Renderer(this, this.assets);
    this.ui = new UI(this);
    this.loadRoom("lantern", 200, 630);
  }
  async init() {
    try {
      await this.assets.load((p) => this.ui.loading(p));
      this.ui.title();
      requestAnimationFrame(this.frame);
    } catch (error) {
      this.ui.error(String(error));
    }
  }
  frame = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.fps = this.fps * 0.97 + (dt ? 1 / dt : 60) * 0.03;
    this.input.poll();
    this.handleMenus();
    this.audio.tick();
    this.accumulator += dt;
    let frames = 0;
    let inputUsed = false;
    while (this.accumulator >= 1 / 120 && frames++ < 7) {
      if (this.mode === "playing") {
        if (this.update(1 / 120, !inputUsed)) inputUsed = true;
      } else {
        this.time += 1 / 120;
        this.updateParticles(1 / 120);
        if (this.mode === "dead") {
          this.deathTimer -= 1 / 120;
          if (this.deathTimer <= 0) this.respawn();
        }
        if (this.mode === "dialogue") this.dialogueTime += 1 / 120;
      }
      this.accumulator -= 1 / 120;
    }
    this.renderer.draw();
    this.ui.tick();
    if (inputUsed || this.mode !== "playing") this.input.pressed.clear();
    requestAnimationFrame(this.frame);
  };
  start(slot: number, resume: boolean) {
    this.slot = slot;
    const saved = resume ? this.store.load(slot) : null;
    this.data = saved || newSave();
    this.player = makePlayer(
      this.data.checkpoint.x,
      this.data.checkpoint.y,
      this.data.maxHealth,
      this.data.maxHealth,
      this.data.maxEnergy,
    );
    this.loadRoom(
      this.data.checkpoint.room,
      this.data.checkpoint.x,
      this.data.checkpoint.y,
    );
    this.mode = "playing";
    this.input.clear();
    this.ui.hide();
    void this.audio.start();
    this.audio.set(regions[regionOf(this.room)].music);
    if (!resume) this.save(false);
    if (!resume)
      this.notify(
        navigator.maxTouchPoints > 0
          ? "ZIPLA: dokun / basılı tut  •  EL: konuş / kaydet"
          : "A / D hareket  •  Space zıpla  •  E konuş / etkileşim",
      );
  }
  loadRoom(id: string, x: number, y: number) {
    this.room = rooms[id];
    this.data.room = id;
    if (!this.data.discovered.includes(id)) this.data.discovered.push(id);
    this.player.x = x;
    this.player.y = y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.safeX = x;
    this.player.safeY = y;
    this.player.invuln = 0.8;
    this.player.airDash = true;
    this.enemies = this.room.enemies
      .filter(
        (e) =>
          !isBoss(e.kind) ||
          !this.data.bosses.includes(e.kind === "boss" ? "bellkeeper" : e.kind),
      )
      .map((e) => makeEnemy(e.kind, e.x, e.y, e.id));
    this.platforms = this.room.platforms.map((p) => ({ ...p, originY: p.y }));
    this.shots = [];
    this.camera.x = clamp(
      x - this.renderer.w * 0.44,
      0,
      this.room.width - this.renderer.w,
    );
    this.camera.y = clamp(y - 450, 0, this.room.height - 720);
    this.transition = 0.6;
    this.roomTitle = 3.4;
    this.nearest = null;
    this.oxygen = 14;
    this.bellProgress = [];
    this.audio.set(regions[regionOf(this.room)].music);
  }
  update(dt: number, inputs: boolean) {
    this.time += dt;
    this.data.playTime += dt;
    this.transition = Math.max(0, this.transition - dt);
    this.roomTitle = Math.max(0, this.roomTitle - dt);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.updateParticles(dt);
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return false;
    }
    const p = this.player;
    const controls = {
      down: (a: Parameters<Input["down"]>[0]) => this.input.down(a),
      tap: (a: Parameters<Input["tap"]>[0]) => inputs && this.input.tap(a),
    };
    for (const plat of this.platforms)
      if (plat.kind === "moving") {
        const prev = plat.y;
        plat.y = plat.originY! + Math.sin(this.time * 0.75) * 40;
        if (
          p.grounded &&
          p.x + p.w > plat.x &&
          p.x < plat.x + plat.w &&
          Math.abs(p.y + p.h - prev) < 3
        )
          p.y += plat.y - prev;
      }
    const collision = [...this.platforms];
    if (this.room.id === "chimes" && !this.data.puzzleSolved)
      collision.push({ x: 1810, y: 310, w: 45, h: 420 });
    if (this.room.id === "bell" && !this.data.bossDefeated)
      collision.push({ x: 1870, y: 350, w: 50, h: 380 });
    if (this.room.id === "afterglow" && !p.dash)
      collision.push({ x: 600, y: 370, w: 42, h: 430 });
    for (const prop of this.room.props)
      if (
        prop.kind === "gate" &&
        regionOf(this.room) !== "grove" &&
        !gateOpen(this.data, prop.id as Room["exits"][number]["gate"])
      )
        collision.push({ x: prop.x - 22, y: 0, w: 44, h: 730 });
    const submerged = this.waterLevel() < p.y + 20;
    if (submerged && !this.data.tide) {
      this.oxygen = Math.max(0, this.oxygen - dt);
      if (!this.oxygen) this.hazard();
    } else this.oxygen = Math.min(14, this.oxygen + dt * 5);
    const safe = [p.safeX, p.safeY];
    const movement = movePlayer(
      p,
      controls,
      collision,
      dt,
      this.data.dash,
      submerged && this.data.tide,
    );
    if (
      this.room.hazards.some(
        (h) => overlaps(p, h) && !(h.type === "heat" && this.data.ember),
      )
    ) {
      [p.safeX, p.safeY] = safe;
    }
    if (movement.jump) {
      this.audio.effect("jump");
      this.burst(p.x + 17, p.y + 68, 6, "#94cec4");
    }
    if (movement.land) {
      this.audio.effect("land");
      this.burst(p.x + 17, p.y + 68, 8, "#667e7a");
    }
    if (movement.dash) {
      this.audio.effect("dash");
      this.burst(p.x, p.y + 30, 20, "#9be6db");
    }
    if (controls.tap("parry") && !p.parryCooldown && !p.dash && !p.attack) {
      p.parry = 0.17;
      p.parryCooldown = 0.65;
      this.audio.effect("ui");
    }
    if (controls.tap("attack") && !p.heal && p.attack < 0.09 && !p.parry) {
      p.combo = p.comboWindow > 0 ? (p.combo % 3) + 1 : 1;
      p.comboWindow = 0.65;
      p.attack = 0.32;
      p.hitIds.clear();
      p.charging = 0;
      this.audio.effect("attack");
    }
    if (controls.down("attack") && !p.attack) p.charging += dt;
    if (!controls.down("attack") && p.charging > 0.6) {
      p.attack = 0.4;
      p.combo = 3;
      p.hitIds.clear();
      p.charging = 0;
      this.audio.effect("attack");
    } else if (!controls.down("attack") && !p.attack) p.charging = 0;
    if (p.attack > 0.07 && p.attack < 0.27)
      this.events(
        strike(
          p,
          this.enemies,
          attackBox(p, controls.down("down"), controls.down("up")),
          (p.combo === 3 ? 3 : p.combo === 2 ? 2 : 1) +
            (this.data.equipped === "keen" ? 1 : 0),
          controls.down("down") && !p.grounded,
        ),
      );
    const burstCost = this.data.equipped === "focus" ? 30 : 35;
    const healCost = this.data.equipped === "focus" ? 30 : 40;
    if (controls.tap("ability") && p.energy >= burstCost) {
      p.energy -= burstCost;
      p.hitIds.clear();
      this.burst(p.x + 17, p.y + 35, 35, "#efcf82");
      this.audio.effect("parry");
      this.events(
        strike(
          p,
          this.enemies,
          { x: p.x - 190, y: p.y - 155, w: 420, h: 370 },
          5,
          false,
        ),
      );
    }
    if (
      controls.tap("heal") &&
      !p.heal &&
      p.energy >= healCost &&
      p.hp < p.maxHp &&
      p.grounded
    ) {
      p.energy -= healCost;
      p.heal = 0.8;
    }
    if (p.heal > 0 && p.heal <= dt * 1.5) {
      p.hp = clamp(p.hp + 2, 0, p.maxHp);
      this.audio.effect("heal");
      this.burst(p.x + 17, p.y + 35, 18, "#f3d78f");
    }
    this.events(
      updateEnemies(
        this.enemies,
        p,
        dt,
        this.shots,
        this.settings.assist,
        this.data.equipped === "aegis" ? 0.75 : 1,
      ),
    );
    const boss = this.enemies.find((e) => isBoss(e.kind) && e.hp > 0);
    if (boss)
      this.audio.set(
        boss.kind === "cantor"
          ? "cantor"
          : boss.kind === "ashknight"
            ? "ashboss"
            : "boss",
        boss.phase,
      );
    for (const h of this.room.hazards)
      if (overlaps(p, h) && !(h.type === "heat" && this.data.ember)) {
        this.hazard();
        break;
      }
    if (p.y > 900) this.hazard();
    if (p.hp <= 0 && this.mode === "playing") {
      this.mode = "dead";
      this.deathTimer = 1.1;
      p.anim = "death";
      p.animTime = 0;
      this.audio.effect("death");
      this.burst(p.x + 17, p.y + 35, 30, "#ceb97f");
      this.ui.death();
      return true;
    }
    this.nearest = null;
    for (const prop of this.room.props) {
      if (
        ["flowers", "arch", "gate", "vent"].includes(prop.kind) ||
        (prop.id &&
          this.data.collected.includes(prop.id) &&
          ["upgrade", "fragment", "relic"].includes(prop.kind))
      )
        continue;
      if (Math.hypot(p.x + 17 - prop.x, p.y + 68 - prop.y) < 135) {
        this.nearest =
          prop.kind === "bell"
            ? `Çan ${["I", "II", "III"][prop.note!]}`
            : prop.kind === "shrine"
              ? "Kaydet / dinlen"
              : prop.kind === "npc"
                ? "Konuş"
                : ["upgrade", "fragment", "relic"].includes(prop.kind)
                  ? "Al"
                  : prop.kind === "valve"
                    ? "Vanayı çevir"
                    : prop.kind === "switch"
                      ? "Halkayı döndür"
                      : "Hatırayı oku";
        if (controls.tap("interact")) this.interact(prop);
        break;
      }
    }
    if (inputs && controls.tap("interact") && !this.nearest) {
      const exit = this.room.exits.find((e) => e.side === "down");
      if (exit && p.x < 230 && gateOpen(this.data, exit.gate))
        this.enterExit(exit);
    }
    for (const exit of this.room.exits) {
      const boundary =
        (exit.side === "right" && p.x > this.room.width - 55) ||
        (exit.side === "left" && p.x < 10) ||
        (exit.side === "up" && p.y < 220 && p.x > 1730);
      if (boundary) {
        if (!gateOpen(this.data, exit.gate)) {
          p.x = exit.side === "right" ? this.room.width - 80 : 65;
          this.notify(
            exit.gate === "dash"
              ? "Çan Muhafızı bu geçidi koruyor."
              : exit.gate === "tide"
                ? "Batık Kantor’un nefesi bu mührü açar."
                : exit.gate === "ember"
                  ? "Kül Şövalyesi’nin kor mührü gerekiyor."
                  : exit.gate === "sluice"
                    ? "Vanayı III konumuna getir."
                    : exit.gate === "forge"
                      ? "Halkaları taşın gösterdiği sıraya getir."
                      : "Üç çanın ezgisini tamamla.",
          );
        } else {
          this.enterExit(exit);
          break;
        }
      }
    }
    p.x = clamp(p.x, 0, this.room.width - p.w);
    const targetX = clamp(
      p.x - this.renderer.w * 0.46 + p.vx * 0.14,
      0,
      this.room.width - this.renderer.w,
    );
    const targetY = clamp(p.y - 430, 0, this.room.height - 720);
    this.camera.x += (targetX - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (targetY - this.camera.y) * Math.min(1, dt * 4);
    return true;
  }
  waterLevel() {
    const water = this.room.water;
    if (!water) return Infinity;
    return water.levels?.[this.data.switches[water.control!] ?? 0] ?? water.y;
  }
  enterExit(exit: Room["exits"][number]) {
    this.loadRoom(exit.to, ...exit.spawn);
  }
  events(events: CombatEvent[]) {
    for (const e of events) {
      this.audio.effect(e.type);
      if (e.type === "hit") {
        this.hitstop = 0.045;
        this.shake = 4;
        this.burst(e.x, e.y, 12, "#f7d58e");
      } else if (e.type === "hurt") {
        this.shake = 8;
        this.burst(e.x, e.y, 12, "#cc938f");
      } else if (e.type === "parry") {
        this.hitstop = 0.085;
        this.shake = 6;
        this.burst(e.x, e.y, 28, "#d5fff2");
        this.notify("KUSURSUZ SAVUŞTURMA");
      } else if (e.type === "kill") {
        this.data.currency += 12;
        this.burst(e.x, e.y, 20, "#7ab9b4");
      } else if (e.type === "boss-defeat") {
        const kind = (e.kind || "boss") as Enemy["kind"];
        if (!awardBoss(this.data, kind)) continue;
        this.shots = [];
        this.player.hp = this.player.maxHp;
        this.player.energy = this.player.maxEnergy;
        this.audio.set("victory");
        this.burst(e.x, e.y, 55, "#efce86");
        const lines =
          kind === "cantor"
            ? [
                "Suyun altında saklanan ezgi yeniden yükseldi. Kantor, boğulanların isimlerini bırakmadı.",
                "GELGİT NEFESİ AÇILDI — Su altında sınırsız nefes. ZIPLA / W basılı tut: yukarı yüz; S / ↓: aşağı yüz.",
                "Doğudaki derin mührü aç. Eski su yollarında daha yükseğe yüzebilirsin. Mira’nın üç ezgi parçasını bul.",
              ]
            : kind === "ashknight"
              ? [
                  "Şövalye ateşi düşmanlarından değil, hatıralarından saklıyordu.",
                  "KOR MUHAFIZI AÇILDI — Zemindeki kor alanları artık zarar vermez. Kor mühürleri açıldı.",
                  "Fırın Kilidi’ndeki alt kasaya geri dön. Wren’in son kor parçası orada. Üçüncü rezonans seni doğudaki taça çağırıyor.",
                ]
              : [
                  "Çan susmadı. Yalnızca yeniden dinlemeyi öğrendi.",
                  "REZONANS DASH AÇILDI — Shift / dokunmatik DASH. Havada bir kez kullanılabilir.",
                  "Hatıranın Eşiği’ndeki ışık perdesinden dash ile geç. Doğuda Batık Katedral seni bekliyor.",
                ];
        this.dialogue(
          kind === "cantor"
            ? "İkinci Rezonans"
            : kind === "ashknight"
              ? "Üçüncü Rezonans"
              : "İlk Rezonans",
          lines,
          "boss",
        );
        this.save(false);
      }
    }
  }
  hazard() {
    const p = this.player;
    if (p.invuln > 0.9) return;
    p.hp = Math.max(0, p.hp - (this.settings.assist ? 0.5 : 1));
    p.x = p.safeX;
    p.y = p.safeY;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.3;
    this.oxygen = 14;
    this.shake = 5;
    this.audio.effect("hurt");
  }
  respawn() {
    this.player.hp = this.data.maxHealth;
    this.player.energy = this.data.maxEnergy;
    this.loadRoom(
      this.data.checkpoint.room,
      this.data.checkpoint.x,
      this.data.checkpoint.y,
    );
    this.mode = "playing";
    this.ui.hide();
    this.notify("Fener seni yeniden hatırladı.");
  }
  interact(prop: Room["props"][number]) {
    if (prop.kind === "shrine") {
      this.data.checkpoint = {
        room: this.room.id,
        x: prop.x - 17,
        y: prop.y - 68,
      };
      if (!this.data.collected.includes(`shrine:${prop.id}`))
        this.data.collected.push(`shrine:${prop.id}`);
      this.player.hp = this.player.maxHp;
      this.player.energy = this.player.maxEnergy;
      this.audio.set("shrine");
      this.save();
      this.audio.effect("save");
      this.burst(prop.x, prop.y - 70, 28, "#f6db94");
    } else if (prop.kind === "bell") {
      this.audio.bell(prop.note!);
      if (this.data.puzzleSolved) {
        this.notify("Ezgi zaten hatırlandı. Kapı açık.");
        return;
      }
      const result = ringBell(this.bellProgress, prop.note!);
      this.bellProgress = result.progress;
      this.burst(prop.x, prop.y - 120, 16, "#e8cc88");
      if (result.solved) {
        this.data.puzzleSolved = true;
        this.data.currency += 25;
        this.notify("Melodi hatırlandı. Avlunun kapısı açıldı.");
        this.save(false);
      } else
        this.notify(
          this.bellProgress.length
            ? `${this.bellProgress.map((n) => ["I", "II", "III"][n]).join(" → ")} …`
            : "Uyumsuz nota. Taştaki ipucunu ara.",
        );
    } else if (prop.kind === "valve" || prop.kind === "switch") {
      const id = prop.id!;
      this.data.switches[id] = ((this.data.switches[id] ?? 0) + 1) % 3;
      this.audio.bell(this.data.switches[id]);
      const open = gateOpen(
        this.data,
        prop.kind === "valve" ? "sluice" : "forge",
      );
      this.notify(
        open
          ? "Mekanizma ezgiyi buldu. Doğu kapısı açıldı."
          : `${prop.kind === "valve" ? "Su vanası" : "Fırın halkası"}: ${["I", "II", "III"][this.data.switches[id]]}`,
      );
      this.save(false);
    } else if (prop.kind === "fragment" || prop.kind === "relic") {
      if (this.data.collected.includes(prop.id!)) return;
      this.data.collected.push(prop.id!);
      if (prop.kind === "relic" && !this.data.relics.includes(prop.id!))
        this.data.relics.push(prop.id!);
      this.data.currency += 10;
      this.audio.effect("collect");
      this.burst(prop.x, prop.y - 35, 24, "#dce9c9");
      this.save(false);
      this.notify(
        prop.kind === "relic"
          ? `${relics[prop.id as keyof typeof relics].name} alındı. Eşyalardan kuşan.`
          : `${prop.text} alındı. Sahibine dön.`,
      );
    } else if (prop.kind === "upgrade") {
      if (this.data.collected.includes(prop.id!)) return;
      this.data.collected.push(prop.id!);
      if (prop.id?.endsWith("energy")) {
        this.data.maxEnergy = Math.min(250, this.data.maxEnergy + 25);
        this.player.maxEnergy = this.data.maxEnergy;
        this.player.energy = this.data.maxEnergy;
      } else {
        this.data.maxHealth = Math.min(20, this.data.maxHealth + 1);
        this.player.maxHp = this.data.maxHealth;
        this.player.hp = this.data.maxHealth;
      }
      this.notify(`${prop.text} • kapasite arttı`);
      this.audio.effect("collect");
      this.burst(prop.x, prop.y - 25, 24, "#f7d896");
      this.save(false);
    } else if (prop.kind === "lore") {
      if (!this.data.collected.includes(prop.id!))
        this.data.collected.push(prop.id!);
      this.dialogue("Hatıra Parçası", [prop.text!], "lore");
    } else if (prop.kind === "npc") {
      this.data.npc++;
      if (prop.id === "elda")
        this.dialogue(
          "Elda • Fener Bekçisi",
          [
            "Bu ışık yolu göstermez, Nilo. Yolu hatırlar.",
            "Kayıt fenerinde dinlen. Doğudaki çanlar bir kapıyı koruyor. Taşlara işlenen sırayı bul.",
            "Yaralanınca H ile 40 rezonans harcayıp iyileşebilirsin. Düşmanın altın parıltısında K ile savuştur.",
          ],
          "npc",
        );
      else if (prop.id === "mira" || prop.id === "wren") {
        const result = returnFragments(this.data, prop.id);
        if (result.complete) {
          this.player.maxHp = this.data.maxHealth;
          this.player.hp = this.player.maxHp;
          this.save(false);
          this.audio.effect("collect");
        }
        const mira = prop.id === "mira";
        const lines = result.complete
          ? [
              mira
                ? "Üç parça. Üç kayıp isim. Ezgiyi tamamladın, Nilo. İçindeki ışık büyüsün. (+1 yaşam, 75 öz)"
                : "Küller hâlâ ılık. Onları hatırladığın için zırh seni hatırlayacak. (Hatıra Zırhı, 75 öz)",
            ]
          : result.returned
            ? [
                mira
                  ? "Katedral yeniden nefes alıyor. Kusursuz değil; ama artık yalnız da değil."
                  : "Ateşin içinden bir isim kurtardın. Bir dünya böyle başlar.",
              ]
            : [
                mira
                  ? "Suyun yuttuğu ezgim üç parçaya ayrıldı. Galeri, arşiv ve organ geçidinde ara."
                  : "Ocağım üç kor parçasını kaybetti. Tüneller ve dökümhanede iki tanesi; üçüncüsü kor mühürlü kasada.",
                `Bulunan parçalar: ${result.count} / 3. Üçünü bulup bana dön.`,
              ];
        this.dialogue(
          mira ? "Mira • Son Korist" : "Wren • Kül Demircisi",
          lines,
          "npc",
        );
      } else {
        const lines = [
          "Çizdiğim her yol, ertesi gün biraz değişiyor. Ama çan avlusu yerinde kaldı.",
          "Muhafızın ağır darbesinden önce çanı yükselir. Zıpla; dalga zemini tarar. Toparlanırken yaklaş.",
        ];
        if (this.data.currency >= 40 && this.data.maxHealth < 14) {
          lines.push("40 hatıra özü karşılığında fenerini güçlendirebilirim.");
          this.ui.choicePending = true;
        }
        this.dialogue("Orin • Kayıp Haritacı", lines, "npc");
      }
    }
  }
  buyUpgrade() {
    if (this.data.currency >= 40 && this.data.maxHealth < 14) {
      this.data.currency -= 40;
      this.data.maxHealth++;
      this.player.maxHp = this.data.maxHealth;
      this.player.hp = this.player.maxHp;
      this.save(false);
      this.notify("Orin fenerini güçlendirdi. +1 yaşam");
      this.audio.effect("collect");
    }
  }
  dialogue(name: string, lines: string[], portrait: string) {
    this.dialogueName = name;
    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueTime = 0;
    this.dialoguePortrait = portrait;
    this.mode = "dialogue";
    this.input.clear();
    this.ui.dialogue();
  }
  advanceDialogue() {
    const text = this.dialogueLines[this.dialogueIndex];
    if (this.dialogueTime * 45 < text.length) {
      this.dialogueTime = text.length / 45;
      return;
    }
    if (++this.dialogueIndex >= this.dialogueLines.length) {
      this.mode = "playing";
      this.input.clear();
      this.ui.hide();
      this.onDialogueEnd?.();
      this.onDialogueEnd = null;
    } else {
      this.dialogueTime = 0;
    }
  }
  save(show = true) {
    this.data.health = this.player.hp;
    this.data.maxHealth = this.player.maxHp;
    this.data.maxEnergy = this.player.maxEnergy;
    const ok = this.store.save(this.slot, this.data);
    if (show)
      this.notify(
        ok
          ? "Kaydedildi • yaşam ve rezonans yenilendi"
          : "Kayıt yapılamadı. Tarayıcı depolaması dolu olabilir.",
      );
  }
  notify(message: string) {
    this.toast = message;
    this.toastTimer = 4;
  }
  burst(x: number, y: number, n: number, color: string) {
    const max = this.settings.quality === "low" ? 100 : 220;
    for (let i = 0; i < n && this.particles.length < max; i++) {
      const angle = Math.random() * Math.PI * 2,
        speed = 30 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.6,
        max: 1,
        size: 1 + Math.random() * 3,
        color,
      });
    }
  }
  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 85 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  handleMenus() {
    if (this.mode === "dialogue") {
      if (
        this.input.tap("interact") ||
        this.input.tap("jump") ||
        this.input.tap("attack")
      )
        this.advanceDialogue();
      return;
    }
    if (this.mode === "title") return;
    if (this.input.tap("pause")) {
      if (this.mode === "playing") {
        this.mode = "pause";
        this.ui.pause();
      } else if (this.mode === "pause") {
        this.resume();
      }
    }
    if (
      this.mode === "playing" &&
      (this.input.tap("map") || this.input.tap("inventory"))
    ) {
      this.mode = "pause";
      this.input.tap("map") ? this.ui.map() : this.ui.inventory();
    } else if (this.mode === "pause" && this.input.tap("map")) this.resume();
  }
  resume() {
    this.mode = "playing";
    this.input.clear();
    this.ui.hide();
  }
  returnTitle() {
    this.save(false);
    this.mode = "title";
    this.input.clear();
    this.ui.title();
    this.audio.set("title");
  }
}

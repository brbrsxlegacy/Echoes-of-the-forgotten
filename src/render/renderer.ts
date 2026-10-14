import {
  regions,
  regionOf,
  isBoss,
  bossDefinitions,
  gateOpen,
} from "../world/regions";
import { rooms } from "../world/rooms";
import type { Game } from "../core/game";
import type { Assets } from "./assets";
import { clamp, type Enemy, type Prop } from "../core/types";
import frames from "../../public/assets/frames.json";
export class Renderer {
  ctx: CanvasRenderingContext2D;
  w = 1280;
  h = 720;
  dpr = 1;
  lastSize = "";
  constructor(
    private game: Game,
    private assets: Assets,
  ) {
    this.ctx = game.canvas.getContext("2d", { alpha: false })!;
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  resize() {
    const canvas = this.game.canvas;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      this.game.settings.quality === "low" ||
        (this.game.settings.quality === "auto" && navigator.maxTouchPoints > 0)
        ? 1
        : 2,
    );
    const rect = canvas.getBoundingClientRect();
    const previousWidth = this.w;
    const portrait =
      this.game.mode !== "title" &&
      matchMedia("(max-width: 600px) and (orientation: portrait)").matches;
    this.w = portrait
      ? Math.max(320, Math.round((720 * rect.width) / Math.max(1, rect.height)))
      : 1280;
    if (previousWidth !== this.w && this.game.mode !== "title")
      this.game.camera.x = clamp(
        this.game.player.x - this.w * 0.46,
        0,
        this.game.room.width - this.w,
      );
    const size = `${this.w}:${dpr}`;
    if (size !== this.lastSize) {
      canvas.width = this.w * dpr;
      canvas.height = 720 * dpr;
      this.lastSize = size;
    }
    this.dpr = dpr;
  }
  sprite(
    key: string,
    index: number,
    x: number,
    y: number,
    width: number,
    height: number,
    flip = false,
    rotation = 0,
    alpha = 1,
  ) {
    const img = this.assets.images[key];
    if (!img) return;
    const list =
      key === "nilo"
        ? frames.nilo
        : key === "enemy"
          ? this.assets.enemyFrames
          : (this.assets.regionFrames[key] ?? frames.atlas);
    const frame = list[index];
    if (!frame) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.rotate(rotation);
    c.scale(flip ? -1 : 1, 1);
    c.drawImage(
      img,
      ...(frame as [number, number, number, number]),
      -width / 2,
      -height,
      width,
      height,
    );
    c.restore();
  }
  glow(x: number, y: number, r: number, color: string, alpha = 0.35) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = "screen";
    c.globalAlpha = alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }
  text(
    text: string,
    x: number,
    y: number,
    size = 18,
    color = "#dac99a",
    align: CanvasTextAlign = "left",
  ) {
    const c = this.ctx;
    c.font = `${size}px ${size > 28 ? "Georgia" : "system-ui"}`;
    c.fillStyle = color;
    c.textAlign = align;
    c.fillText(text, x, y);
  }
  draw() {
    const g = this.game,
      c = this.ctx,
      t = g.time;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = "#07121b";
    c.fillRect(0, 0, this.w, 720);
    if (!this.assets.images.world) return;
    const title = g.mode === "title";
    const region = title ? "grove" : regionOf(g.room),
      config = regions[region],
      atlas = config.atlas;
    const cam = title
      ? { x: 180 + Math.sin(t * 0.05) * 120, y: 100 }
      : g.camera;
    c.save();
    c.drawImage(
      this.assets.images[config.world],
      -cam.x * 0.17 - 30,
      -cam.y * 0.1 - 135,
      1500,
      1000,
    );
    c.fillStyle = `rgba(2,15,22,${g.room.tone === 3 ? 0.42 : g.room.tone === 2 ? 0.5 : 0.16})`;
    c.fillRect(0, 0, this.w, 720);
    // Independently moving mid-ground architecture, foliage and foreground assets.
    c.save();
    c.translate(-cam.x * 0.45, -cam.y * 0.35);
    c.globalAlpha = 0.28;
    for (let i = 0; i < 5; i++)
      this.sprite(atlas, 3, 80 + i * 490, 850, 230, 440, false, 0);
    c.restore();
    if (!title) {
      c.save();
      if (g.settings.shake && g.shake > 0)
        c.translate(
          Math.sin(t * 87) * g.shake,
          Math.cos(t * 61) * g.shake * 0.55,
        );
      c.translate(-cam.x, -cam.y);
      for (const h of g.room.hazards) {
        const waterY = h.y - 17;
        const hot = region === "ashen";
        c.fillStyle = hot ? "#8c3419" : "#163d45";
        c.fillRect(h.x, waterY, h.w, 100);
        for (let j = 0; j < 7; j++) {
          c.beginPath();
          c.strokeStyle = hot
            ? j % 2
              ? "#df602c"
              : "#ffd486"
            : j % 2
              ? "#4b9293"
              : "#91c8c0";
          c.globalAlpha = 0.2;
          c.lineWidth = 2;
          c.moveTo(h.x, waterY + j * 8);
          for (let x = 0; x <= h.w; x += 12)
            c.lineTo(
              h.x + x,
              waterY + j * 8 + Math.sin(x * 0.025 + t * 2 + j) * 3,
            );
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      for (const platform of g.platforms) {
        if (
          platform.x + platform.w < cam.x - 150 ||
          platform.x > cam.x + this.w + 150
        )
          continue;
        const wood = platform.kind === "wood" || platform.kind === "moving";
        if (platform.h > 60) {
          c.fillStyle = "#0b1c24";
          c.fillRect(platform.x, platform.y + 20, platform.w, platform.h);
          for (let x = platform.x; x < platform.x + platform.w; x += 210)
            this.sprite(
              atlas,
              region === "grove" ? 1 : 2,
              x + 100,
              platform.y + 220,
              220,
              240,
              false,
              0,
              0.72,
            );
        }
        for (let x = platform.x; x < platform.x + platform.w; x += 250) {
          const width = Math.min(250, platform.x + platform.w - x);
          this.sprite(
            atlas,
            wood ? (region === "grove" ? 2 : 1) : 0,
            x + width / 2,
            platform.y + (wood ? 43 : 82),
            width,
            wood ? 52 : 95,
          );
        }
        if (g.settings.contrast) {
          c.strokeStyle = "#b1ead9";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(platform.x, platform.y);
          c.lineTo(platform.x + platform.w, platform.y);
          c.stroke();
        }
        for (let x = platform.x + 70; x < platform.x + platform.w; x += 260)
          this.sprite(
            atlas,
            region === "grove" ? 6 : 5,
            x,
            platform.y + 5,
            75,
            58,
            false,
            Math.sin(t + x) * 0.025,
            0.85,
          );
      }
      for (const prop of g.room.props) this.prop(prop, t);
      for (const enemy of g.enemies) this.enemy(enemy, t);
      for (const shot of g.shots) {
        this.glow(
          shot.x,
          shot.y,
          35,
          shot.friendly ? "#b9ffda" : "#f9c980",
          0.65,
        );
        c.strokeStyle = shot.friendly ? "#a5ffdd" : "#e7b872";
        c.lineWidth = 3;
        c.beginPath();
        if (shot.type === "wave") {
          c.ellipse(shot.x + 23, shot.y + 18, 20, 30, 0, Math.PI, Math.PI * 2);
        } else if (shot.type === "flame") {
          this.sprite(
            "ashenAtlas",
            28,
            shot.x + shot.w / 2,
            shot.y + shot.h,
            shot.w * 1.8,
            shot.h,
            false,
            0,
            0.9,
          );
          c.moveTo(shot.x, shot.y + shot.h);
          c.lineTo(shot.x + shot.w / 2, shot.y);
          c.lineTo(shot.x + shot.w, shot.y + shot.h);
        } else
          c.arc(
            shot.x + shot.w / 2,
            shot.y + shot.h / 2,
            shot.w / 2,
            0,
            Math.PI * 2,
          );
        c.stroke();
      }
      for (const part of g.particles) {
        c.globalAlpha = Math.min(1, part.life * 2);
        c.fillStyle = part.color;
        c.fillRect(part.x, part.y, part.size, part.size);
      }
      c.globalAlpha = 1;
      if (g.room.water) {
        const level = g.waterLevel();
        const grad = c.createLinearGradient(0, level, 0, 900);
        grad.addColorStop(0, "rgba(78,156,179,.15)");
        grad.addColorStop(1, "rgba(15,60,89,.43)");
        c.fillStyle = grad;
        c.fillRect(0, level, g.room.width, 900 - level);
        c.beginPath();
        c.strokeStyle = "rgba(138,218,227,.65)";
        c.lineWidth = 2;
        for (let x = 0; x <= 1920; x += 16) {
          const y = level + Math.sin(x * 0.028 + t * 1.8) * 3;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      const p = g.player;
      if (g.nearest) {
        const key =
          g.input.device === "gamepad"
            ? "R1"
            : g.input.device === "touch"
              ? "EL"
              : "E";
        this.text(
          `${key}  ${g.nearest}`,
          p.x + 17,
          p.y - 35,
          17,
          "#f2dfaa",
          "center",
        );
      }
      const downExit = g.room.exits.find((e) => e.side === "down");
      if (downExit && p.x < 230)
        this.text(
          `${g.input.device === "touch" ? "EL" : "E"} • ${downExit.label ?? "Kök altı geçidi"} ↓`,
          140,
          700,
          16,
          "#b8cfbd",
          "center",
        );
      // Foreground tree trunks form a separate layer and sway slightly.
      c.restore();
      c.save();
      c.translate(-cam.x * 1.16, -cam.y * 1.08);
      for (let i = 0; i < 4; i++) {
        this.sprite(
          atlas,
          region === "grove" ? 7 : 2,
          -220 + i * 800,
          990,
          260,
          520,
          false,
          Math.sin(t * 0.35 + i) * 0.012,
          0.58,
        );
      }
      c.restore();
    }
    const low =
      g.settings.quality === "low" ||
      (g.settings.quality === "auto" &&
        (g.fps < 42 || matchMedia("(pointer:coarse)").matches));
    if (!low) {
      c.save();
      c.globalCompositeOperation = "screen";
      for (let i = 0; i < 4; i++) {
        const x = 380 + i * 210 + Math.sin(t * 0.15 + i) * 25;
        c.fillStyle = "rgba(208,195,143,.026)";
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 35, 0);
        c.lineTo(x - 170, 720);
        c.lineTo(x - 450, 720);
        c.fill();
      }
      c.restore();
    }
    c.save();
    for (let i = 0; i < (low ? 20 : 50); i++) {
      const x =
        ((((i * 113.27 + t * (8 + (i % 5)) - cam.x * 0.7) % (this.w + 80)) +
          (this.w + 80)) %
          (this.w + 80)) -
        40;
      const y = ((i * 61.9 + Math.sin(t * 0.6 + i) * 23) % 760) - 20;
      const a = 0.15 + (Math.sin(t + i) + 1) * 0.18;
      c.globalAlpha = a;
      c.fillStyle =
        region === "ashen"
          ? i % 4 === 0
            ? "#ffd598"
            : "#e16c3a"
          : i % 4 === 0
            ? "#dfc690"
            : "#6fc8c0";
      c.beginPath();
      c.arc(x, y, i % 3 === 0 ? 2 : 1, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // Animated fog consists of broad translucent gradients; no baked collision artwork.
    for (let i = 0; i < (low ? 1 : 3); i++) {
      const x = 300 + i * 420 + Math.sin(t * 0.1 + i) * 160;
      const gradient = c.createRadialGradient(
        x,
        570 + i * 35,
        5,
        x,
        570 + i * 35,
        480,
      );
      gradient.addColorStop(0, "rgba(108,155,166,.07)");
      gradient.addColorStop(1, "transparent");
      c.fillStyle = gradient;
      c.fillRect(0, 360, this.w, 360);
    }
    const v = c.createRadialGradient(
      this.w / 2,
      340,
      Math.min(230, this.w / 3),
      this.w / 2,
      340,
      800,
    );
    v.addColorStop(0, "transparent");
    v.addColorStop(1, "rgba(0,7,12,.66)");
    c.fillStyle = v;
    c.fillRect(0, 0, this.w, 720);
    c.restore();
    if (!title) {
      c.save();
      c.translate(-cam.x, -cam.y);
      this.player(t);
      c.restore();
      this.hud();
    }
    if (g.transition > 0) {
      c.fillStyle = `rgba(3,12,19,${(g.transition / 0.6) * 0.7})`;
      c.fillRect(0, 0, this.w, 720);
    }
  }
  player(t: number) {
    const g = this.game,
      c = this.ctx;
    const p = g.player;
    const anim = p.anim;
    let index = 8;
    if (anim === "run") index = Math.floor(p.animTime * 13) % 8;
    else if (anim === "idle") index = 8 + (Math.floor(t * 2) % 2);
    else if (anim === "jump") index = 10;
    else if (anim === "fall") index = 11;
    else if (anim === "land") index = 12;
    else if (anim === "wall") index = 14;
    else if (anim === "dash") index = 15;
    else if (anim === "attack")
      index = 16 + Math.min(7, Math.floor((0.32 - p.attack) * 23));
    else if (anim === "parry") index = 24 + (Math.floor(t * 13) % 2);
    else if (anim === "hit") index = 26;
    else if (anim === "heal") index = 27 + (Math.floor(t * 6) % 2);
    else if (anim === "death") index = 30 + (g.deathTimer < 0.6 ? 1 : 0);
    const flash = p.invuln > 0 && Math.floor(t * 13) % 2 === 0;
    this.glow(p.x + 17, p.y + 25, 75, "#89baac", 0.14);
    if (p.dash) {
      for (let i = 3; i > 0; i--)
        this.sprite(
          "nilo",
          15,
          p.x + 17 - p.dir * i * 33,
          p.y + 70,
          92,
          92,
          p.dir < 0,
          0,
          0.13 * (4 - i),
        );
    }
    this.sprite(
      "nilo",
      index,
      p.x + 17,
      p.y + 70,
      index >= 16 && index <= 23 ? 120 : 92,
      anim === "death" ? 65 : 94,
      p.dir < 0,
      0,
      flash ? 0.35 : 1,
    );
    if (p.attack > 0) {
      c.save();
      c.translate(p.x + 17, p.y + 25);
      c.scale(p.dir, 1);
      c.strokeStyle = "rgba(250,223,158,.8)";
      c.lineWidth = 4;
      c.beginPath();
      if (g.input.down("down") && !p.grounded) c.arc(0, 40, 70, 0, Math.PI);
      else if (g.input.down("up")) c.arc(0, 0, 85, Math.PI, Math.PI * 2);
      else c.arc(5, 0, 82, -1.4, 1.3);
      c.stroke();
      c.restore();
    }
    if (p.parry > 0) {
      c.strokeStyle = "#edffff";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(p.x + 17, p.y + 32, 60, 0, Math.PI * 2);
      c.stroke();
    }
    if (p.charging > 0.3)
      this.glow(p.x + 17, p.y + 35, 100, "#fae09d", p.charging / 3);
  }
  prop(prop: Prop, t: number) {
    const g = this.game,
      c = this.ctx;
    const region = regionOf(g.room),
      atlas = regions[region].atlas;
    if (prop.kind === "shrine") {
      this.glow(
        prop.x,
        prop.y - 100,
        185,
        "#f0bf6d",
        0.42 + Math.sin(t * 2) * 0.03,
      );
      this.sprite(atlas, 4, prop.x, prop.y + 3, 140, 215);
    } else if (prop.kind === "npc") {
      this.sprite(
        atlas,
        region === "grove" ? 11 : 24,
        prop.x,
        prop.y + 2,
        100,
        140,
        false,
        Math.sin(t * 0.8) * 0.007,
      );
    } else if (prop.kind === "bell") {
      this.sprite(
        "atlas",
        5,
        prop.x,
        prop.y + 5,
        115,
        180,
        false,
        Math.sin(t * 1.2 + prop.note!) * 0.008,
      );
      this.text(
        ["I", "II", "III"][prop.note!],
        prop.x,
        prop.y - 197,
        24,
        "#c5b477",
        "center",
      );
      if (g.bellProgress.includes(prop.note!))
        this.glow(prop.x, prop.y - 120, 95, "#f2d391", 0.4);
    } else if (prop.kind === "flowers")
      this.sprite(
        atlas,
        region === "grove" ? 6 : 5,
        prop.x,
        prop.y + 5,
        100,
        100,
        false,
        Math.sin(t) * 0.025,
      );
    else if (prop.kind === "arch")
      this.sprite(atlas, 3, prop.x, prop.y + 5, 220, 360, false, 0, 0.82);
    else if (prop.kind === "lore") {
      this.sprite(atlas, 0, prop.x, prop.y + 3, 48, 36);
      this.glow(
        prop.x,
        prop.y - 24,
        60,
        "#97e7d4",
        g.data.collected.includes(prop.id!) ? 0.12 : 0.4,
      );
      this.text("✧", prop.x, prop.y - 20, 28, "#bee8d6", "center");
    } else if (
      prop.kind === "upgrade" &&
      !g.data.collected.includes(prop.id!)
    ) {
      this.glow(prop.x, prop.y - 35, 90, "#e2c382", 0.5);
      if (region !== "grove")
        this.sprite(
          atlas,
          27,
          prop.x,
          prop.y - 10 + Math.sin(t * 2) * 7,
          55,
          70,
        );
      else
        this.text(
          "◆",
          prop.x,
          prop.y - 20 + Math.sin(t * 2) * 7,
          34,
          "#ebd29b",
          "center",
        );
    } else if (prop.kind === "gate") {
      const open =
        prop.id === "dash" && region === "grove"
          ? false
          : gateOpen(g.data, prop.id as Parameters<typeof gateOpen>[1]);
      if (!open) {
        const x =
          region === "grove" ? (prop.id === "dash" ? 620 : 1830) : prop.x;
        if (region !== "grove")
          this.sprite(atlas, 29, prop.x, prop.y, 175, 360, false, 0, 0.85);
        this.glow(x, prop.y - 130, 190, "#82dfd4", 0.2);
        for (let i = 0; i < 7; i++) {
          c.strokeStyle = `rgba(109,217,205,${0.25 + Math.sin(t * 2 + i) * 0.12})`;
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x - 20 + i * 6, prop.y);
          c.bezierCurveTo(
            x + Math.sin(t + i) * 30,
            prop.y - 100,
            x + Math.cos(t + i) * 25,
            prop.y - 220,
            x - 20 + i * 6,
            prop.y - 340,
          );
          c.stroke();
        }
      }
    }
  }
  enemy(e: Enemy, t: number) {
    const c = this.ctx,
      g = this.game;
    if (e.hp <= 0 && e.timer < -0.2) return;
    const dead = e.hp <= 0;
    const alpha = dead ? clamp((e.timer + 0.2) / 0.9, 0, 1) : 1;
    let index = 8,
      height = 80,
      width = 100;
    let frame = 0;
    const boss = isBoss(e.kind);
    const region = regionOf(g.room);
    const expanded = region !== "grove";
    if (boss) {
      index =
        12 +
        (e.state === "windup"
          ? 1
          : e.state === "attack"
            ? 2
            : e.state === "recover"
              ? 3
              : 0);
      height = 265;
      width = 250;
    } else {
      const row = e.kind === "moth" ? 0 : e.kind === "husk" ? 1 : 2;
      frame =
        row * 6 +
        (e.hurt > 0 || dead
          ? 5
          : e.state === "windup"
            ? 3
            : e.state === "attack"
              ? 4
              : Math.floor(t * 7) % 3);
      index = e.kind === "moth" ? 8 : e.kind === "husk" ? 9 : 10;
      height = e.kind === "moth" ? 75 : e.kind === "husk" ? 90 : 115;
      width = e.kind === "moth" ? 95 : e.kind === "husk" ? 100 : 145;
    }
    if (expanded) {
      const offset = dead
        ? 5
        : e.hurt > 0
          ? 5
          : e.state === "windup"
            ? 3
            : e.state === "attack"
              ? 4
              : Math.floor(t * 6) % 3;
      index = boss
        ? 18 +
          (dead
            ? 5
            : e.state === "windup"
              ? 1
              : e.state === "attack"
                ? 2
                : e.state === "recover"
                  ? 3
                  : e.phase === 3
                    ? 4
                    : 0)
        : (["diver", "ashwalker"].includes(e.kind) ? 6 : 12) + offset;
      width = boss
        ? 250
        : e.kind === "leech"
          ? 115
          : e.kind === "warden"
            ? 150
            : 130;
      height = boss ? e.h + 25 : e.kind === "leech" ? 90 : e.h + 35;
    }
    const x = e.x + e.w / 2,
      y = e.y + e.h + (e.kind === "moth" ? 0 : 5);
    if (e.state === "windup") {
      this.glow(x, y - height / 2, 110, boss ? "#e4ba78" : "#f7d99b", 0.5);
      this.text("!", x, y - height - 23, 32, "#f2d398", "center");
    }
    if (boss && e.phase === 3) this.glow(x, y - 150, 250, "#cd7854", 0.15);
    if (expanded && e.state === "windup") {
      c.strokeStyle = regions[region].color;
      c.lineWidth = 2;
      c.globalAlpha = 0.7;
      if (e.pattern === 2 && boss) {
        for (let i = -1; i <= 1; i++) {
          const x = e.targetX + i * 150;
          c.strokeRect(x - 25, 715, 50, 10);
          this.glow(x, 705, 60, regions[region].color, 0.2);
        }
      }
      if (e.pattern === 1 && boss) {
        c.beginPath();
        c.moveTo(x, 700);
        c.lineTo(x + e.attackDir * 320, 700);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    this.sprite(
      expanded
        ? regions[region].atlas
        : this.assets.images.enemy && !boss
          ? "enemy"
          : "atlas",
      expanded ? index : this.assets.images.enemy && !boss ? frame : index,
      x,
      y,
      width,
      height,
      e.dir > 0,
      e.kind === "moth"
        ? Math.sin(t * 6) * 0.07
        : e.state === "attack"
          ? 0.08 * e.dir
          : Math.sin(t * 1.8) * 0.012,
      alpha,
    );
    if (e.hurt > 0 && g.settings.flashes) {
      c.save();
      c.globalAlpha = 0.3;
      c.fillStyle = "#f4d39a";
      c.fillRect(e.x, e.y, e.w, e.h);
      c.restore();
    }
    if (e.hp > 0 && !boss && e.hp < e.maxHp) {
      c.fillStyle = "#193e43";
      c.fillRect(x - 25, e.y - 20, 50, 3);
      c.fillStyle = "#d8c48e";
      c.fillRect(x - 25, e.y - 20, (50 * e.hp) / e.maxHp, 3);
    }
  }
  hud() {
    const g = this.game,
      c = this.ctx,
      p = g.player;
    c.save();
    c.fillStyle = "rgba(3,12,20,.7)";
    c.fillRect(28, 25, 260, 82);
    for (let i = 0; i < p.maxHp; i++) {
      c.save();
      c.translate(51 + i * Math.min(27, 190 / p.maxHp), 49);
      c.rotate(Math.PI / 4);
      c.fillStyle =
        p.hp >= i + 1 ? "#e7cd8d" : p.hp > i ? "#9c986f" : "#273b42";
      c.fillRect(-6, -6, 12, 12);
      c.strokeStyle = "#8f886c";
      c.lineWidth = 1;
      c.strokeRect(-6, -6, 12, 12);
      c.restore();
    }
    c.fillStyle = "#25464a";
    c.fillRect(45, 78, 190, 5);
    c.fillStyle = "#7cc7bd";
    c.fillRect(45, 78, (190 * p.energy) / p.maxEnergy, 5);
    this.text(`✦ ${g.data.currency}`, 257, 83, 14, "#d3c194", "right");
    this.text("NILO", 45, 99, 10, "#a3b6ad");
    const touch =
      g.input.device === "touch" ||
      navigator.maxTouchPoints > 0 ||
      matchMedia("(pointer:coarse)").matches;
    const controls = touch
      ? "Dokunmatik kontroller"
      : g.input.device === "gamepad"
        ? "✕ Zıpla • □ Vur • ○ Dash • L1 Savuştur"
        : "Space Zıpla   J Vur   K Savuştur   L Patlama   H İyileş";
    this.text(controls, this.w / 2, 685, 13, "#9dac9d", "center");
    if (this.w > 700)
      this.text(
        regions[regionOf(g.room)].english,
        this.w - 50,
        47,
        12,
        "#a3b0a0",
        "right",
      );
    this.text(
      `${g.data.discovered.length} / ${Object.keys(rooms).length}  oda`,
      this.w > 700 ? this.w - 50 : 257,
      67,
      11,
      "#798e89",
      "right",
    );
    if (g.data.dash && this.w > 700)
      this.text(
        `${g.data.ember ? "KOR MUHAFIZI  •  " : ""}${g.data.tide ? "GELGİT NEFESİ  •  " : ""}REZONANS DASH`,
        this.w - 50,
        89,
        12,
        "#cbbb83",
        "right",
      );
    if (g.roomTitle > 0) {
      c.globalAlpha = Math.min(1, g.roomTitle);
      this.text(g.room.name, this.w / 2, 155, 32, "#e8d9b2", "center");
      this.text(g.room.subtitle, this.w / 2, 180, 12, "#98b7b2", "center");
      c.globalAlpha = 1;
    }
    if (g.room.water && p.y + 20 > g.waterLevel() && !g.data.tide) {
      c.fillStyle = "rgba(4,15,25,.8)";
      c.fillRect(this.w / 2 - 80, 110, 160, 23);
      c.fillStyle = "#88c4d6";
      c.fillRect(this.w / 2 - 72, 120, (144 * g.oxygen) / 14, 4);
      this.text(
        `NEFES  ${Math.ceil(g.oxygen)}s`,
        this.w / 2,
        108,
        12,
        "#bbdfed",
        "center",
      );
    }
    const boss = g.enemies.find((e) => isBoss(e.kind) && e.hp > 0);
    if (boss) {
      this.text(
        `${bossDefinitions[boss.kind as keyof typeof bossDefinitions].name.toLocaleUpperCase("tr")}  •  ${["I", "II", "III"][boss.phase - 1]}`,
        this.w / 2,
        605,
        15,
        "#dcc48d",
        "center",
      );
      c.fillStyle = "rgba(3,12,19,.85)";
      c.fillRect(this.w * 0.25, 620, this.w * 0.5, 8);
      c.fillStyle = "#ac8a56";
      c.fillRect(this.w * 0.25, 620, (this.w * 0.5 * boss.hp) / boss.maxHp, 8);
      c.strokeStyle = "#bfaa73";
      c.strokeRect(this.w * 0.25 - 2, 618, this.w * 0.5 + 4, 12);
    }
    if (g.toastTimer > 0) {
      c.globalAlpha = Math.min(1, g.toastTimer);
      c.fillStyle = "rgba(5,18,25,.9)";
      const width = Math.min(900, this.w - 24);
      const lines: string[] = [];
      let line = "";
      for (const word of g.toast.split(" ")) {
        if ((line + word).length > width / 9) {
          lines.push(line.trim());
          line = "";
        }
        line += word + " ";
      }
      if (line) lines.push(line.trim());
      c.fillRect((this.w - width) / 2, 212, width, 22 + lines.length * 22);
      lines.forEach((text, i) =>
        this.text(text, this.w / 2, 239 + i * 22, 16, "#e6d2a1", "center"),
      );
    }
    c.restore();
  }
}

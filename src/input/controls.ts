import type { Settings } from "../core/types.ts";
export type Action =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "attack"
  | "dash"
  | "parry"
  | "ability"
  | "interact"
  | "heal"
  | "pause"
  | "map"
  | "inventory";
export class Input {
  held = new Set<string>();
  previous = new Set<string>();
  pressed = new Set<string>();
  pending = new Set<string>();
  device = "keyboard";
  padIndex: number | null = null;
  constructor(public settings: Settings) {
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement)?.matches("input,select,textarea")) return;
      const action = Object.entries(this.settings.bindings).find(
        ([, k]) => k === e.code,
      )?.[0];
      const fallback: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        ShiftRight: "dash",
      };
      const a = action || fallback[e.code];
      if (a) {
        e.preventDefault();
        if (!this.held.has(a)) this.pending.add(a);
        this.held.add(a);
        this.device = "keyboard";
      }
    });
    window.addEventListener("keyup", (e) => {
      for (const [a, key] of Object.entries(this.settings.bindings))
        if (key === e.code) this.held.delete(a);
      const f: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        ShiftRight: "dash",
      };
      if (f[e.code]) this.held.delete(f[e.code]);
    });
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
    document.querySelectorAll<HTMLElement>("[data-action]").forEach((b) => {
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.pending.add(b.dataset.action!);
        this.held.add(b.dataset.action!);
        this.device = "touch";
        b.classList.add("down");
      });
      const release = () => {
        this.held.delete(b.dataset.action!);
        b.classList.remove("down");
      };
      b.addEventListener("pointerup", release);
      b.addEventListener("pointercancel", release);
      b.addEventListener("lostpointercapture", release);
    });
  }
  private padHeld = new Set<string>();
  poll() {
    for (const a of this.padHeld) this.held.delete(a);
    this.padHeld.clear();
    const pad = Array.from(navigator.getGamepads?.() || []).find(
      (p) => p?.connected,
    );
    this.padIndex = pad?.index ?? null;
    if (pad) {
      const put = (a: string, on: boolean) => {
        if (on) {
          this.held.add(a);
          this.padHeld.add(a);
          this.device = "gamepad";
        }
      };
      put("left", pad.axes[0] < -0.25 || !!pad.buttons[14]?.pressed);
      put("right", pad.axes[0] > 0.25 || !!pad.buttons[15]?.pressed);
      put("up", pad.axes[1] < -0.5 || !!pad.buttons[12]?.pressed);
      put("down", pad.axes[1] > 0.5 || !!pad.buttons[13]?.pressed);
      [
        "jump",
        "dash",
        "attack",
        "ability",
        "parry",
        "interact",
        "heal",
        "heal",
        "map",
        "pause",
      ].forEach((a, i) => put(a, !!pad.buttons[i]?.pressed));
    }
    this.pressed = new Set([
      ...this.pressed,
      ...this.pending,
      ...[...this.held].filter((x) => !this.previous.has(x)),
    ]);
    this.pending.clear();
    this.previous = new Set(this.held);
  }
  down(a: Action) {
    return this.held.has(a);
  }
  tap(a: Action) {
    return this.pressed.has(a);
  }
  clear() {
    this.held.clear();
    this.previous.clear();
    this.pressed.clear();
    this.pending.clear();
    this.padHeld.clear();
  }
}

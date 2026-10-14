import type { Settings } from "../core/types";
// Original generative score: distinct composed motifs, not sampled or borrowed recordings.
const motifs = {
  title: [62, 69, 72, 76, 74, 69, 65, 62],
  grove: [62, 65, 69, 72, 69, 67, 65, 57],
  boss: [50, 57, 60, 62, 65, 62, 60, 57],
  drowned: [57, 64, 67, 71, 69, 64, 62, 59, 57, 60, 64, 67],
  cantor: [45, 52, 57, 60, 59, 55, 52, 48, 50, 57, 55, 52],
  ashen: [48, 55, 58, 62, 60, 55, 53, 51, 48, 51, 55, 58],
  ashboss: [36, 43, 48, 51, 55, 54, 51, 48, 43, 46, 48, 51],
  shrine: [62, 69, 74, 76, 74, 72, 69, 65],
  victory: [62, 65, 69, 74, 77, 76, 74, 69],
};
export class Score {
  context: AudioContext | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  next = 0;
  step = 0;
  mode: keyof typeof motifs = "title";
  enabled = false;
  phase = 1;
  constructor(public settings: Settings) {}
  async start() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.music = this.context.createGain();
        this.music.gain.value = this.settings.music * 0.17;
        this.music.connect(this.context.destination);
        this.sfx = this.context.createGain();
        this.sfx.gain.value = this.settings.sfx * 0.3;
        this.sfx.connect(this.context.destination);
      }
      await this.context.resume();
      this.enabled = true;
      this.next = this.context.currentTime + 0.05;
    } catch {
      this.enabled = false;
    }
  }
  volumes() {
    if (!this.context) return;
    this.music!.gain.setTargetAtTime(
      this.settings.music * 0.17,
      this.context.currentTime,
      0.15,
    );
    this.sfx!.gain.setTargetAtTime(
      this.settings.sfx * 0.3,
      this.context.currentTime,
      0.03,
    );
  }
  set(mode: keyof typeof motifs, phase = 1) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.step = 0;
      if (this.context && this.music) {
        const t = this.context.currentTime;
        this.music.gain.cancelScheduledValues(t);
        this.music.gain.setTargetAtTime(this.settings.music * 0.045, t, 0.06);
        this.music.gain.setTargetAtTime(
          this.settings.music * 0.17,
          t + 0.2,
          0.2,
        );
      }
    }
    this.phase = phase;
  }
  tone(
    freq: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    bus = this.music,
  ) {
    if (!this.context || !bus) return;
    const o = this.context.createOscillator();
    const g = this.context.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), time + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(g);
    g.connect(bus);
    o.start(time);
    o.stop(time + duration + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  tick() {
    if (!this.context || !this.enabled) return;
    const t = this.context.currentTime;
    if (this.next < t - 0.5) this.next = t + 0.02;
    const boss = ["boss", "cantor", "ashboss"].includes(this.mode);
    const beat = boss
      ? 0.28 / Math.min(1.15, 1 + (this.phase - 1) * 0.07)
      : this.mode === "drowned"
        ? 0.74
        : this.mode === "ashen"
          ? 0.56
          : 0.63;
    while (this.next < t + 0.15) {
      const note = motifs[this.mode][this.step % motifs[this.mode].length];
      const freq = 440 * 2 ** ((note - 69) / 12);
      this.tone(freq, this.next, boss ? 0.45 : 2.6, boss ? 0.35 : 0.6, "sine");
      this.tone(freq * 2.002, this.next + 0.012, 0.9, 0.075, "sine");
      if (this.step % 4 === 0) {
        for (const n of [note - 24, note - 17, note - 12])
          this.tone(
            440 * 2 ** ((n - 69) / 12),
            this.next,
            beat * 5,
            0.12,
            "triangle",
          );
      }
      if (this.mode === "drowned" && this.step % 3 === 0)
        this.tone(freq / 4, this.next, 3.8, 0.14, "sine");
      if (this.mode === "ashen" && this.step % 4 === 0)
        this.tone(48, this.next, 0.3, 0.25, "triangle");
      if (boss) {
        this.tone(this.step % 2 ? 82 : 55, this.next, 0.12, 0.5, "triangle");
      }
      this.step++;
      this.next += beat;
    }
  }
  effect(kind: string) {
    if (!this.context || !this.enabled) return;
    const t = this.context.currentTime;
    const freq: Record<string, number> = {
      jump: 360,
      land: 110,
      dash: 720,
      attack: 180,
      hit: 92,
      hurt: 130,
      parry: 1100,
      save: 660,
      collect: 880,
      ui: 420,
      telegraph: 240,
      kill: 160,
      death: 90,
      heal: 520,
    };
    const f = freq[kind] || 320;
    this.tone(
      f,
      t,
      0.18,
      0.8,
      kind === "attack" || kind === "hurt" ? "triangle" : "sine",
      this.sfx,
    );
    if (["parry", "save", "collect", "heal"].includes(kind))
      for (let i = 1; i < 4; i++)
        this.tone(f * 2 ** (i / 4), t + i * 0.07, 0.38, 0.5, "sine", this.sfx);
    if (kind === "dash" || kind === "attack") this.noise(t, 0.13);
  }
  bell(note: number) {
    if (!this.context) return;
    const f = [293.66, 369.99, 440][note];
    for (let i = 1; i < 5; i++)
      this.tone(
        f * i,
        this.context.currentTime,
        2.8 / i,
        0.7 / i,
        "sine",
        this.sfx,
      );
  }
  noise(t: number, duration: number) {
    if (!this.context || !this.sfx) return;
    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * duration,
      this.context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1300;
    source.connect(filter);
    filter.connect(this.sfx);
    source.start(t);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
    };
  }
}

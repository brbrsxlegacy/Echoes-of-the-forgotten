import {
  regions,
  regionOf,
  isBoss,
  gateOpen,
  relics,
  questItems,
  type RegionId,
} from "../world/regions";
import type { Game } from "../core/game";
import { rooms } from "../world/rooms";
export class UI {
  overlay = document.querySelector<HTMLElement>("#overlay")!;
  screen = "title";
  choicePending = false;
  markers = new Set<string>();
  constructor(private g: Game) {
    document.documentElement.classList.toggle(
      "touch-device",
      navigator.maxTouchPoints > 0 || matchMedia("(pointer:coarse)").matches,
    );
    document.querySelector("#pause-button")!.addEventListener("click", () => {
      if (g.mode === "playing") {
        g.mode = "pause";
        this.pause();
      } else if (g.mode === "pause") g.resume();
    });
    document.querySelector("#map-button")!.addEventListener("click", () => {
      if (g.mode === "playing") {
        g.mode = "pause";
        this.map();
      } else if (g.mode === "pause") g.resume();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && g.mode === "playing") {
        g.mode = "pause";
        this.pause();
      }
    });
  }
  loading(progress: number) {
    document.querySelector<HTMLElement>("#load-progress")!.style.width =
      `${progress * 100}%`;
    document.querySelector("#load-label")!.textContent =
      `Ezgiler yükleniyor • %${Math.round(progress * 100)}`;
  }
  error(error: string) {
    this.overlay.innerHTML =
      '<div class="panel"><h1>Veylora yüklenemedi</h1><p>Bağlantıyı kontrol edip sayfayı yenile.</p><pre></pre></div>';
    this.overlay.querySelector("pre")!.textContent = error;
  }
  shell(content: string, cls = "panel") {
    this.overlay.hidden = false;
    this.overlay.className =
      cls === "title-view" ? "title-overlay" : "panel-overlay";
    this.overlay.innerHTML = `<section class="${cls}">${content}</section>`;
    this.overlay
      .querySelector<HTMLElement>("button:not(:disabled)")
      ?.focus({ preventScroll: true });
    this.sync();
  }
  bind(id: string, fn: () => void) {
    this.overlay.querySelector(`#${id}`)?.addEventListener("click", () => {
      void this.g.audio.start();
      this.g.audio.effect("ui");
      fn();
    });
  }
  title() {
    this.screen = "title";
    const saved = [0, 1, 2].map((i) => this.g.store.load(i));
    const has = saved.some(Boolean);
    this.shell(
      `<span class="brand">BRBRS <b>GAMES</b> <i>presents</i></span><div class="title-lockup"><span class="eyebrow">A LOST MELODY. A WORLD WORTH REMEMBERING.</span><h1>ECHOES<span>OF THE</span>FORGOTTEN</h1><div class="ornament">─── ◇ ───</div><p class="subtitle">Unutulanların Yankısı</p></div><div class="menu-list"><button id="continue" ${has ? "" : "disabled"}>Devam Et <small>Continue</small></button><button id="new">Yeni Yolculuk <small>New Game</small></button><button id="load">Kayıtlar <small>Load Game</small></button><button id="settings">Ayarlar <small>Settings</small></button><button id="controls">Kontroller <small>Controls</small></button><button id="credits">Emeği Geçenler <small>Credits</small></button></div><div class="title-footer"><span>VEY L O R A · ÜÇ KAYIP EZGİ</span><span>0.3 • KORU / KATEDRAL / KÜL</span></div>`,
      "title-view",
    );
    this.bind("continue", () => {
      const newest = saved
        .map((s, i) => ({ s, i }))
        .filter((x) => x.s)
        .sort((a, b) => b.s!.timestamp - a.s!.timestamp)[0];
      this.g.start(newest.i, true);
    });
    this.bind("new", () => this.slots(false));
    this.bind("load", () => this.slots(true));
    this.bind("settings", () => this.settings());
    this.bind("controls", () => this.controls());
    this.bind("credits", () => this.credits());
  }
  slots(load: boolean) {
    this.screen = "slots";
    this.shell(
      `<span class="eyebrow">HATIRANIN FENERLERİ</span><h2>${load ? "Kayıt yükle" : "Bir yolculuk seç"}</h2><p>Üç bağımsız kayıt. İlerleme etkinleştirdiğin fenerden devam eder.</p><div class="slots">${[
        0, 1, 2,
      ]
        .map((i) => {
          const s = this.g.store.load(i);
          return `<button id="slot-${i}" ${load && !s ? "disabled" : ""}><strong>Fener ${i + 1}</strong><span>${s ? `${rooms[s.checkpoint.room].name} · ${s.dash ? "Dash açık" : "İlk ezgi aranıyor"}` : "Henüz bir hatıra yok"}</span><small>${s ? `${s.discovered.length}/${Object.keys(rooms).length} oda · ${Math.floor(s.playTime / 60)} dk · ${new Date(s.timestamp).toLocaleDateString("tr-TR")}` : "Yeni yolculuk"}</small></button>`;
        })
        .join("")}</div><button class="secondary" id="back">Geri</button>`,
    );
    for (let i = 0; i < 3; i++)
      this.bind(`slot-${i}`, () => {
        if (!load && this.g.store.load(i)) {
          this.shell(
            `<h2>Fener ${i + 1} yeniden başlasın mı?</h2><p>Bu kayıttaki ilerleme yeni yolculukla değişecek.</p><button id="yes">Yeni yolculuğu başlat</button><button id="no" class="secondary">Geri</button>`,
          );
          this.bind("yes", () => this.g.start(i, false));
          this.bind("no", () => this.slots(false));
        } else this.g.start(i, load);
      });
    this.bind("back", () => this.back());
  }
  hide() {
    this.overlay.hidden = true;
    this.screen = "game";
    this.sync();
  }
  sync() {
    document
      .querySelector("#game-shell")!
      .classList.toggle("in-game", this.g.mode !== "title");
    this.g.renderer.resize();
    const playing = ["playing", "dialogue", "dead"].includes(this.g.mode);
    document.querySelector<HTMLElement>("#quick")!.hidden = !playing;
    document
      .querySelector<HTMLElement>("#touch")!
      .classList.toggle("visible", playing);
    document
      .querySelector<HTMLElement>("#landscape-hint")!
      .classList.toggle("enabled", playing);
    document.documentElement.style.setProperty(
      "--touch-scale",
      String(this.g.settings.touchScale),
    );
    document.documentElement.style.setProperty(
      "--touch-offset",
      `${this.g.settings.touchHeight}px`,
    );
  }
  pause() {
    this.screen = "pause";
    this.shell(
      `<span class="eyebrow">VEY L O R A</span><h2>Bir an sessizlik</h2><p>${this.g.room.name}</p><div class="menu-list"><button id="resume">Devam et</button><button id="map">Harita</button><button id="inventory">Hatıralar & Eşyalar</button><button id="settings">Ayarlar</button><button id="controls">Kontroller</button><button id="main" class="secondary">Ana menüye dön</button></div><small>İlerleme kaydedilir. Son fenerden devam edersin.</small>`,
    );
    this.bind("resume", () => this.g.resume());
    this.bind("map", () => this.map());
    this.bind("inventory", () => this.inventory());
    this.bind("settings", () => this.settings());
    this.bind("controls", () => this.controls());
    this.bind("main", () => this.g.returnTitle());
  }
  back() {
    this.g.mode === "title" ? this.title() : this.pause();
  }
  map(region: RegionId = regionOf(this.g.room)) {
    this.screen = "map";
    const g = this.g;
    try {
      this.markers = new Set(
        JSON.parse(localStorage.getItem(`echoes-markers-${g.slot}`) || "[]"),
      );
    } catch {}
    const discovered = g.data.discovered;
    const nodes = Object.values(rooms).filter(
      (r) => discovered.includes(r.id) && regionOf(r) === region,
    );
    const x = (col: number) => 62 + col * 110,
      y = (row: number) => 35 + row * 100;
    const paths: string[] = [];
    for (const r of nodes)
      for (const exit of r.exits) {
        const to = rooms[exit.to];
        if (discovered.includes(to.id) && regionOf(to) === region) {
          paths.push(
            `<line x1="${x(r.map[0]) + 43}" y1="${y(r.map[1]) + 28}" x2="${x(to.map[0]) + 43}" y2="${y(to.map[1]) + 28}" stroke="#617c79" stroke-width="2"/>`,
          );
        } else
          paths.push(
            `<text x="${x(r.map[0]) + 92}" y="${y(r.map[1]) + 30}" fill="#a79361">?</text>`,
          );
      }
    const cells = nodes
      .map(
        (r) =>
          `<g class="map-room" data-room="${r.id}" tabindex="0" role="button" aria-label="${r.name}"><rect x="${x(r.map[0])}" y="${y(r.map[1])}" width="86" height="56" rx="4" fill="${r.id === g.room.id ? "#365953" : "#16313c"}" stroke="${r.id === g.room.id ? "#e6c780" : "#597975"}"/><text x="${x(r.map[0]) + 43}" y="${y(r.map[1]) + 21}" text-anchor="middle" fill="#d5d5bf" font-size="9">${r.name}</text><text x="${x(r.map[0]) + 43}" y="${y(r.map[1]) + 42}" text-anchor="middle" fill="#dabd7b" font-size="15">${r.id === g.room.id ? "◆" : r.props.some((p) => p.kind === "shrine") ? "✧" : r.enemies.some((e) => isBoss(e.kind)) ? "♜" : "·"}${this.markers.has(r.id) ? " ⚑" : ""}${r.exits.some((e) => e.gate && !gateOpen(g.data, e.gate)) ? " ◇" : ""}</text></g>`,
      )
      .join("");
    this.shell(
      `<span class="eyebrow">ORIN'İN PARŞÖMENİ</span><h2>${regions[region].name}</h2><div class="region-tabs">${Object.entries(
        regions,
      )
        .map(
          ([id, r]) =>
            `<button id="region-${id}" class="${id === region ? "active" : "secondary"}">${r.name}</button>`,
        )
        .join(
          "",
        )}</div><svg class="world-map" viewBox="0 0 870 360" aria-label="Keşfedilen gerçek odaların haritası">${paths.join("")}${cells}</svg><p class="map-legend">◆ Nilo &nbsp; ✧ Fener &nbsp; ♜ Boss &nbsp; ◇ Yetenek / mekanizma kilidi &nbsp; ? Keşfedilmemiş yol</p><p>Odaya dokun: işaret koy. Etkin bir fener seç: hızlı yolculuk.</p><div id="map-selected"></div><button class="secondary" id="back">Geri</button><button id="resume">Oyuna dön</button>`,
      "panel wide",
    );
    for (const id of Object.keys(regions) as RegionId[])
      this.bind(`region-${id}`, () => this.map(id));
    for (const el of this.overlay.querySelectorAll<HTMLElement>(
      "[data-room]",
    )) {
      const activate = () => {
        const id = el.dataset.room!;
        const r = rooms[id];
        this.markers.has(id) ? this.markers.delete(id) : this.markers.add(id);
        try {
          localStorage.setItem(
            `echoes-markers-${g.slot}`,
            JSON.stringify([...this.markers]),
          );
        } catch {}
        const shrine = r.props.find(
          (p) =>
            p.kind === "shrine" && g.data.collected.includes(`shrine:${p.id}`),
        );
        this.overlay.querySelector("#map-selected")!.innerHTML =
          `<p>${r.name} ${this.markers.has(id) ? "• işaretlendi" : ""}</p><p>${r.exits
            .filter((e) => regionOf(rooms[e.to]) !== region)
            .map((e) => `Bağlantı: ${regions[regionOf(rooms[e.to])].name}`)
            .join(
              " · ",
            )}</p>${shrine ? '<button id="travel">Bu fenere git</button>' : ""}`;
        if (shrine)
          this.bind("travel", () => {
            g.loadRoom(id, shrine.x, shrine.y - 68);
            g.resume();
            g.notify("Fenerler arasındaki ezgi seni taşıdı.");
          });
      };
      el.addEventListener("click", activate);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    }
    this.bind("back", () => this.pause());
    this.bind("resume", () => g.resume());
  }
  inventory() {
    this.screen = "inventory";
    const d = this.g.data;
    const collected = d.collected.filter((id) => !id.startsWith("shrine:"));
    this.shell(
      `<span class="eyebrow">NILO'NUN HATIRALARI</span><h2>Yankı İğnesi</h2><p>Eski bir ezginin son parçası. Üç vuruşluk saldırı; havada aşağı vuruş düşmandan sektirir.</p><div class="stats"><span><strong>${d.maxHealth}</strong> Yaşam</span><span><strong>${d.maxEnergy}</strong> Rezonans</span><span><strong>${d.currency}</strong> Hatıra özü</span></div><h3>${d.dash ? "✧ Rezonans Dash" : "◇ Kayıp rezonans"}</h3><p>${d.dash ? "Shift ile ışık perdesinden geç. Havada bir kez; yere inince yenilenir." : "Çan Muhafızı ilk rezonansı koruyor."}</p><h3>Üç kayıp ezgi · ${d.bosses.length} / 3</h3><p>${d.tide ? "✧ Gelgit Nefesi: su altında sınırsız nefes. ZIPLA / W yukarı; ↓ / S aşağı yüz." : "◇ Gelgit Nefesi: Batık Kantor’da."}<br>${d.ember ? "✧ Kor Muhafızı: kor zeminleri ve mühürler geçilebilir." : "◇ Kor Muhafızı: Kül Şövalyesi’nde."}</p><h3>Kuşanılan hatıra</h3><div class="relic-list">${d.relics.map((id) => `<button id="equip-${id}" class="${d.equipped === id ? "active" : "secondary"}">${d.equipped === id ? "✧ " : ""}${relics[id as keyof typeof relics].name}<small>${relics[id as keyof typeof relics].text}</small></button>`).join("") || "<p>Gizli odalarda hatıralar ara.</p>"}</div><p>Tek hatıra kuşanılır. Seçili hatıraya tekrar dokunarak çıkar.</p><h3>Bekleyen ezgiler</h3><p>Mira: ${questItems.mira.filter((id) => d.collected.includes(id)).length} / 3 ${d.quests.includes("mira") ? "• tamamlandı" : ""}<br>Wren: ${questItems.wren.filter((id) => d.collected.includes(id)).length} / 3 ${d.quests.includes("wren") ? "• tamamlandı" : ""}</p><h3>Hatıra defteri · ${collected.length}</h3><div class="journal">${
        collected
          .map((id) => {
            const prop = Object.values(rooms)
              .flatMap((r) => r.props)
              .find((p) => p.id === id);
            return `<p>${prop?.text || id}</p>`;
          })
          .join("") || "<p>Veylora henüz seni hatırlamıyor.</p>"
      }</div><button class="secondary" id="back">Geri</button>`,
    );
    for (const id of d.relics)
      this.bind(`equip-${id}`, () => {
        d.equipped = d.equipped === id ? null : id;
        this.g.save(false);
        this.inventory();
      });
    this.bind("back", () => this.pause());
  }
  settings() {
    this.screen = "settings";
    const s = this.g.settings;
    this.shell(
      `<span class="eyebrow">SESİNİ BUL</span><h2>Ayarlar</h2><div class="settings-grid"><label>Müzik <input id="music" type="range" min="0" max="1" step=".05" value="${s.music}" aria-label="Müzik seviyesi"></label><label>Efekt <input id="sfx" type="range" min="0" max="1" step=".05" value="${s.sfx}" aria-label="Efekt seviyesi"></label><label>Görüntü kalitesi<select id="quality"><option value="auto">Uyarlanabilir</option><option value="high">Yüksek</option><option value="low">Düşük</option></select></label><label>Dokunmatik tuş boyutu<input id="touchScale" type="range" min=".75" max="1.4" step=".05" value="${s.touchScale}"></label><label>Dokunmatik alt boşluk<input id="touchHeight" type="range" min="5" max="90" step="5" value="${s.touchHeight}"></label>${[
        ["shake", "Ekran sarsıntısı"],
        ["flashes", "Parlama efektleri"],
        ["contrast", "Yüksek kontrast"],
        ["assist", "Yardım: alınan hasar yarıya iner"],
      ]
        .map(
          ([id, label]) =>
            `<label class="check"><input type="checkbox" id="${id}" ${s[id as keyof typeof s] ? "checked" : ""}>${label}</label>`,
        )
        .join(
          "",
        )}</div><p>Sesleri susturmak için sürgüleri sıfıra indir. Konuşmalar yazıyla gösterilir.</p><button id="back" class="secondary">Geri</button>`,
    );
    (this.overlay.querySelector("#quality") as HTMLSelectElement).value =
      s.quality;
    this.overlay
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select")
      .forEach((el) =>
        el.addEventListener("input", () => {
          const key = el.id;
          const value =
            el instanceof HTMLInputElement && el.type === "checkbox"
              ? el.checked
              : el instanceof HTMLSelectElement
                ? el.value
                : Number(el.value);
          Object.assign(s, { [key]: value });
          this.g.store.setSettings(s);
          this.g.audio.volumes();
          this.g.renderer.resize();
          this.sync();
        }),
      );
    this.bind("back", () => this.back());
  }
  controls() {
    this.screen = "controls";
    const names: Record<string, string> = {
      left: "Sol",
      right: "Sağ",
      jump: "Zıpla",
      attack: "Saldır / basılı tut: şarj",
      parry: "Savuştur",
      dash: "Dash (boss sonrası)",
      ability: "Echo Burst (35 rezonans)",
      interact: "Etkileşim",
      heal: "İyileş (40 rezonans)",
      map: "Harita",
      inventory: "Eşyalar",
      pause: "Duraklat",
    };
    this.shell(
      `<span class="eyebrow">YOLCULUĞUN RİTMİ</span><h2>Kontroller</h2><div class="bindings">${Object.entries(
        names,
      )
        .map(
          ([a, name]) =>
            `<button data-rebind="${a}">${name}<kbd>${this.g.settings.bindings[a].replace("Key", "").replace("Left", "")}</kbd></button>`,
        )
        .join(
          "",
        )}</div><p>Bir klavye tuşuna dokunup yeni tuşa basarak değiştir. ↑ yukarı, ↓ aşağı saldırı.</p><p><b>Dokunmatik:</b> Sol oklar hareket. ZIPLA, VUR, DASH, KORU, ✦ patlama, EL etkileşim, CAN iyileşme. ↓ + VUR aşağı vuruş.</p><p><b>Kontrolcü:</b> Sol çubuk / D-pad hareket • ✕ zıpla • □ vur • ○ dash • △ patlama • L1 savuştur • R1 etkileşim • L2 iyileş • Options duraklat • Share harita.</p><button id="back" class="secondary">Geri</button>`,
    );
    this.overlay.querySelectorAll<HTMLElement>("[data-rebind]").forEach((b) =>
      b.addEventListener("click", () => {
        b.querySelector("kbd")!.textContent = "Yeni tuş…";
        const handler = (e: KeyboardEvent) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          const action = b.dataset.rebind!;
          const duplicate = Object.entries(this.g.settings.bindings).find(
            ([a, k]) => a !== action && k === e.code,
          );
          if (duplicate) {
            b.querySelector("kbd")!.textContent = "Tuş kullanımda";
          } else {
            this.g.settings.bindings[action] = e.code;
            this.g.store.setSettings(this.g.settings);
            b.querySelector("kbd")!.textContent = e.code.replace("Key", "");
          }
          window.removeEventListener("keydown", handler, true);
          this.g.input.clear();
        };
        window.addEventListener("keydown", handler, { capture: true });
      }),
    );
    this.bind("back", () => this.back());
  }
  credits() {
    this.screen = "credits";
    this.shell(
      `<span class="eyebrow">BRBRS GAMES</span><h2>Echoes of the Forgotten</h2><p>Veylora, Nilo ve tüm hatıraları bu oyun için yaratıldı.</p><p><b>Yaratıcı yön:</b> Barbaros / BRBRS Games<br><b>Geliştirme:</b> Codex<br><b>Çizimler:</b> Bu projeye özel üretilmiş ve oyun atlaslarına dönüştürülmüş özgün görseller<br><b>Müzik:</b> Özgün notalar, Web Audio enstrümanları ve dinamik düzenleme</p><p>Sürüm 0.3: Fısıldayan Koru, Batık Katedral ve Kül Çukuru. 25 oda; Çan Muhafızı, Batık Kantor ve Kül Şövalyesi. Kalan dört bölge ve dokuz boss henüz geliştirilmedi.</p><p>Tarayıcı oyunu ve kurulabilir PWA. Native mobil uygulama değildir.</p><button class="secondary" id="back">Geri</button>`,
    );
    this.bind("back", () => this.title());
  }
  dialogue() {
    this.screen = "dialogue";
    const g = this.g;
    this.shell(
      `<div class="dialogue-head"><img src="/assets/ui/${g.dialogueName.startsWith("Mira") ? "mira" : g.dialogueName.startsWith("Wren") ? "wren" : g.dialoguePortrait === "boss" ? (g.room.id === "cantor" ? "cantor" : g.room.id === "ashknight" ? "ashknight" : "bellkeeper") : g.dialoguePortrait === "npc" ? "lanternkeeper" : "nilo"}-portrait.webp" alt="${g.dialogueName}"><div><span class="eyebrow">UNUTULMAYAN BİR SES</span><h3>${g.dialogueName}</h3></div></div><p id="dialogue-text"></p><div class="dialogue-actions"><button id="next">Devam · E / ZIPLA</button><button id="skip" class="secondary">Geç</button></div><div id="choice"></div>`,
      "dialogue-panel",
    );
    this.overlay.className = "dialogue-overlay";
    this.bind("next", () => g.advanceDialogue());
    this.bind("skip", () => {
      this.choicePending = false;
      g.mode = "playing";
      g.input.clear();
      this.hide();
    });
  }
  death() {
    this.screen = "death";
    this.shell(
      '<span class="eyebrow">FENER SÖNMEDİ</span><h2>Bir an unutuldun.</h2><p>Hatıran seni geri çağırıyor…</p>',
      "death-panel",
    );
  }
  tick() {
    if (this.screen === "dialogue") {
      const g = this.g;
      const text = g.dialogueLines[g.dialogueIndex] || "";
      this.overlay.querySelector("#dialogue-text")!.textContent = text.slice(
        0,
        Math.floor(g.dialogueTime * 45),
      );
      if (
        this.choicePending &&
        g.dialogueIndex === g.dialogueLines.length - 1 &&
        !this.overlay.querySelector("#buy")
      ) {
        this.overlay.querySelector("#choice")!.innerHTML =
          '<button id="buy">40 öz ver • +1 yaşam</button>';
        this.bind("buy", () => {
          g.buyUpgrade();
          this.choicePending = false;
          this.overlay.querySelector("#choice")!.textContent =
            "Fenerin güçlendi.";
        });
      }
    }
    if (
      this.g.input.device === "gamepad" &&
      ["title", "pause"].includes(this.g.mode)
    ) {
      const buttons = [
        ...this.overlay.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ),
      ];
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      if (this.g.input.tap("down") || this.g.input.tap("right"))
        buttons[(index + 1) % buttons.length]?.focus();
      if (this.g.input.tap("up") || this.g.input.tap("left"))
        buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
      if (this.g.input.tap("jump") || this.g.input.tap("attack"))
        (document.activeElement as HTMLButtonElement)?.click();
    }
  }
}

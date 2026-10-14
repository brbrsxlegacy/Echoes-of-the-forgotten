import type { Room, Platform, EnemyKind, Prop } from "../core/types.ts";
const f = (x = 0, w = 1920, y = 730): Platform => ({
  x,
  y,
  w,
  h: 210,
  kind: "stone",
});
const p = (
  x: number,
  y: number,
  w: number,
  kind: Platform["kind"] = "stone",
): Platform => ({ x, y, w, h: 38, kind });
const water = (y: number) => ({ y });
const e = (kind: EnemyKind, x: number, id: string, y?: number) => ({
  kind,
  x,
  y:
    y ??
    (kind === "leech"
      ? 450
      : kind === "cantor"
        ? 515
        : kind === "ashknight"
          ? 500
          : kind === "diver" || kind === "warden"
            ? 640
            : 665),
  id,
});
const shrine = (x: number, id: string): Prop => ({
  kind: "shrine",
  x,
  y: 730,
  id,
});
const lore = (x: number, y: number, id: string, text: string): Prop => ({
  kind: "lore",
  x,
  y,
  id,
  text,
});
const fragment = (x: number, y: number, id: string): Prop => ({
  kind: "fragment",
  x,
  y,
  id,
  text: id.startsWith("canticle") ? "Kayıp ilahi parçası" : "Sönmeyen kor",
});
const up = (x: number, y: number, id: string, text: string): Prop => ({
  kind: "upgrade",
  x,
  y,
  id,
  text,
});
const drowned = (
  id: string,
  name: string,
  map: [number, number],
  data: Partial<Room>,
): Room => ({
  id,
  name,
  region: "drowned",
  subtitle: "BATIK KATEDRAL • İkinci rezonans",
  map,
  width: 1920,
  height: 900,
  tone: 1,
  platforms: [f()],
  hazards: [],
  enemies: [],
  props: [],
  exits: [],
  ...data,
});
const ashen = (
  id: string,
  name: string,
  map: [number, number],
  data: Partial<Room>,
): Room => ({
  id,
  name,
  region: "ashen",
  subtitle: "KÜL ÇUKURU • Üçüncü rezonans",
  map,
  width: 1920,
  height: 900,
  tone: 2,
  platforms: [f()],
  hazards: [],
  enemies: [],
  props: [],
  exits: [],
  ...data,
});
export const expansionRooms: Record<string, Room> = {
  tidevestibule: drowned("tidevestibule", "Suların Eşiği", [0, 1], {
    platforms: [f(), p(610, 620, 240), p(890, 520, 230), p(1180, 620, 230)],
    props: [
      shrine(300, "tidevestibule"),
      { kind: "npc", x: 490, y: 730, id: "mira" },
      lore(
        980,
        520,
        "tide-intro",
        "Mira’nın sözleri: Üç ilahi parçası bulunursa yiten şarkı yeniden söylenebilir. Üçüncü valf dişinde su geri çekilir.",
      ),
      { kind: "vent", x: 1470, y: 730 },
    ],
    exits: [
      { side: "left", to: "afterglow", spawn: [1740, 662] },
      { side: "right", to: "tidegallery", spawn: [80, 662] },
    ],
  }),
  tidegallery: drowned("tidegallery", "Cam Altındaki Ezgiler", [1, 1], {
    platforms: [
      f(0, 560),
      f(780, 1140),
      p(525, 650, 220, "wood"),
      p(840, 620, 240),
      p(1120, 515, 250),
      p(1430, 420, 260),
      p(1730, 530, 190),
    ],
    hazards: [{ x: 560, y: 820, w: 220, h: 80 }],
    water: water(680),
    enemies: [e("diver", 350, "tg-diver"), e("leech", 1020, "tg-leech")],
    props: [
      fragment(1550, 420, "canticle-1"),
      lore(
        1230,
        515,
        "tide-glass",
        "Bu camlar eskiden günün rengini değiştiren ezgiler taşırdı. Suda kalan notalar hâlâ ışıldıyor.",
      ),
      { kind: "vent", x: 1670, y: 730 },
    ],
    exits: [
      { side: "left", to: "tidevestibule", spawn: [1740, 662] },
      { side: "right", to: "tidesluice", spawn: [80, 662] },
      { side: "down", to: "tidecrypt", spawn: [80, 662], label: "Batık arşiv" },
    ],
  }),
  tidecrypt: drowned("tidecrypt", "Sualtı Arşivi", [1, 2], {
    platforms: [
      f(),
      p(460, 620, 240),
      p(730, 530, 230),
      p(990, 440, 230),
      p(1290, 535, 260),
      p(1570, 440, 250),
    ],
    water: water(620),
    enemies: [e("diver", 390, "tc-diver"), e("leech", 1460, "tc-leech")],
    props: [
      fragment(1090, 440, "canticle-2"),
      up(820, 530, "tide-energy", "Rezonans Kabı"),
      { kind: "relic", x: 1690, y: 440, id: "keen", text: "Keskin Ezgi" },
      lore(
        1400,
        535,
        "tide-archive",
        "Kantor suyu bir mezar değil, bir hatıra sandığı yaptı. Korumayı susturmakla karıştırdı.",
      ),
    ],
    exits: [
      { side: "left", to: "tidegallery", spawn: [120, 662] },
      {
        side: "right",
        to: "tidevestibule",
        spawn: [1450, 662],
        label: "Sığınağa kestirme",
      },
    ],
  }),
  tidesluice: drowned("tidesluice", "Üçüncü Diş", [2, 1], {
    platforms: [f(), p(700, 620, 230), p(970, 525, 230), p(1240, 620, 260)],
    water: { y: 500, levels: [500, 640, 825], control: "sluice" },
    enemies: [e("diver", 1340, "ts-diver")],
    props: [
      { kind: "valve", x: 420, y: 730, id: "sluice" },
      lore(
        830,
        620,
        "sluice-clue",
        "Bakır levha: I yükseltir, II dengeler, III boşaltır. Doğudaki kapının ağırlığını yalnızca kuru zemin taşır.",
      ),
      { kind: "gate", x: 1830, y: 730, id: "sluice" },
      { kind: "vent", x: 1040, y: 730 },
    ],
    exits: [
      { side: "left", to: "tidegallery", spawn: [1740, 662] },
      { side: "right", to: "tideorgan", spawn: [80, 662], gate: "sluice" },
    ],
  }),
  tideorgan: drowned("tideorgan", "Kırık Org", [3, 1], {
    platforms: [
      f(0, 450),
      f(1510, 410),
      p(460, 650, 220, "wood"),
      p(720, 555, 210),
      p(960, 470, 220, "wood"),
      p(1220, 575, 230),
      p(1440, 650, 180, "wood"),
    ],
    hazards: [{ x: 450, y: 825, w: 1060, h: 75 }],
    water: water(705),
    enemies: [
      e("leech", 720, "to-leech1"),
      e("leech", 1280, "to-leech2"),
      e("diver", 1690, "to-diver"),
    ],
    props: [
      fragment(1060, 470, "canticle-3"),
      lore(
        1330,
        575,
        "tide-organ",
        "Orgdan çıkan son nefes bir veda değildi. Birisi geri dönsün diye bırakılmış bir işaretti.",
      ),
    ],
    exits: [
      { side: "left", to: "tidesluice", spawn: [1740, 662] },
      { side: "right", to: "tidechoir", spawn: [80, 662] },
    ],
  }),
  tidechoir: drowned("tidechoir", "Son İlahinin Sığınağı", [4, 1], {
    platforms: [f(), p(700, 620, 250), p(990, 520, 250), p(1300, 620, 260)],
    enemies: [e("diver", 1570, "tch-diver")],
    props: [
      shrine(310, "tidechoir"),
      { kind: "npc", x: 510, y: 730, id: "mira" },
      up(1110, 520, "tide-heart", "Yaşam Parçası"),
      lore(
        1420,
        620,
        "cantor-clue",
        "Kantor elini kaldırınca notalar yağar. Kıvrılan su dalgasının üzerinden atla. Altın çekirdeğini yansıttığında ilahisi duraksar.",
      ),
    ],
    exits: [
      { side: "left", to: "tideorgan", spawn: [1740, 662] },
      { side: "right", to: "cantor", spawn: [130, 662] },
    ],
  }),
  cantor: drowned("cantor", "Batık Kantor", [5, 1], {
    platforms: [f(), p(410, 620, 200), p(1270, 620, 200)],
    water: water(790),
    enemies: [e("cantor", 1320, "cantor")],
    props: [{ kind: "arch", x: 960, y: 730 }],
    exits: [
      { side: "left", to: "tidechoir", spawn: [1740, 662] },
      { side: "right", to: "tideabyss", spawn: [90, 662], gate: "tide" },
    ],
  }),
  tideabyss: drowned("tideabyss", "Hatıraların Akıntısı", [6, 1], {
    platforms: [f(), p(650, 620, 240), p(930, 520, 220), p(1200, 620, 250)],
    water: water(420),
    enemies: [e("leech", 1010, "ta-leech")],
    props: [
      shrine(350, "tideabyss"),
      { kind: "gate", x: 570, y: 730, id: "tide" },
      { kind: "relic", x: 1040, y: 520, id: "focus", text: "Sakin Nota" },
      lore(
        1310,
        620,
        "tide-ending",
        "İkinci rezonans suyun altında soluk alıyor. Kül Çukuru’ndaki fırının kalbi, bu soğuk notayı bekliyor.",
      ),
    ],
    exits: [
      { side: "left", to: "cantor", spawn: [1730, 662] },
      { side: "right", to: "ashgate", spawn: [80, 662], gate: "tide" },
    ],
  }),
  ashgate: ashen("ashgate", "Köz Kapısı", [0, 1], {
    platforms: [f(), p(700, 620, 250), p(990, 520, 230), p(1280, 620, 230)],
    enemies: [e("ashwalker", 1500, "ag-walker")],
    props: [
      shrine(320, "ashgate"),
      { kind: "npc", x: 510, y: 730, id: "wren" },
      lore(
        1100,
        520,
        "ash-intro",
        "Wren üç sönmeyen kor arıyor. Bir zamanlar Katedral’in suyu fırını serinletirdi. Şimdi iki bölge de birbirini unuttu.",
      ),
      { kind: "vent", x: 1760, y: 730 },
    ],
    exits: [
      { side: "left", to: "tideabyss", spawn: [1740, 662] },
      { side: "right", to: "ashtunnels", spawn: [80, 662] },
    ],
  }),
  ashtunnels: ashen("ashtunnels", "Yanmış Köklerin Yolu", [1, 1], {
    platforms: [
      f(0, 570),
      f(800, 1120),
      p(520, 650, 250, "wood"),
      p(860, 620, 230),
      p(1110, 525, 250),
      p(1420, 430, 240),
      p(1670, 530, 250),
    ],
    hazards: [{ x: 570, y: 820, w: 230, h: 80 }],
    enemies: [e("ashwalker", 350, "at-walker"), e("warden", 1190, "at-warden")],
    props: [
      fragment(1540, 430, "ember-1"),
      lore(
        1790,
        530,
        "ash-root",
        "Kökler yanınca gölgeler değil, içlerindeki yıllar kül oldu.",
      ),
      { kind: "vent", x: 950, y: 730 },
    ],
    exits: [
      { side: "left", to: "ashgate", spawn: [1740, 662] },
      { side: "right", to: "ashforge", spawn: [80, 662] },
    ],
  }),
  ashforge: ashen("ashforge", "Fırının Üç Sesi", [2, 1], {
    platforms: [f(), p(760, 620, 230), p(1020, 520, 230), p(1310, 620, 250)],
    enemies: [],
    props: [
      { kind: "npc", x: 330, y: 730, id: "wren" },
      { kind: "switch", x: 620, y: 730, id: "forge-a" },
      { kind: "switch", x: 1040, y: 730, id: "forge-b" },
      { kind: "switch", x: 1470, y: 730, id: "forge-c" },
      lore(
        1140,
        520,
        "forge-clue",
        "Fırın levhası: Batı II, orta I, doğu III. Üç diş aynı anda uyumlandığında ağır kapı kalkar.",
      ),
      { kind: "gate", x: 1830, y: 730, id: "forge" },
    ],
    exits: [
      { side: "left", to: "ashtunnels", spawn: [1740, 662] },
      { side: "right", to: "ashfoundry", spawn: [80, 662], gate: "forge" },
      {
        side: "down",
        to: "ashvault",
        spawn: [80, 662],
        label: "Kor mühürlü kasa",
      },
    ],
  }),
  ashvault: ashen("ashvault", "Kor Mührünün Ardında", [2, 2], {
    platforms: [
      f(),
      p(650, 620, 240),
      p(920, 520, 260),
      p(1240, 620, 230),
      p(1490, 530, 270),
    ],
    hazards: [{ x: 570, y: 690, w: 350, h: 40, type: "heat" }],
    enemies: [e("warden", 1270, "av-warden")],
    props: [
      { kind: "gate", x: 570, y: 730, id: "ember" },
      fragment(1030, 520, "ember-3"),
      up(1630, 530, "ash-energy", "Rezonans Kabı"),
      lore(
        1350,
        620,
        "ash-vault",
        "Bu kor metalden değil, vazgeçmeyen bir ustanın avuçlarından kalan sıcaklık.",
      ),
    ],
    exits: [
      { side: "left", to: "ashforge", spawn: [120, 662] },
      {
        side: "right",
        to: "ashgate",
        spawn: [1460, 662],
        gate: "ember",
        label: "Dönüş tüneli",
      },
    ],
  }),
  ashfoundry: ashen("ashfoundry", "Asılı Döküm Köprüsü", [3, 1], {
    platforms: [
      f(0, 430),
      f(1560, 360),
      p(440, 660, 220, "wood"),
      p(700, 565, 220),
      p(950, 500, 200, "moving"),
      p(1180, 575, 230, "wood"),
      p(1460, 660, 240),
    ],
    hazards: [{ x: 430, y: 820, w: 1130, h: 80 }],
    enemies: [e("ashwalker", 1660, "af-walker")],
    props: [
      fragment(1030, 500, "ember-2"),
      lore(
        1310,
        575,
        "ash-foundry",
        "Asılı levhalar hâlâ üretim ritmiyle yükseliyor. Makineler işçilerini bekliyor.",
      ),
      { kind: "vent", x: 830, y: 850 },
    ],
    exits: [
      { side: "left", to: "ashforge", spawn: [1740, 662] },
      { side: "right", to: "ashwatch", spawn: [80, 662] },
    ],
  }),
  ashwatch: ashen("ashwatch", "Son Ustanın Feneri", [4, 1], {
    platforms: [f(), p(720, 620, 230), p(990, 520, 240), p(1300, 620, 260)],
    enemies: [e("warden", 1620, "aw-warden")],
    props: [
      shrine(310, "ashwatch"),
      { kind: "npc", x: 510, y: 730, id: "wren" },
      up(1100, 520, "ash-heart", "Yaşam Parçası"),
      lore(
        1420,
        620,
        "ashknight-clue",
        "Şövalye mızrağını geriye çektiğinde önünü boşalt. Kırmızı işaret ateşin yükseleceği yeri gösterir. Hücumunu savuştur; zırhının notası kırılır.",
      ),
    ],
    exits: [
      { side: "left", to: "ashfoundry", spawn: [1740, 662] },
      { side: "right", to: "ashknight", spawn: [130, 662] },
    ],
  }),
  ashknight: ashen("ashknight", "Kül Şövalyesi", [5, 1], {
    platforms: [f(), p(410, 620, 200), p(1270, 620, 200)],
    enemies: [e("ashknight", 1320, "ashknight")],
    props: [{ kind: "arch", x: 960, y: 730 }],
    exits: [
      { side: "left", to: "ashwatch", spawn: [1740, 662] },
      { side: "right", to: "ashcrown", spawn: [90, 662], gate: "ember" },
    ],
  }),
  ashcrown: ashen("ashcrown", "Üç Ezginin Kavşağı", [6, 1], {
    platforms: [f(), p(650, 620, 230), p(930, 520, 250), p(1240, 620, 260)],
    hazards: [{ x: 600, y: 690, w: 660, h: 40, type: "heat" }],
    props: [
      { kind: "gate", x: 570, y: 730, id: "ember" },
      shrine(350, "ashcrown"),
      lore(
        1040,
        520,
        "three-resonances",
        "Üç ezgi birleşti. Koru hatırlıyor, Katedral nefes alıyor, fırın yeniden ısıtıyor. Nilo bir anlığına kendi adını bir başkasının sesiyle duyuyor. Cam Gözlemevi’ne uzanan yol henüz açılmadı.",
      ),
      { kind: "vent", x: 1520, y: 730 },
    ],
    exits: [{ side: "left", to: "ashknight", spawn: [1730, 662] }],
  }),
};

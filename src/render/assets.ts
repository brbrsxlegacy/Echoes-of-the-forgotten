export class Assets {
  images: Record<string, HTMLImageElement> = {};
  progress = 0;
  regionFrames: Record<string, number[][]> = {};
  enemyFrames: number[][] = [];
  async load(onProgress: (p: number) => void) {
    const files = {
      nilo: "/assets/characters/nilo.webp",
      world: "/assets/environments/grove.webp",
      atlas: "/assets/environments/atlas.webp",
      enemy: "/assets/enemies/enemies.webp",
      drownedWorld: "/assets/environments/drowned.webp",
      drownedAtlas: "/assets/environments/drowned-atlas.webp",
      ashenWorld: "/assets/environments/ashen.webp",
      ashenAtlas: "/assets/environments/ashen-atlas.webp",
    };
    let done = 0;
    await Promise.all(
      Object.entries(files).map(async ([key, src]) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        this.images[key] = img;
        this.progress = ++done / Object.keys(files).length;
        onProgress(this.progress);
      }),
    );
    const r = await fetch("/assets/enemies/frames.json");
    if (!r.ok) throw new Error("Enemy frame data unavailable");
    this.enemyFrames = await r.json();
    for (const region of ["drowned", "ashen"]) {
      const response = await fetch(
        `/assets/environments/${region}-frames.json`,
      );
      if (!response.ok)
        throw new Error(`Region ${region} frame data unavailable`);
      this.regionFrames[`${region}Atlas`] = await response.json();
    }
  }
}

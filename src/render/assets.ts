export class Assets {
  images: Record<string, HTMLImageElement> = {};
  progress = 0;
  enemyFrames: number[][] = [];
  async load(onProgress: (p: number) => void) {
    const files = {
      nilo: "/assets/characters/nilo.webp",
      world: "/assets/environments/grove.webp",
      atlas: "/assets/environments/atlas.webp",
      enemy: "/assets/enemies/enemies.webp",
    };
    let done = 0;
    await Promise.all(
      Object.entries(files).map(async ([key, src]) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        this.images[key] = img;
        this.progress = ++done / 4;
        onProgress(this.progress);
      }),
    );
    const r = await fetch("/assets/enemies/frames.json");
    if (!r.ok) throw new Error("Enemy frame data unavailable");
    this.enemyFrames = await r.json();
  }
}

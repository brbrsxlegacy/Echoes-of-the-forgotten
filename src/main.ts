import "./style.css";
import { Game } from "./core/game";
const game = new Game(document.querySelector<HTMLCanvasElement>("#game")!);
void game.init();
if (import.meta.env.DEV) {
  Object.assign(window, { __game: game });
}
if ("serviceWorker" in navigator && !import.meta.env.DEV)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });

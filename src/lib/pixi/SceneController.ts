import {
  Application,
  Container,
  Graphics,
  Texture,
  TilingSprite,
  FederatedPointerEvent,
  RenderTexture,
  Renderer,
} from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { LoaderConfig } from "../types";
import { LoaderContainer } from "./LoaderContainer";

export interface SceneCallbacks {
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export class SceneController {
  app!: Application;
  viewport!: Viewport;
  private host: HTMLElement;
  private dots!: TilingSprite;
  private loaders = new Map<string, LoaderContainer>();
  private cardsLayer = new Container();
  private cb: SceneCallbacks;
  private dragging: {
    container: LoaderContainer;
    offsetX: number;
    offsetY: number;
  } | null = null;
  private bgColor = 0x0a0a0a;
  private destroyed = false;
  private ready = false;

  constructor(host: HTMLElement, callbacks: SceneCallbacks) {
    this.host = host;
    this.cb = callbacks;
  }

  async init(initialTheme: "dark" | "light", initialLoaders: LoaderConfig[]) {
    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      backgroundColor: initialTheme === "dark" ? 0x0a0a0a : 0xf5f5f5,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    if (this.destroyed) {
      // Init finished after caller called destroy — tear down now.
      try {
        this.app.destroy(true, { children: true });
      } catch {
        /* ignore */
      }
      return;
    }
    this.bgColor = initialTheme === "dark" ? 0x0a0a0a : 0xf5f5f5;
    this.host.appendChild(this.app.canvas);

    this.viewport = new Viewport({
      screenWidth: this.host.clientWidth,
      screenHeight: this.host.clientHeight,
      worldWidth: 8000,
      worldHeight: 8000,
      events: this.app.renderer.events,
    });
    this.viewport.drag({ mouseButtons: "all" }).pinch().wheel().decelerate();
    this.app.stage.addChild(this.viewport);

    this.dots = this.createDotBackground(initialTheme);
    this.viewport.addChildAt(this.dots, 0);
    this.viewport.addChild(this.cardsLayer);

    initialLoaders.forEach((l) => this.addLoader(l));
    this.fitToLoaders();

    this.app.ticker.add(() => {
      if (this.destroyed) return;
      this.loaders.forEach((lc) => lc.step());
      this.dots.tilePosition.set(
        -this.viewport.left % 40,
        -this.viewport.top % 40,
      );
    });

    this.app.renderer.on("resize", () => this.onResize());
    window.addEventListener("resize", this.onResize);

    this.app.stage.eventMode = "static";
    this.app.stage.on("pointerdown", this.onStageDown);
    this.app.stage.on("pointermove", this.onStageMove);
    this.app.stage.on("pointerup", this.onStageUp);
    this.app.stage.on("pointerupoutside", this.onStageUp);

    this.ready = true;
  }

  private createDotBackground(theme: "dark" | "light") {
    const size = 40;
    const g = new Graphics();
    const dotColor = theme === "dark" ? 0x2a2a2a : 0xcccccc;
    g.circle(size / 2, size / 2, 1.2).fill({ color: dotColor, alpha: 1 });
    const tex = this.app.renderer.generateTexture({
      target: g,
      textureSourceOptions: { width: size, height: size },
    });
    const sprite = new TilingSprite({
      texture: tex,
      width: this.host.clientWidth * 4,
      height: this.host.clientHeight * 4,
    });
    sprite.x = -this.host.clientWidth * 2;
    sprite.y = -this.host.clientHeight * 2;
    return sprite;
  }

  private onResize = () => {
    if (this.destroyed) return;
    this.viewport.resize(this.host.clientWidth, this.host.clientHeight);
    this.dots.width = this.host.clientWidth * 4;
    this.dots.height = this.host.clientHeight * 4;
    this.dots.x = -this.host.clientWidth * 2;
    this.dots.y = -this.host.clientHeight * 2;
  };

  private onStageDown = (e: FederatedPointerEvent) => {
    const world = this.viewport.toWorld(e.global);
    // Find topmost card at this point
    const cards = Array.from(this.loaders.values());
    for (let i = cards.length - 1; i >= 0; i--) {
      const card = cards[i];
      const local = { x: world.x - card.x, y: world.y - card.y };
      if (
        local.x >= 0 &&
        local.y >= 0 &&
        local.x <= card.getWidth() &&
        local.y <= card.getHeight()
      ) {
        this.cb.onSelect(card.loaderId);
        this.dragging = {
          container: card,
          offsetX: local.x,
          offsetY: local.y,
        };
        this.viewport.plugins.pause("drag");
        this.cardsLayer.setChildIndex(card, this.cardsLayer.children.length - 1);
        return;
      }
    }
    this.cb.onSelect(null);
  };

  private onStageMove = (e: FederatedPointerEvent) => {
    if (!this.dragging) return;
    const world = this.viewport.toWorld(e.global);
    const nx = world.x - this.dragging.offsetX;
    const ny = world.y - this.dragging.offsetY;
    this.dragging.container.x = nx;
    this.dragging.container.y = ny;
  };

  private onStageUp = () => {
    if (!this.dragging) return;
    const c = this.dragging.container;
    this.cb.onMove(c.loaderId, c.x, c.y);
    this.dragging = null;
    this.viewport.plugins.resume("drag");
  };

  addLoader(config: LoaderConfig) {
    const c = new LoaderContainer(config);
    c.x = config.position.x;
    c.y = config.position.y;
    this.cardsLayer.addChild(c);
    this.loaders.set(config.id, c);
  }

  updateLoader(config: LoaderConfig) {
    const c = this.loaders.get(config.id);
    if (!c) return;
    c.apply(config);
    if (c.x !== config.position.x || c.y !== config.position.y) {
      c.x = config.position.x;
      c.y = config.position.y;
    }
  }

  removeLoader(id: string) {
    const c = this.loaders.get(id);
    if (!c) return;
    c.destroy({ children: true });
    this.loaders.delete(id);
  }

  setSelected(id: string | null) {
    this.loaders.forEach((c, cid) => c.setSelected(cid === id));
  }

  setTheme(theme: "dark" | "light") {
    this.bgColor = theme === "dark" ? 0x0a0a0a : 0xf5f5f5;
    (this.app.renderer as Renderer).background.color = this.bgColor as any;
    // rebuild dot texture
    const old = this.dots;
    const next = this.createDotBackground(theme);
    this.viewport.addChildAt(next, 0);
    this.viewport.removeChild(old);
    old.destroy();
    this.dots = next;
  }

  resetView() {
    this.fitToLoaders();
  }

  private fitToLoaders() {
    if (this.loaders.size === 0) {
      this.viewport.moveCenter(0, 0);
      this.viewport.setZoom(1, true);
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    this.loaders.forEach((c) => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.getWidth());
      maxY = Math.max(maxY, c.y + c.getHeight());
    });
    const padX = 80,
      padY = 80;
    const w = maxX - minX + padX * 2;
    const h = maxY - minY + padY * 2;
    this.viewport.fit(true, w, h);
    this.viewport.moveCenter((minX + maxX) / 2, (minY + maxY) / 2);
  }

  async exportLoaderPng(id: string): Promise<string | null> {
    const c = this.loaders.get(id);
    if (!c) return null;
    const tex = RenderTexture.create({
      width: c.getWidth(),
      height: c.getHeight(),
      resolution: 2,
    });
    // Temporarily reset card position for clean render
    const origX = c.x,
      origY = c.y;
    c.x = 0;
    c.y = 0;
    c.setSelected(false);
    this.app.renderer.render({ container: c, target: tex });
    const canvas = this.app.renderer.extract.canvas(tex);
    c.x = origX;
    c.y = origY;
    const dataUrl = (canvas as HTMLCanvasElement).toDataURL("image/png");
    tex.destroy(true);
    return dataUrl;
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener("resize", this.onResize);
    if (!this.ready) {
      // init() is still pending — it will notice `destroyed` and tear down itself.
      return;
    }
    try {
      this.app.stage.off("pointerdown", this.onStageDown);
      this.app.stage.off("pointermove", this.onStageMove);
      this.app.stage.off("pointerup", this.onStageUp);
      this.app.stage.off("pointerupoutside", this.onStageUp);
      this.app.destroy(true, { children: true, texture: true });
    } catch (err) {
      console.warn("SceneController.destroy:", err);
    }
  }
}

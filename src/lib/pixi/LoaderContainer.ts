import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { LoaderConfig } from "../types";
import { drawCell, hexToNumber } from "./drawCell";

const CARD_W = 280;
const CARD_H = 280;
const ANIM_AREA = 180;
const CARD_RADIUS = 16;
const LABEL_BAR_H = 28;

interface Cell {
  g: Graphics;
  baseX: number;
  baseY: number;
  vx?: number;
  vy?: number;
  ox?: number;
  oy?: number;
}

interface NodeLine {
  g: Graphics;
  a: number;
  b: number;
}

export class LoaderContainer extends Container {
  readonly loaderId: string;
  private bg = new Graphics();
  private selectBorder = new Graphics();
  private anim = new Container();
  private labelText = new Text({ text: "", style: new TextStyle({ fill: 0xffffff }) });
  private footerText = new Text({ text: "", style: new TextStyle({ fill: 0xffffff }) });
  private cells: Cell[] = [];
  private gridSize = 0;
  private nodes: Cell[] = [];
  private nodeLines: NodeLine[] = [];
  private config!: LoaderConfig;
  private tick = 0;
  selected = false;

  constructor(config: LoaderConfig) {
    super();
    this.loaderId = config.id;
    this.addChild(this.bg);
    this.addChild(this.anim);
    this.addChild(this.labelText);
    this.addChild(this.footerText);
    this.addChild(this.selectBorder);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = { contains: (x: number, y: number) => x >= 0 && y >= 0 && x <= CARD_W && y <= CARD_H } as any;
    this.apply(config);
  }

  getWidth() {
    return CARD_W;
  }

  getHeight() {
    return CARD_H;
  }

  setSelected(sel: boolean) {
    if (this.selected === sel) return;
    this.selected = sel;
    this.drawBorder();
  }

  apply(config: LoaderConfig) {
    const prev = this.config;
    this.config = config;
    const gridChanged =
      !prev ||
      prev.grid.size !== config.grid.size ||
      prev.cellShape !== config.cellShape ||
      prev.animation.pattern !== config.animation.pattern;

    this.drawBackground();
    this.drawLabel();
    this.drawFooter();
    this.drawBorder();
    if (gridChanged) this.rebuildAnim();
  }

  private drawBackground() {
    const bgColor = hexToNumber(this.config.colors.background);
    this.bg
      .clear()
      .roundRect(0, 0, CARD_W, CARD_H, CARD_RADIUS)
      .fill({ color: bgColor, alpha: 1 });
  }

  private drawBorder() {
    this.selectBorder.clear();
    if (this.selected) {
      this.selectBorder
        .roundRect(-2, -2, CARD_W + 4, CARD_H + 4, CARD_RADIUS + 2)
        .stroke({ color: 0x3b82f6, width: 2, alignment: 0 });
    }
  }

  private drawLabel() {
    const textColor = hexToNumber(this.config.colors.text);
    this.labelText.text = this.config.displayText;
    this.labelText.style = new TextStyle({
      fill: textColor,
      fontSize: 20,
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
    });
    this.labelText.anchor.set(0.5, 0.5);
    this.labelText.x = CARD_W / 2;
    this.labelText.y = CARD_H - LABEL_BAR_H - 28;
  }

  private drawFooter() {
    const idx = this.loaderId;
    this.footerText.text = `Loader ${idx.length > 3 ? idx.slice(0, 3) : idx}`;
    this.footerText.style = new TextStyle({
      fill: 0x888888,
      fontSize: 11,
      fontFamily: "system-ui, -apple-system, sans-serif",
    });
    this.footerText.anchor.set(0.5, 1);
    this.footerText.x = CARD_W / 2;
    this.footerText.y = CARD_H - 8;
  }

  private rebuildAnim() {
    this.anim.removeChildren().forEach((c) => c.destroy());
    this.cells = [];
    this.nodes = [];
    this.nodeLines = [];
    this.anim.x = (CARD_W - ANIM_AREA) / 2;
    this.anim.y = (CARD_H - ANIM_AREA) / 2 - 14;
    if (this.config.animation.pattern === "node-graph") this.buildNodeGraph();
    else if (this.config.animation.pattern === "scatter") this.buildScatter();
    else this.buildGrid();
  }

  private buildGrid() {
    const size = this.config.grid.size;
    this.gridSize = size;
    const cellSize = (ANIM_AREA / size) * 0.7;
    const pitch = ANIM_AREA / size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const g = new Graphics();
        const cx = (c + 0.5) * pitch;
        const cy = (r + 0.5) * pitch;
        drawCell(
          g,
          this.config.cellShape,
          0,
          0,
          cellSize,
          hexToNumber(this.config.colors.primary),
          1,
        );
        g.x = cx;
        g.y = cy;
        this.anim.addChild(g);
        this.cells.push({ g, baseX: cx, baseY: cy });
      }
    }
  }

  private buildScatter() {
    const count = 28;
    const cellSize = 10;
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const cx = Math.random() * ANIM_AREA;
      const cy = Math.random() * ANIM_AREA;
      drawCell(g, "circle", 0, 0, cellSize, hexToNumber(this.config.colors.primary), 1);
      g.x = cx;
      g.y = cy;
      this.anim.addChild(g);
      this.cells.push({
        g,
        baseX: cx,
        baseY: cy,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        ox: 0,
        oy: 0,
      });
    }
  }

  private buildNodeGraph() {
    const positions = [
      [0.5, 0.12],
      [0.12, 0.88],
      [0.88, 0.88],
      [0.5, 0.52],
    ];
    const nodeSize = 18;
    positions.forEach(([rx, ry]) => {
      const g = new Graphics();
      const cx = rx * ANIM_AREA;
      const cy = ry * ANIM_AREA;
      drawCell(g, "circle", 0, 0, nodeSize, hexToNumber(this.config.colors.primary), 1);
      g.x = cx;
      g.y = cy;
      this.anim.addChild(g);
      this.nodes.push({ g, baseX: cx, baseY: cy });
    });
    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ];
    edges.forEach(([a, b]) => {
      const lineG = new Graphics();
      this.anim.addChildAt(lineG, 0);
      this.nodeLines.push({ g: lineG, a, b });
    });
  }

  step() {
    this.tick++;
    const pattern = this.config.animation.pattern;
    const style = this.config.animation.style;
    const primary = hexToNumber(this.config.colors.primary);
    const inactive = hexToNumber(this.config.colors.inactiveCells);

    if (pattern === "node-graph") {
      this.stepNodeGraph(primary);
      return;
    }
    if (pattern === "scatter") {
      this.stepScatter(primary);
      return;
    }

    const size = this.gridSize;
    const center = (size - 1) / 2;
    const tickRate = Math.max(6, Math.min(60, this.config.animation.fps)) / 24;
    const globalT = this.tick * 0.05 * tickRate;
    this.cells.forEach((cell, i) => {
      const r = Math.floor(i / size);
      const c = i % size;
      let phaseOffset = 0;
      switch (pattern) {
        case "wave-diagonal":
          phaseOffset = (r + c) * 0.45;
          break;
        case "expanding-pulse": {
          const d = Math.sqrt((r - center) ** 2 + (c - center) ** 2);
          phaseOffset = d * 0.6;
          break;
        }
        case "staircase": {
          const step = Math.floor(globalT * 2) % (size + size - 1);
          const onThisStep = r + c === step;
          const t2 = onThisStep ? 1 : 0.15;
          this.applyCellStyle(cell.g, style, t2, primary, inactive);
          return;
        }
      }
      const phase = globalT - phaseOffset;
      const t = (Math.sin(phase) + 1) / 2;
      this.applyCellStyle(cell.g, style, t, primary, inactive);
    });
  }

  private applyCellStyle(
    g: Graphics,
    style: string,
    t: number,
    primary: number,
    inactive: number,
  ) {
    const breathe = this.config.animation.backgroundStyle === "breathe";
    const bgT = breathe ? 0.15 + Math.sin(this.tick * 0.03) * 0.05 : 0.15;
    switch (style) {
      case "pulse-size":
        g.scale.set(0.35 + t * 0.8);
        g.alpha = 0.25 + t * 0.75;
        g.tint = primary;
        break;
      case "pulse-opacity":
        g.scale.set(0.9);
        g.alpha = Math.max(bgT, t);
        g.tint = primary;
        break;
      case "pulse-color":
        g.scale.set(0.9);
        g.alpha = 1;
        g.tint = blendColor(inactive, primary, t);
        break;
    }
  }

  private stepScatter(primary: number) {
    this.cells.forEach((cell) => {
      cell.ox = (cell.ox ?? 0) + (cell.vx ?? 0);
      cell.oy = (cell.oy ?? 0) + (cell.vy ?? 0);
      if (Math.abs(cell.ox!) > 20) cell.vx = -(cell.vx ?? 0);
      if (Math.abs(cell.oy!) > 20) cell.vy = -(cell.vy ?? 0);
      cell.g.x = cell.baseX + cell.ox!;
      cell.g.y = cell.baseY + cell.oy!;
      cell.g.tint = primary;
      const pulse = (Math.sin(this.tick * 0.05 + cell.baseX * 0.02) + 1) / 2;
      cell.g.alpha = 0.3 + pulse * 0.7;
    });
  }

  private stepNodeGraph(primary: number) {
    const t = this.tick * 0.04;
    this.nodes.forEach((n, i) => {
      const pulse = (Math.sin(t - i * 0.5) + 1) / 2;
      n.g.scale.set(0.7 + pulse * 0.6);
      n.g.alpha = 0.5 + pulse * 0.5;
      n.g.tint = primary;
    });
    this.nodeLines.forEach((line, i) => {
      const from = this.nodes[line.a];
      const to = this.nodes[line.b];
      if (!from || !to) return;
      const flash = (Math.sin(t * 1.4 - i * 0.9) + 1) / 2;
      line.g
        .clear()
        .moveTo(from.baseX, from.baseY)
        .lineTo(to.baseX, to.baseY)
        .stroke({ color: primary, width: 2, alpha: 0.15 + flash * 0.7 });
    });
  }
}

function blendColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

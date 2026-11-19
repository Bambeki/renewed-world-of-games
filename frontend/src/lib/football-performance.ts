import type { GraphicsQuality } from "./football-session";

export type FootballFrameSample = {
  frames: number;
  seconds: number;
  fps: number;
  p95FrameMs: number;
  p95WorkMs: number;
};
export type FootballPerformanceReport = FootballFrameSample & {
  quality: GraphicsQuality;
  pixelRatio: number;
  width: number;
  height: number;
  drawCalls: number;
  triangles: number;
  animatedPlayers: number;
};
const scales = [0.5, 0.625, 0.75, 0.875, 1];
const round = (n: number) => Math.round(n * 10) / 10;
const percentile = (samples: number[]) => {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
};

/** Foreground RAF intervals, not a GPU timer or a claim about another device. */
export class FootballFrameMonitor {
  private frameTimes: number[] = [];
  private workTimes: number[] = [];
  private seconds = 0;
  private cooldown = 0;
  private fastWindows = 0;
  private level = scales.length - 1;
  private latest: FootballFrameSample | null = null;
  constructor(private quality: GraphicsQuality = "auto") {}

  get scale() {
    return this.quality === "auto" ? scales[this.level]
      : this.quality === "performance" ? 0.7 : this.quality === "high" ? 1.5 : 1;
  }
  get sample() { return this.latest; }
  resetWindow() {
    this.frameTimes = [];
    this.workTimes = [];
    this.seconds = 0;
    this.fastWindows = 0;
  }
  setQuality(quality: GraphicsQuality) {
    this.quality = quality;
    this.level = scales.length - 1;
    this.cooldown = 0;
    this.latest = null;
    this.resetWindow();
  }
  record(seconds: number, workMs: number) {
    // Focus/resume gaps and invalid clocks must not change the graphics preset.
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 1
      || !Number.isFinite(workMs) || workMs < 0) return false;
    this.cooldown = Math.max(0, this.cooldown - seconds);
    this.frameTimes.push(seconds * 1000);
    this.workTimes.push(workMs);
    this.seconds += seconds;
    if (this.seconds < 2 || this.frameTimes.length < 8) return false;
    this.latest = {
      frames: this.frameTimes.length, seconds: round(this.seconds),
      fps: round(this.frameTimes.length / this.seconds),
      p95FrameMs: round(percentile(this.frameTimes)),
      p95WorkMs: round(percentile(this.workTimes)),
    };
    this.frameTimes = [];
    this.workTimes = [];
    this.seconds = 0;
    if (this.quality !== "auto") return false;
    const slow = this.latest.fps < 48 || this.latest.p95FrameMs > 28;
    const fast = this.latest.fps >= 56 && this.latest.p95FrameMs < 20;
    this.fastWindows = fast ? this.fastWindows + 1 : 0;
    if (this.cooldown > 0) return false;
    if (slow && this.level > 0) {
      this.level--;
    } else if (this.fastWindows >= 3 && this.level < scales.length - 1) {
      this.level++;
    } else return false;
    this.fastWindows = 0;
    this.cooldown = 4;
    return true;
  }
}

/** Bound the drawing buffer even on high-DPI / 4K screens. CSS stays full size. */
export function footballPixelRatio(width: number, height: number, dpr: number, scale: number) {
  const area = Math.max(1, width * height);
  return Math.min(Math.max(0.1, dpr || 1), scale, Math.sqrt(2_000_000 / area));
}

/**
 * Drawing engine of `ui-field-sign`, framework-free: strokes, previous signature, export and
 * canvas painting. The component owns one instance, feeds it pointer and keyboard events, and
 * reads the few flags it renders through `subscribe` / `getSnapshot`.
 */
import {
  containRect,
  IMAGE_DATA_URL,
  type SignPoint,
  type SignRect,
  type SignStroke,
  type SignSvgDrawing,
  strokesBounds,
  strokesToSvg,
  svgToDataUrl,
  traceStroke,
  unionRect,
} from './ui-field-sign-strokes';
import { readSignSvg } from './ui-field-sign-svg';

/** Image format of the emitted value. */
export type FieldSignFormat = 'png' | 'svg';

/** Value carried by the field: a data URL, or `null` while nothing is signed. */
export type FieldSignValue = string | null;

/**
 * Resolution of a PNG export, relative to the drawing frame: crisp on a high-density screen
 * and in print, and the same on every device. The device pixel ratio belongs to the screen
 * the person signed on, not to the document the signature ends up in.
 */
const PNG_EXPORT_SCALE = 2;

/** Ink width used when the custom property cannot be read (no layout). */
const FALLBACK_INK_WIDTH = 2;

/**
 * Colour a probe inherits when `exportColor` does not resolve (a `var()` with no value): an
 * unlikely `rgb()` that tells "unresolved" apart from a genuine black.
 */
const UNRESOLVED_COLOR = 'rgb(1, 2, 3)';

const DEV = process.env.NODE_ENV !== 'production';

function warn(message: string): void {
  if (DEV) console.warn(`[ui-field-sign] ${message}`);
}

/** Where drawing space sits in the box: `box = drawing × scale + (x, y)`. */
interface SignView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** A previous signature received as the value, kept underneath the new strokes. */
interface SignBackground {
  readonly src: string;
  /** `null` until the image has loaded: it is drawn from then on. */
  readonly image: HTMLImageElement | null;
}

/** Everything `clear()` wipes, kept so that `undo()` can bring it back. */
interface SignSnapshot {
  readonly strokes: readonly SignStroke[];
  readonly background: SignBackground | null;
  readonly region: SignRect | null;
  readonly unreadable: string | null;
}

/** What the component renders: changes only when one of these flags does. */
export interface SignPadState {
  /** Nothing signed: no stroke, no previous signature, no stroke under way. */
  readonly isEmpty: boolean;
  /** An unreadable value is all the field holds: no stroke drawn over it yet. */
  readonly showUnreadable: boolean;
  /** Something to clear: a signature, or an unreadable value. */
  readonly canClear: boolean;
}

export interface SignPadOptions {
  readonly format: FieldSignFormat;
  readonly exportColor: string;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /** A stroke ended, or the signature was cleared or undone. Never mid-stroke. */
  readonly onCommit: (value: FieldSignValue) => void;
  /** The previous signature could not be loaded. */
  readonly onImageError: (event: Event) => void;
}

const EMPTY_STATE: SignPadState = { isEmpty: true, showUnreadable: false, canClear: false };

export class SignPad {
  private options: SignPadOptions;
  private canvas: HTMLCanvasElement | null = null;
  private readonly listeners = new Set<() => void>();
  private state: SignPadState = EMPTY_STATE;

  /** Finished strokes, oldest first, in drawing space: `undo()` pops from the end. */
  private strokes: readonly SignStroke[] = [];
  /** A value received from the host, drawn underneath the strokes. */
  private background: SignBackground | null = null;
  /** A stroke is in progress. */
  private drawing = false;
  /** The value received, when it could not be loaded: still the value until replaced. */
  private unreadable: string | null = null;

  /** The box at the first stroke: where the previous signature is fitted. */
  private region: SignRect | null = null;
  /** Drawing space → box. Changes on resize only, never under the pen. */
  private view: SignView = { scale: 1, x: 0, y: 0 };
  /** What the last `clear()` removed, for `undo()`. */
  private cleared: SignSnapshot | null = null;
  /** The stroke under the pen: plain array, mutated per pointer move. */
  private current: SignPoint[] | null = null;
  /** Pointer that owns `current`: a second finger does not draw. */
  private activePointerId: number | null = null;
  /** Drawing area at stroke start, so a move does not force a layout. */
  private padRect: DOMRect | null = null;
  /** Size of the drawing area, in CSS pixels, as last observed. */
  private boxWidth = 0;
  private boxHeight = 0;
  /** `undefined` = not asked yet; `null` = no 2D canvas here. */
  private context: CanvasRenderingContext2D | null | undefined;
  /** Previous signature recoloured in the screen ink, rebuilt only when its inputs change. */
  private silhouette: {
    image: HTMLImageElement;
    color: string;
    key: string;
    canvas: HTMLCanvasElement;
  } | null = null;
  /** Last value handed to `writeValue`: a repeated call is a no-op. */
  private written: FieldSignValue | undefined;
  /** Last value this field emitted: written back by the host, it keeps the strokes. */
  private lastEmitted: FieldSignValue | undefined;
  /** A stroke ended while the previous signature was still loading (PNG export). */
  private commitPending = false;
  /** The last value emitted embeds a previous signature not loaded yet (SVG export). */
  private embedsUnloaded = false;
  /** The box was resized under the pen: the view is refitted once the stroke ends. */
  private viewStale = false;
  /** Half the ink width, in box pixels, at stroke start: how far points stay from the edge. */
  private edgeMargin = 0;
  /** The previous signature read back as one of this field's exports, per source. */
  private readBack: { src: string; drawing: SignSvgDrawing | null } | null = null;
  private animationFrame: number | null = null;

  constructor(options: SignPadOptions) {
    this.options = options;
  }

  // --- Store -----------------------------------------------------------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): SignPadState => this.state;

  /** Recomputes the rendered flags, notifies on change, and repaints. */
  private changed(): void {
    const isEmpty = this.strokes.length === 0 && !this.background && !this.drawing;
    const showUnreadable = this.unreadable !== null && this.strokes.length === 0 && !this.drawing;
    const canClear = !isEmpty || showUnreadable;
    const prev = this.state;
    if (
      prev.isEmpty !== isEmpty ||
      prev.showUnreadable !== showUnreadable ||
      prev.canClear !== canClear
    ) {
      this.state = { isEmpty, showUnreadable, canClear };
      this.listeners.forEach((listener) => listener());
    }
    this.scheduleRedraw();
  }

  // --- Lifecycle ---------------------------------------------------------------

  /** Latest props and callbacks. Disabled or made read-only under the pen drops the stroke. */
  configure(options: SignPadOptions): void {
    const repaint = options.disabled !== this.options.disabled;
    this.options = options;
    if (!this.isInteractive()) this.abandonStroke();
    if (repaint) this.scheduleRedraw();
  }

  /** Binds the canvas; the returned function unbinds it. Safe to call again on a remount. */
  attach(canvas: HTMLCanvasElement): () => void {
    this.canvas = canvas;
    this.context = undefined;
    this.measure();

    let resize: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(() => {
        this.measure();
        this.redraw();
      });
      resize.observe(canvas);
    }

    // The screen ink is a token: a theme or brand switch on <html> repaints it.
    let theme: MutationObserver | undefined;
    if (typeof MutationObserver !== 'undefined') {
      theme = new MutationObserver(() => this.scheduleRedraw());
      theme.observe(canvas.ownerDocument.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-brand', 'class', 'style'],
      });
    }
    this.redraw();

    return () => {
      resize?.disconnect();
      theme?.disconnect();
      if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      if (this.canvas === canvas) this.canvas = null;
    };
  }

  /**
   * The value as the host holds it. The value this field just emitted, written back, keeps the
   * strokes (and the undo history); any other value replaces the picture.
   */
  writeValue(value: FieldSignValue): void {
    if (value === this.written) return;
    this.written = value;
    let next = value || null;
    if (next && !IMAGE_DATA_URL.test(next)) {
      warn(
        'Ignored a value that is not an image data URL: convert a remote signature to a ' +
          'data URL before handing it to the field.',
      );
      next = null;
    }
    if (next === this.lastEmitted) return;
    this.lastEmitted = undefined;
    this.current = null;
    this.activePointerId = null;
    this.commitPending = false;
    this.embedsUnloaded = false;
    this.cleared = null;
    this.viewStale = false;
    this.setRegion(null);
    this.drawing = false;
    this.unreadable = null;
    this.strokes = [];
    this.background = next ? { src: next, image: null } : null;
    this.changed();
    if (next) this.loadBackground(next);
  }

  // --- Clear / undo ------------------------------------------------------------

  /** Removes the whole signature, previous one included, and emits `null`. Undoable. */
  clear(): void {
    // Not under the pen: emptying mid-stroke would emit a blank image that `required` takes
    // for a signature.
    if (!this.state.canClear || this.drawing) return;
    this.cleared = {
      strokes: this.strokes,
      background: this.background,
      region: this.region,
      unreadable: this.unreadable,
    };
    this.setRegion(null);
    this.strokes = [];
    this.background = null;
    this.unreadable = null;
    this.changed();
    this.commit();
  }

  /**
   * Removes the last stroke drawn in this field; with none left, brings back what the last
   * `clear()` removed. A signature received as the value is not a stroke: only `clear()`
   * removes it.
   */
  undo(): void {
    if (this.drawing) return;
    if (this.strokes.length > 0) {
      this.strokes = this.strokes.slice(0, -1);
    } else if (this.cleared) {
      const { strokes, background, region, unreadable } = this.cleared;
      this.cleared = null;
      this.setRegion(region);
      this.strokes = strokes;
      this.background = background;
      this.unreadable = unreadable;
      // Cleared before it had loaded: its `onload` was dropped meanwhile, ask again.
      if (background && !background.image) this.loadBackground(background.src);
    } else {
      return;
    }
    if (this.strokes.length === 0 && !this.background) this.setRegion(null);
    this.changed();
    this.commit();
  }

  focus(): void {
    this.canvas?.focus();
  }

  // --- Pointer -----------------------------------------------------------------

  pointerDown(event: PointerEvent): void {
    const canvas = this.canvas;
    if (!canvas || !this.isInteractive() || this.activePointerId !== null) return;
    // Main button only: a mouse right-click, or a stylus eraser (button 5), does not draw.
    if (event.button !== 0) return;
    // No text selection, no compatibility mouse events, hence no native focus: given back
    // right below.
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks: the stroke still draws, uncaptured.
    }

    if (!this.region) this.setRegion(this.boxRect());
    this.edgeMargin = (this.inkWidth() / 2) * this.view.scale;
    this.activePointerId = event.pointerId;
    this.padRect = canvas.getBoundingClientRect();
    this.current = [this.toPoint(event)];
    this.drawing = true;
    this.changed();
  }

  pointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId || !this.current) return;
    if (this.dropIfLocked()) return;
    // Coalesced events: a fast stroke is sampled at the device rate, not the frame rate.
    const samples = event.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length ? samples : [event]) {
      this.current.push(this.toPoint(sample));
    }
    this.scheduleRedraw();
  }

  /** `pointerup`, `pointercancel` and a lost capture alike: what was drawn is kept. */
  pointerEnd(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId || !this.current) return;
    if (this.dropIfLocked()) return;
    const stroke = this.current;
    this.current = null;
    this.activePointerId = null;
    this.padRect = null;
    this.drawing = false;
    this.strokes = [...this.strokes, stroke];
    this.refitIfStale();
    this.changed();
    this.commit();
  }

  /** `Backspace` / `Ctrl`+`Z` undo, `Delete` clears (undoable too). */
  keyDown(event: KeyboardEvent): void {
    if (!this.isInteractive()) return;
    const undoChord =
      (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
    if (event.key === 'Backspace' || undoChord) {
      event.preventDefault();
      this.undo();
    } else if (event.key === 'Delete') {
      event.preventDefault();
      this.clear();
    }
  }

  private isInteractive(): boolean {
    return !this.options.disabled && !this.options.readOnly;
  }

  /** Drops the stroke under the pen, if any, without committing it. */
  private abandonStroke(): void {
    if (!this.current) return;
    const pointerId = this.activePointerId;
    this.current = null;
    this.activePointerId = null;
    this.padRect = null;
    this.drawing = false;
    if (pointerId !== null && this.canvas?.hasPointerCapture?.(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }
    // A first stroke abandoned leaves nothing: the region it set goes with it, as on undo.
    if (this.strokes.length === 0 && !this.background) this.setRegion(null);
    this.refitIfStale();
    this.changed();
  }

  /**
   * Disabled or made read-only under the pen: the stroke is dropped. Checked on the pointer
   * events too, should one land before `configure()` runs.
   */
  private dropIfLocked(): boolean {
    if (this.isInteractive()) return false;
    this.abandonStroke();
    return true;
  }

  /** Refits the view the box changed size for while a stroke was drawn. */
  private refitIfStale(): void {
    if (!this.viewStale) return;
    this.viewStale = false;
    this.fitView();
  }

  // --- Value -------------------------------------------------------------------

  /** Current picture → value, handed to the host. */
  private commit(): void {
    const bg = this.background;
    let value: FieldSignValue;
    if (this.state.showUnreadable) {
      // An unreadable value stands until something is drawn over it: undoing that stroke
      // brings the host's value back, not `null`.
      value = this.unreadable;
    } else if (this.strokes.length === 0) {
      // Nothing drawn over the previous signature: the value received, word for word. A
      // re-export would change it under a dirty check.
      value = bg?.src ?? null;
    } else if (this.options.format === 'png' && bg && !bg.image) {
      // A PNG export paints the previous signature: wait for it rather than drop it.
      this.commitPending = true;
      return;
    } else {
      value = this.export();
    }
    this.commitPending = false;
    // An SVG export carries the previous signature by reference, loaded or not: should it
    // turn out unreadable, the value is emitted again without it.
    this.embedsUnloaded = this.strokes.length > 0 && !!bg && !bg.image;
    this.lastEmitted = value;
    this.options.onCommit(value);
  }

  private export(): string {
    const lineWidth = this.inkWidth();
    const color = this.resolveExportColor();
    if (this.options.format === 'png') {
      const png = this.exportPng(color, lineWidth);
      if (png) return png;
      // No 2D canvas here, or a canvas the browser refuses to read back: SVG needs neither.
    }
    const bg = this.background;
    return svgToDataUrl(
      strokesToSvg(this.strokes, {
        frame: this.frame(lineWidth),
        color,
        lineWidth,
        background: bg
          ? { href: bg.src, rect: this.backgroundSlot(), drawing: this.readBackground(bg.src) }
          : null,
      }),
    );
  }

  /**
   * The previous signature as one of this field's own SVG exports, read once per value. Never
   * throws: on the commit path, a value it cannot read is kept as an image.
   */
  private readBackground(src: string): SignSvgDrawing | null {
    if (this.readBack?.src !== src) {
      let drawing: SignSvgDrawing | null;
      try {
        drawing = readSignSvg(src);
      } catch {
        drawing = null;
      }
      this.readBack = { src, drawing };
    }
    return this.readBack.drawing;
  }

  /** Repaints on a detached canvas, in the export ink and without the screen tint. */
  private exportPng(color: string, lineWidth: number): string | null {
    const frame = this.frame(lineWidth);
    if (frame.width <= 0 || frame.height <= 0 || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(frame.width * PNG_EXPORT_SCALE);
    canvas.height = Math.round(frame.height * PNG_EXPORT_SCALE);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(PNG_EXPORT_SCALE, PNG_EXPORT_SCALE);
    ctx.translate(-frame.x, -frame.y);
    const image = this.background?.image;
    if (image) {
      const slot = this.backgroundSlot();
      const r = containRect(image.naturalWidth, image.naturalHeight, slot.width, slot.height);
      ctx.drawImage(image, slot.x + r.x, slot.y + r.y, r.width, r.height);
    }
    this.paintStrokes(ctx, this.strokes, color, lineWidth);
    try {
      const png = canvas.toDataURL('image/png');
      // A canvas past the engine's size limit gives `data:,` (iOS) instead of throwing.
      return png.startsWith('data:image/png') ? png : null;
    } catch {
      // A tainted canvas (an SVG previous signature on older WebKit): fall back to SVG rather
      // than leave the host on the old value while the screen shows the new stroke.
      warn('PNG export refused: emitting SVG instead.');
      return null;
    }
  }

  /**
   * `exportColor` resolved where the field sits, a `var(--token)` included, into an `rgb()`
   * an image can carry: a `var()` in an SVG served as an image resolves to nothing. `black`
   * when the value is not a colour or does not resolve.
   */
  private resolveExportColor(): string {
    const value = this.options.exportColor;
    const host = this.canvas?.parentElement;
    if (typeof getComputedStyle === 'undefined' || !host?.isConnected) return value || 'black';
    const outer = host.ownerDocument.createElement('span');
    const probe = host.ownerDocument.createElement('span');
    outer.style.color = UNRESOLVED_COLOR;
    outer.hidden = true;
    probe.style.color = value;
    const parsed = probe.style.color !== '';
    outer.appendChild(probe);
    host.appendChild(outer);
    const resolved = getComputedStyle(probe).color;
    outer.remove();
    if (parsed && resolved && resolved !== UNRESOLVED_COLOR) return resolved;
    warn(`\`exportColor\` "${value}" is not a colour here: using black.`);
    return 'black';
  }

  private loadBackground(src: string): void {
    if (typeof Image === 'undefined') return;
    const image = new Image();
    image.onload = () => {
      if (this.background?.src !== src) return;
      this.background = { src, image };
      this.changed();
      if (this.commitPending) this.commit();
    };
    image.onerror = (event) => {
      if (this.background?.src !== src) return;
      warn('The previous signature could not be loaded.');
      // Shown as unreadable, neither as a signature over a blank box nor as empty while the
      // host holds a value. The value is left alone: an image this browser cannot decode may
      // be a valid signature elsewhere. Clearing it, or signing over it, is the person's call.
      this.background = null;
      this.unreadable = src;
      // Not under the pen: the first stroke's region stays until that stroke ends.
      if (this.strokes.length === 0 && !this.current) this.setRegion(null);
      this.changed();
      // A value already out with this image in it (SVG), or held for it (PNG): the strokes
      // replace it, alone, as the screen shows them.
      if (this.commitPending || this.embedsUnloaded) this.commit();
      this.options.onImageError(event instanceof Event ? event : new Event('error'));
    };
    image.src = src;
  }

  // --- Geometry ----------------------------------------------------------------

  /** The whole box, in box coordinates. */
  private boxRect(): SignRect {
    return { x: 0, y: 0, width: this.boxWidth, height: this.boxHeight };
  }

  /** Sets the region and fits the view on it: identity when it is the box itself. */
  private setRegion(region: SignRect | null): void {
    this.region = region;
    this.fitView();
  }

  /**
   * The exported frame: the region grown to every stroke (half the ink width around them, so
   * round caps are not shaved). The box until a first stroke.
   */
  private frame(lineWidth = this.inkWidth()): SignRect {
    if (!this.region) return this.boxRect();
    return unionRect(this.region, strokesBounds(this.strokes, lineWidth / 2));
  }

  /** Where the previous signature is fitted: the region, or the box until a stroke. */
  private backgroundSlot(): SignRect {
    return this.region ?? this.boxRect();
  }

  /** Fits the frame into the box, scaled and centred. Called on resize, never mid-stroke. */
  private fitView(): void {
    if (!this.region) {
      this.view = { scale: 1, x: 0, y: 0 };
      return;
    }
    const frame = this.frame();
    if (frame.width <= 0 || frame.height <= 0 || this.boxWidth <= 0 || this.boxHeight <= 0) {
      this.view = { scale: 1, x: -frame.x, y: -frame.y };
      return;
    }
    const r = containRect(frame.width, frame.height, this.boxWidth, this.boxHeight);
    const scale = r.width / frame.width;
    this.view = { scale, x: r.x - frame.x * scale, y: r.y - frame.y * scale };
  }

  /**
   * Pointer position → drawing space, clamped to the box: a captured pointer dragged past the
   * edge draws along it, never somewhere the screen does not show.
   */
  private toPoint(event: PointerEvent): SignPoint {
    const rect = this.padRect;
    const clientWidth = this.canvas?.clientWidth ?? 0;
    // Screen pixels → CSS pixels of the box, should an ancestor scale it.
    const css = rect && rect.width > 0 ? clientWidth / rect.width || 1 : 1;
    const rawX = rect ? (event.clientX - rect.left) * css : event.offsetX;
    const rawY = rect ? (event.clientY - rect.top) * css : event.offsetY;
    const x = this.clamp(rawX, this.boxWidth);
    const y = this.clamp(rawY, this.boxHeight);
    const { scale, x: dx, y: dy } = this.view;
    return { x: (x - dx) / scale, y: (y - dy) / scale };
  }

  /**
   * Keeps a coordinate half the ink width inside the box: a stroke along the edge then fits
   * the frame cap included, and the frame does not grow edit after edit.
   */
  private clamp(value: number, size: number): number {
    if (size <= 0) return value;
    const margin = Math.min(this.edgeMargin, size / 2);
    return Math.min(Math.max(value, margin), size - margin);
  }

  /** Sizes the bitmap on the CSS box × device pixel ratio, and refits the view. */
  private measure(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    this.boxWidth = canvas.clientWidth;
    this.boxHeight = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(this.boxWidth * ratio));
    canvas.height = Math.max(1, Math.round(this.boxHeight * ratio));
    // Not mid-stroke: the points already drawn would no longer line up with the pen.
    if (this.drawing) {
      this.viewStale = true;
      // The pointer keeps mapping onto the box as it is now.
      this.padRect = canvas.getBoundingClientRect();
    } else {
      this.fitView();
    }
  }

  // --- Rendering ---------------------------------------------------------------

  /** One repaint per frame, however many pointer moves arrive in it. */
  private scheduleRedraw(): void {
    if (this.animationFrame !== null || typeof requestAnimationFrame === 'undefined') return;
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = null;
      this.redraw();
    });
  }

  private redraw(): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const canvas = ctx.canvas;
    const ratio = this.boxWidth > 0 ? canvas.width / this.boxWidth : 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Everything below is drawn in drawing space.
    const k = ratio * this.view.scale;
    ctx.setTransform(k, 0, 0, k, ratio * this.view.x, ratio * this.view.y);

    const color = this.inkColor();
    const image = this.background?.image;
    if (image) this.paintSilhouette(ctx, image, color, k);
    const strokes = this.current ? [...this.strokes, this.current] : this.strokes;
    this.paintStrokes(ctx, strokes, color, this.inkWidth());
  }

  private paintStrokes(
    ctx: CanvasRenderingContext2D,
    strokes: readonly SignStroke[],
    color: string,
    lineWidth: number,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      ctx.beginPath();
      traceStroke(ctx, stroke);
      ctx.stroke();
    }
  }

  /**
   * The previous signature, recoloured in the screen ink: drawn on a scratch canvas, then
   * `source-in` keeps its shape and replaces its colour, so a black export stays legible on a
   * dark field. The scratch canvas is rebuilt only when the image, the ink or the pixel size
   * changes, never per frame while a stroke is drawn over it.
   */
  private paintSilhouette(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    color: string,
    pixelScale: number,
  ): void {
    const slot = this.backgroundSlot();
    const key = `${slot.width}x${slot.height}@${pixelScale}`;
    let cached = this.silhouette;
    if (cached?.image !== image || cached.color !== color || cached.key !== key) {
      const scratch = ctx.canvas.ownerDocument.createElement('canvas');
      scratch.width = Math.max(1, Math.round(slot.width * pixelScale));
      scratch.height = Math.max(1, Math.round(slot.height * pixelScale));
      const s = scratch.getContext('2d');
      if (!s) return;
      const r = containRect(image.naturalWidth, image.naturalHeight, slot.width, slot.height);
      s.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
      s.drawImage(image, r.x, r.y, r.width, r.height);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = color;
      s.fillRect(0, 0, slot.width, slot.height);
      cached = { image, color, key, canvas: scratch };
      this.silhouette = cached;
    }
    ctx.drawImage(cached.canvas, slot.x, slot.y, slot.width, slot.height);
  }

  private ctx(): CanvasRenderingContext2D | null {
    if (!this.canvas) return null;
    if (this.context === undefined) this.context = this.canvas.getContext('2d') ?? null;
    return this.context;
  }

  /** Screen ink: the canvas `color`, which the stylesheet binds to the ink token. */
  private inkColor(): string {
    return this.canvas ? getComputedStyle(this.canvas).color : 'black';
  }

  /**
   * Ink width, in CSS pixels. `--_field-sign-ink-width` is registered as a `<length>`
   * (`@property`), so the browser hands back an absolute `px` value whatever unit the hook
   * was set in.
   */
  private inkWidth(): number {
    if (!this.canvas || typeof getComputedStyle === 'undefined') return FALLBACK_INK_WIDTH;
    const raw = getComputedStyle(this.canvas).getPropertyValue('--_field-sign-ink-width').trim();
    const value = parseFloat(raw);
    return raw.endsWith('px') && Number.isFinite(value) && value > 0 ? value : FALLBACK_INK_WIDTH;
  }
}

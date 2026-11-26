/**
 * What is worth asserting: the value leaves once a stroke ends (never mid-stroke), `null`
 * means empty, a previous signature is never dropped from the export silently, the drawing
 * keeps its frame when the box is resized, and read-only / disabled really stop the pen.
 *
 * The canvas box is pinned (size and position) so that coordinates are exact, and
 * `ResizeObserver` and `Image` are faked where a test decides when they fire. Values are
 * exported in SVG: readable, and independent of pixels.
 */
import { useState, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiFieldSign, type FieldSignValue } from './ui-field-sign';
import { strokesToSvg, svgToDataUrl } from './ui-field-sign-strokes';

const SAMPLE = svgToDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"/>');
const PNG_SAMPLE = 'data:image/png;base64,AAAA';
/** A value this field exported itself: one stroke, in SVG. */
const OWN_EXPORT = svgToDataUrl(
  strokesToSvg(
    [
      [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    ],
    { frame: { x: 0, y: 0, width: 300, height: 150 }, color: 'black', lineWidth: 2 },
  ),
);

/** An `Image` whose load / error the test decides. */
class FakeImage {
  static last: FakeImage | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  naturalWidth = 100;
  naturalHeight = 50;
  constructor() {
    FakeImage.last = this;
  }
}

/** A `ResizeObserver` the test triggers by hand. */
class FakeResizeObserver {
  static callbacks: (() => void)[] = [];
  constructor(callback: () => void) {
    FakeResizeObserver.callbacks.push(callback);
  }
  observe(): void {
    /* manual */
  }
  disconnect(): void {
    /* manual */
  }
}
const resize = () => FakeResizeObserver.callbacks.forEach((cb) => cb());

/** The canvas box, at the viewport origin: a `clientX` is a box coordinate. */
let box = { width: 300, height: 150 };
const pinned = ['clientWidth', 'clientHeight', 'getBoundingClientRect'] as const;

/** What the host received, in order. */
let log: { value: FieldSignValue; changes: FieldSignValue[]; imageErrors: Event[] };

type HostProps = Partial<ComponentProps<typeof UiFieldSign>> & { initial?: FieldSignValue };

function Host({ initial = null, ...props }: HostProps) {
  const [value, setValue] = useState<FieldSignValue>(initial);
  return (
    <>
      <UiFieldSign
        label="Signature"
        format="svg"
        {...props}
        value={value}
        onValueChange={(next) => {
          log.value = next;
          log.changes.push(next);
          setValue(next);
        }}
        onImageError={(event) => log.imageErrors.push(event)}
      />
      {/* The host's own "start again", writing a value as a form reset would. */}
      <button type="button" className="host-reset" onClick={() => setValue(null)}>
        Recommencer
      </button>
    </>
  );
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function setup(props: HostProps = {}) {
  log = { value: props.initial ?? null, changes: [], imageErrors: [] };
  const screen = await render(<Host {...props} />);
  await settle();
  const root = screen.container;
  const canvas = () => root.querySelector('canvas') as HTMLCanvasElement;
  const clearButton = () => root.querySelector<HTMLButtonElement>('.ui-field-sign-clear');
  const placeholder = () => root.querySelector('.ui-field-sign-placeholder');
  const status = () =>
    document.getElementById(canvas().getAttribute('aria-describedby')!.split(' ')[0]!)!;
  const pointer = (type: string, x: number, y: number, pointerId = 1, button = 0) =>
    canvas().dispatchEvent(
      new PointerEvent(type, {
        pointerId,
        pointerType: 'touch',
        button,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      }),
    );
  /** One stroke through the given points. */
  const draw = async (...points: [number, number][]) => {
    const [first, ...rest] = points as [[number, number], ...[number, number][]];
    pointer('pointerdown', ...first);
    for (const p of rest) pointer('pointermove', ...p);
    pointer('pointerup', ...(points[points.length - 1] ?? first));
    await settle();
  };
  const key = async (key: string, init: KeyboardEventInit = {}) => {
    canvas().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    await settle();
  };
  const rerender = async (next: HostProps) => {
    await screen.rerender(<Host {...props} {...next} />);
    await settle();
  };
  return { root, canvas, clearButton, placeholder, status, pointer, draw, key, rerender };
}

const svg = (value: FieldSignValue | undefined) => decodeURIComponent(value ?? '');
const paths = (value: FieldSignValue | undefined) => svg(value).match(/<path /g)?.length ?? 0;

beforeEach(() => {
  box = { width: 300, height: 150 };
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => box.width,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => box.height,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(0, 0, box.width, box.height),
  });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  for (const name of pinned) Reflect.deleteProperty(HTMLCanvasElement.prototype, name);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeResizeObserver.callbacks = [];
  FakeImage.last = null;
});

describe('ui-field-sign', () => {
  it('starts empty: placeholder shown, clear disabled, value null', async () => {
    const { placeholder, clearButton } = await setup();
    expect(placeholder()?.textContent).toBe('Signez ici');
    expect(clearButton()?.disabled).toBe(true);
    expect(log.value).toBeNull();
  });

  it('emits an SVG data URL once the stroke ends, never mid-stroke', async () => {
    const { pointer } = await setup();
    pointer('pointerdown', 10, 10);
    pointer('pointermove', 20, 15);
    pointer('pointermove', 30, 25);
    await settle();
    expect(log.changes).toEqual([]);

    pointer('pointerup', 30, 25);
    await settle();
    expect(log.changes).toHaveLength(1);
    expect(log.changes[0]!.startsWith('data:image/svg+xml')).toBe(true);
    expect(svg(log.changes[0])).toContain('<path d="M10 10Q20 15 25 20L30 25"/>');
  });

  it('emits a PNG data URL by default', async () => {
    const { draw } = await setup({ format: undefined });
    await draw([10, 10], [40, 30]);
    expect(log.value!.startsWith('data:image/png')).toBe(true);
  });

  it('works uncontrolled: `defaultValue` seeds, `onValueChange` reports', async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <UiFieldSign label="Signature" format="svg" onValueChange={onValueChange} />,
    );
    const canvas = screen.container.querySelector('canvas')!;
    const init = { pointerId: 1, clientX: 5, clientY: 5, bubbles: true, cancelable: true };
    canvas.dispatchEvent(new PointerEvent('pointerdown', init));
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: 20 }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: 20 }));
    await settle();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(screen.container.querySelector('.ui-field-sign-placeholder')).toBeNull();
  });

  it('exports in `exportColor` resolved to rgb(), not in the screen ink', async () => {
    const { draw } = await setup();
    await draw([0, 0], [5, 5]);
    expect(svg(log.value)).toContain('stroke="rgb(0, 0, 0)"');
  });

  describe('exportColor', () => {
    afterEach(() => document.body.style.removeProperty('--test-ink'));

    it('resolves a design token where the field sits: an image cannot carry var()', async () => {
      document.body.style.setProperty('--test-ink', '#1d3b8f');
      const { draw } = await setup({ exportColor: 'var(--test-ink)' });
      await draw([0, 0], [5, 5]);
      expect(svg(log.value)).toContain('stroke="rgb(29, 59, 143)"');
    });

    it('falls back to black on a var() that does not resolve', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { draw } = await setup({ exportColor: 'var(--nope)' });
      await draw([0, 0], [5, 5]);
      expect(svg(log.value)).toContain('stroke="black"');
      expect(warn).toHaveBeenCalled();
    });

    it('falls back to black on a value that is not a colour', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { draw } = await setup({ exportColor: 'not-a-colour' });
      await draw([0, 0], [5, 5]);
      expect(svg(log.value)).toContain('stroke="black"');
    });
  });

  it('hides the placeholder and enables clearing once signed', async () => {
    const { draw, placeholder, clearButton } = await setup();
    await draw([0, 0], [5, 5]);
    expect(placeholder()).toBeNull();
    expect(clearButton()?.disabled).toBe(false);
  });

  it('ignores a second finger while a stroke is under way', async () => {
    const { pointer } = await setup();
    pointer('pointerdown', 0, 0, 1);
    pointer('pointerdown', 50, 50, 2);
    pointer('pointermove', 60, 60, 2);
    pointer('pointerup', 60, 60, 2);
    await settle();
    expect(log.changes).toEqual([]);
    pointer('pointerup', 0, 0, 1);
    await settle();
    expect(paths(log.value)).toBe(1);
  });

  it('ignores any button but the main one (right-click, stylus eraser)', async () => {
    const { pointer } = await setup();
    pointer('pointerdown', 0, 0, 1, 5);
    pointer('pointerup', 5, 5, 1, 5);
    await settle();
    expect(log.changes).toEqual([]);
  });

  it('ends the stroke on a lost pointer capture: the next one still draws', async () => {
    const { pointer, draw } = await setup();
    pointer('pointerdown', 0, 0);
    pointer('pointermove', 5, 5);
    pointer('lostpointercapture', 5, 5);
    await settle();
    expect(paths(log.value)).toBe(1);
    await draw([10, 10], [20, 20]);
    expect(paths(log.value)).toBe(2);
  });

  it('keeps its frame when the box shrinks: nothing is cropped out of the value', async () => {
    box = { width: 400, height: 200 };
    const { draw } = await setup();
    await draw([300, 150], [390, 190]);

    // The box halves (a phone rotated): the drawing is scaled down, not cropped.
    box = { width: 200, height: 100 };
    resize();
    await draw([150, 75], [160, 80]);

    const out = svg(log.value);
    expect(out).toContain('viewBox="0 0 400 200"');
    expect(out).toContain('<path d="M300 150L390 190"/>');
    // A point at half the box is half the frame, in frame coordinates.
    expect(out).toContain('<path d="M300 150L320 160"/>');
  });

  it('grows the frame to a stroke drawn beside it after the box widened', async () => {
    box = { width: 400, height: 200 };
    const { draw } = await setup();
    await draw([10, 10], [20, 20]);

    // Wider box, same height: the region is centred, with 100px of room on each side.
    box = { width: 600, height: 200 };
    resize();
    await draw([50, 100], [60, 110]);

    const out = svg(log.value);
    // The stroke in the left margin is in the value, the frame grown to hold it (+1px cap).
    expect(out).toContain('<path d="M-50 100L-40 110"/>');
    expect(out).toContain('viewBox="-51 0 451 200"');
  });

  it('clamps a captured pointer dragged past the box, half the ink inside its edge', async () => {
    box = { width: 400, height: 200 };
    const { pointer } = await setup();
    pointer('pointerdown', 390, 190);
    pointer('pointermove', 900, 700);
    pointer('pointerup', 900, 700);
    await settle();
    expect(svg(log.value)).toContain('<path d="M390 190L399 199"/>');
    // Cap included, the stroke fits the box: the frame does not grow past it.
    expect(svg(log.value)).toContain('viewBox="0 0 400 200"');
  });

  it('refits the view once a stroke ends when the box was resized under the pen', async () => {
    box = { width: 400, height: 200 };
    const { pointer, draw } = await setup();
    pointer('pointerdown', 300, 150);
    pointer('pointermove', 390, 190);
    box = { width: 200, height: 100 };
    resize();
    pointer('pointerup', 390, 190);
    await settle();

    await draw([100, 50], [110, 55]);
    expect(svg(log.value)).toContain('<path d="M200 100L220 110"/>');
  });

  it('maps the pointer onto the box as it is after a resize under the pen', async () => {
    box = { width: 400, height: 200 };
    const { pointer } = await setup();
    pointer('pointerdown', 10, 10);
    box = { width: 200, height: 100 };
    resize();
    pointer('pointermove', 100, 50);
    pointer('pointerup', 100, 50);
    await settle();
    // With the stale rectangle, the box would look scaled by half: 100 → 50.
    expect(svg(log.value)).toContain('<path d="M10 10L100 50"/>');
  });

  it('forgets a first stroke dropped by a disable: the next one takes the box as it is', async () => {
    box = { width: 400, height: 200 };
    const { pointer, draw, rerender } = await setup();
    pointer('pointerdown', 10, 10);
    pointer('pointermove', 20, 20);
    await rerender({ disabled: true });
    await rerender({ disabled: false });

    box = { width: 200, height: 100 };
    resize();
    await draw([10, 10], [20, 20]);
    expect(svg(log.value)).toContain('viewBox="0 0 200 100"');
  });

  it('drops the stroke under the pen when the field is disabled mid-stroke', async () => {
    const { pointer, draw, rerender } = await setup();
    pointer('pointerdown', 0, 0);
    pointer('pointermove', 5, 5);
    await rerender({ disabled: true });
    pointer('pointerup', 5, 5);
    await settle();
    expect(log.changes).toEqual([]);

    await rerender({ disabled: false });
    await draw([10, 10], [20, 20]);
    expect(paths(log.value)).toBe(1);
  });

  describe('clear / undo', () => {
    it('the clear button empties the field, emits null and focuses the drawing area', async () => {
      const { draw, clearButton, canvas } = await setup();
      await draw([0, 0], [5, 5]);
      clearButton()!.click();
      await settle();
      expect(log.value).toBeNull();
      expect(log.changes.at(-1)).toBeNull();
      expect(document.activeElement).toBe(canvas());
    });

    it('Backspace and Ctrl+Z undo the last stroke; Delete clears, undoably', async () => {
      const { draw, key } = await setup();
      await draw([0, 0], [5, 5]);
      await draw([10, 10], [15, 15]);
      await draw([20, 20], [25, 25]);
      await key('Backspace');
      expect(paths(log.value)).toBe(2);
      await key('z', { ctrlKey: true });
      expect(paths(log.value)).toBe(1);
      await key('Delete');
      expect(log.value).toBeNull();
      await key('Backspace');
      expect(paths(log.value)).toBe(1);
      await key('Backspace');
      expect(log.value).toBeNull();
    });

    it('Delete does nothing under the pen: a blank image would pass `required`', async () => {
      const { pointer, draw, key } = await setup();
      await draw([0, 0], [5, 5]);
      pointer('pointerdown', 10, 10);
      await key('Delete');
      expect(paths(log.value)).toBe(1);
      pointer('pointerup', 20, 20);
      await settle();
      expect(paths(log.value)).toBe(2);
    });
  });

  describe('value written by the host', () => {
    it('keeps the strokes, and their undo history, when the host echoes the value', async () => {
      const { draw, key } = await setup();
      await draw([0, 0], [5, 5]);
      await draw([10, 10], [15, 15]);
      // The controlled host wrote back each value it received.
      await key('Backspace');
      expect(paths(log.value)).toBe(1);
    });

    it('a reset to null empties the field', async () => {
      const { root, draw, placeholder } = await setup();
      await draw([0, 0], [5, 5]);
      root.querySelector<HTMLButtonElement>('.host-reset')!.click();
      await settle();
      expect(placeholder()).not.toBeNull();
    });

    it('is shown, and kept under new strokes', async () => {
      const { placeholder, draw } = await setup({ initial: SAMPLE });
      expect(placeholder()).toBeNull();
      await draw([0, 0], [5, 5]);
      expect(svg(log.value)).toContain(`<image href="${SAMPLE}"`);
      expect(paths(log.value)).toBe(1);
    });

    it('is not removed by undo: Delete removes it, and Backspace brings it back word for word', async () => {
      const { key } = await setup({ initial: SAMPLE });
      await key('Backspace');
      expect(log.changes).toEqual([]);
      await key('Delete');
      expect(log.value).toBeNull();
      await key('Backspace');
      expect(log.value).toBe(SAMPLE);
    });

    it('is refused when it is not an image data URL: a remote URL would taint the export', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { placeholder, draw } = await setup({ initial: 'https://example.test/sign.png' });
      expect(placeholder()).not.toBeNull();
      expect(warn).toHaveBeenCalled();
      await draw([0, 0], [5, 5]);
      expect(svg(log.value)).not.toContain('<image');
    });

    it('cleared while loading then undone, it is loaded again: the PNG export does not stall', async () => {
      vi.stubGlobal('Image', FakeImage);
      // A fake image cannot be painted: no 2D canvas, so the export falls back to SVG.
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      const { key, draw } = await setup({ initial: PNG_SAMPLE, format: 'png' });
      const first = FakeImage.last!;
      await key('Delete');
      first.onload!(); // lands while cleared: dropped
      await key('Backspace');
      expect(FakeImage.last).not.toBe(first);
      expect(log.changes).toEqual([null, PNG_SAMPLE]);

      await draw([0, 0], [5, 5]);
      expect(log.changes).toHaveLength(2);
      FakeImage.last!.onload!();
      await settle();
      expect(svg(log.changes.at(-1))).toContain(`<image href="${PNG_SAMPLE}"`);
    });

    it('in SVG, signed over while loading then unreadable: the strokes replace it, alone', async () => {
      vi.stubGlobal('Image', FakeImage);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { draw } = await setup({ initial: SAMPLE });
      await draw([0, 0], [5, 5]);
      expect(svg(log.value)).toContain('<image');
      FakeImage.last!.onerror!();
      await settle();
      expect(svg(log.value)).not.toContain('<image');
      expect(paths(log.value)).toBe(1);
    });

    it("unreadable during the first stroke, keeps that stroke's region", async () => {
      vi.stubGlobal('Image', FakeImage);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      box = { width: 400, height: 200 };
      const { pointer, draw } = await setup({ initial: SAMPLE });
      pointer('pointerdown', 300, 150);
      pointer('pointermove', 390, 190);
      FakeImage.last!.onerror!();
      pointer('pointerup', 390, 190);
      await settle();

      box = { width: 200, height: 100 };
      resize();
      await draw([100, 50], [110, 55]);
      expect(svg(log.value)).toContain('<path d="M200 100L220 110"/>');
    });

    describe('when it cannot be loaded', () => {
      async function unreadable() {
        vi.stubGlobal('Image', FakeImage);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const ctx = await setup({ initial: SAMPLE });
        FakeImage.last!.onerror!();
        await settle();
        return ctx;
      }

      it('shows it as unreadable, in error, and keeps it as the value', async () => {
        const { root, placeholder, status, clearButton } = await unreadable();
        expect(placeholder()?.textContent).toBe('Signature illisible');
        expect(status().textContent).toBe('Signature illisible');
        expect(root.querySelector('.ui-field._error')).not.toBeNull();
        expect(clearButton()!.disabled).toBe(false);
        expect(log.imageErrors).toHaveLength(1);
        // Not dropped: a value this browser cannot decode may be valid elsewhere.
        expect(log.changes).toEqual([]);
      });

      it('can be cleared, and the clear undone', async () => {
        const { clearButton, key } = await unreadable();
        clearButton()!.click();
        await settle();
        expect(log.value).toBeNull();
        await key('Backspace');
        expect(log.value).toBe(SAMPLE);
      });

      it('signed over, gives way to the strokes: undoing them brings it back', async () => {
        const { draw, key, status } = await unreadable();
        await draw([0, 0], [5, 5]);
        expect(svg(log.value)).not.toContain('<image');
        expect(status().textContent).toBe('Signature saisie');
        await key('Backspace');
        expect(log.value).toBe(SAMPLE);
      });
    });

    it('re-exported, one of its own SVG values is extended, not nested', async () => {
      const { draw } = await setup({ initial: OWN_EXPORT });
      await draw([20, 20], [30, 30]);
      expect(svg(log.value)).not.toContain('<image');
      expect(paths(log.value)).toBe(2);
    });

    it('in PNG, holds the export until the previous signature is loaded', async () => {
      vi.stubGlobal('Image', FakeImage);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      const { draw } = await setup({ initial: PNG_SAMPLE, format: 'png' });
      await draw([0, 0], [5, 5]);
      expect(log.changes).toEqual([]);

      FakeImage.last!.onload!();
      await settle();
      expect(log.changes).toHaveLength(1);
      expect(svg(log.value)).toContain(`<image href="${PNG_SAMPLE}"`);
    });
  });

  it('falls back to SVG when the browser refuses to read the PNG back (tainted canvas)', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new DOMException('Tainted canvases may not be exported.', 'SecurityError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { draw } = await setup({ format: 'png' });
    await draw([0, 0], [5, 5]);
    expect(log.value!.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('falls back to SVG when the PNG comes back empty (a canvas past the size limit, iOS)', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:,');
    const { draw } = await setup({ format: 'png' });
    await draw([0, 0], [5, 5]);
    expect(log.value!.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('does not draw when read-only, and hides the clear button', async () => {
    const { draw, clearButton } = await setup({ readOnly: true });
    await draw([0, 0], [5, 5]);
    expect(log.changes).toEqual([]);
    expect(clearButton()).toBeNull();
  });

  it('does not draw when disabled, and leaves the tab order', async () => {
    const { draw, canvas } = await setup({ disabled: true });
    await draw([0, 0], [5, 5]);
    expect(log.changes).toEqual([]);
    expect(canvas().hasAttribute('tabindex')).toBe(false);
  });

  it('is named by its label and described by its state, required included', async () => {
    const { canvas, draw, status } = await setup({ required: true });
    expect(canvas().getAttribute('role')).toBe('img');
    expect(canvas().getAttribute('aria-label')).toBe('Signature');
    expect(status().textContent).toBe('Signez ici, obligatoire');
    await draw([0, 0], [5, 5]);
    expect(status().textContent).toBe('Signature saisie, obligatoire');
  });

  it('chains the helper message after the state in aria-describedby', async () => {
    const { canvas } = await setup({ helperText: 'Au doigt ou au stylet.' });
    const ids = canvas().getAttribute('aria-describedby')!.split(' ');
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[1]!)?.textContent).toContain('Au doigt ou au stylet.');
  });

  it('lays the clear button over the drawing area: hint centred on the whole box', async () => {
    const { root, placeholder, clearButton } = await setup();
    const fieldBox = root.querySelector<HTMLElement>('.ui-field-box')!;
    const pad = root.querySelector<HTMLElement>('.ui-field-sign-pad')!;
    expect(pad.contains(clearButton())).toBe(true);
    // No column beside the area: it spans the inner width of the box.
    expect(pad.getBoundingClientRect().width).toBeCloseTo(fieldBox.clientWidth, 0);
    const outer = fieldBox.getBoundingClientRect();
    const hint = placeholder()!.getBoundingClientRect();
    expect(hint.left + hint.width / 2).toBeCloseTo(outer.left + outer.width / 2, 0);
    // The button sits in the top-right corner of the area.
    const button = clearButton()!.getBoundingClientRect();
    const area = pad.getBoundingClientRect();
    expect(button.right).toBeCloseTo(area.right, 0);
    expect(button.top).toBeCloseTo(area.top, 0);
  });

  it('carries the value in a hidden input when `name` is set', async () => {
    const { root, draw } = await setup({ name: 'signature' });
    const hidden = () => root.querySelector<HTMLInputElement>('input[name="signature"]')!;
    expect(hidden().type).toBe('hidden');
    expect(hidden().value).toBe('');
    await draw([0, 0], [5, 5]);
    expect(hidden().value).toBe(log.value);
  });

  it('merges className on the root and forwards ref and native props to the canvas', async () => {
    let node: HTMLCanvasElement | null = null;
    const screen = await render(
      <UiFieldSign
        label="Signature"
        className="extra"
        data-testid="pad"
        ref={(el) => {
          node = el;
        }}
      />,
    );
    const root = screen.container.firstElementChild!;
    expect(root.classList.contains('ui-field')).toBe(true);
    expect(root.classList.contains('extra')).toBe(true);
    const canvas = screen.container.querySelector('canvas')!;
    expect(canvas.dataset.testid).toBe('pad');
    expect(node).toBe(canvas);
  });
});

import { render, fireEvent } from '@testing-library/angular';
import { describe, expect, test } from 'vitest';
import { KjSlider } from './slider';
import { KjSliderTrack } from './slider-track';
import { KjSliderRange } from './slider-range';
import { KjSliderThumb } from './slider-thumb';

const imports = [KjSlider, KjSliderTrack, KjSliderRange, KjSliderThumb];

describe('KjSliderThumb', () => {
  test('sets role="slider" on the thumb host', async () => {
    const { container } = await render(
      `<div kjSlider>
         <div kjSliderTrack>
           <div kjSliderRange></div>
           <button kjSliderThumb kjAriaLabel="Volume" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    expect(container.querySelector('button')).toHaveAttribute('role', 'slider');
  });

  test('reflects aria-valuemin / valuemax / valuenow', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="50">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="20" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    expect(thumb).toHaveAttribute('aria-valuemin', '0');
    expect(thumb).toHaveAttribute('aria-valuemax', '50');
    expect(thumb).toHaveAttribute('aria-valuenow', '20');
  });

  test('reflects aria-orientation from the root', async () => {
    const { container } = await render(
      `<div kjSlider kjOrientation="vertical">
         <div kjSliderTrack>
           <button kjSliderThumb kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-orientation', 'vertical');
  });

  test('ArrowUp increases by step (snapped)', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="100" [kjStep]="2">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="10" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    fireEvent.keyDown(thumb, { key: 'ArrowUp' });
    expect(thumb).toHaveAttribute('aria-valuenow', '12');
  });

  test('ArrowDown decreases by step', async () => {
    const { container } = await render(
      `<div kjSlider>
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="10" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    fireEvent.keyDown(thumb, { key: 'ArrowDown' });
    expect(thumb).toHaveAttribute('aria-valuenow', '9');
  });

  test('ArrowRight in RTL decreases the value', async () => {
    const { container } = await render(
      `<div kjSlider kjDirection="rtl">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="10" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(thumb).toHaveAttribute('aria-valuenow', '9');
  });

  test('PageUp adds pageStep (defaults to range/10 when step×10 is small)', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="100" [kjStep]="1">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="0" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    fireEvent.keyDown(thumb, { key: 'PageUp' });
    expect(thumb).toHaveAttribute('aria-valuenow', '10');
  });

  test('Home jumps to kjMin and End to kjMax', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="50">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="20" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    fireEvent.keyDown(thumb, { key: 'Home' });
    expect(thumb).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(thumb, { key: 'End' });
    expect(thumb).toHaveAttribute('aria-valuenow', '50');
  });

  test('clamps to kjMax when stepping past the upper bound', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="10" [kjStep]="5">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="9" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const thumb = container.querySelector('button')!;
    fireEvent.keyDown(thumb, { key: 'ArrowUp' });
    expect(thumb).toHaveAttribute('aria-valuenow', '10');
  });

  test('aria-valuetext uses kjDisplayWith when provided', async () => {
    const { container } = await render(
      `<div kjSlider [kjDisplayWith]="format">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="55" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      {
        imports,
        componentProperties: { format: (v: number) => `${v}%` },
      },
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-valuetext', '55%');
  });
});

describe('KjSlider range mode', () => {
  test('renders two thumbs and root role="group"', async () => {
    const { container } = await render(
      `<div kjSlider>
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="20" kjAriaLabel="Min" type="button"></button>
           <button kjSliderThumb [kjValue]="80" kjAriaLabel="Max" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    expect(container.querySelectorAll('button').length).toBe(2);
    const root = container.querySelector('[kjSlider]')!;
    expect(root).toHaveAttribute('role', 'group');
  });

  test('low thumb cannot pass high thumb minus minDistance', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="100" [kjMinDistance]="10">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="20" kjAriaLabel="Min" type="button"></button>
           <button kjSliderThumb [kjValue]="50" kjAriaLabel="Max" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const [low] = container.querySelectorAll('button');
    // Try to push the low thumb to End — it should clamp to (high - minDistance) = 40.
    fireEvent.keyDown(low, { key: 'End' });
    expect(low).toHaveAttribute('aria-valuenow', '40');
  });

  test('high thumb effective valuemin narrows to low + minDistance', async () => {
    const { container } = await render(
      `<div kjSlider [kjMinDistance]="10">
         <div kjSliderTrack>
           <button kjSliderThumb [kjValue]="20" kjAriaLabel="Min" type="button"></button>
           <button kjSliderThumb [kjValue]="80" kjAriaLabel="Max" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const [, high] = container.querySelectorAll('button');
    expect(high).toHaveAttribute('aria-valuemin', '30');
  });
});

describe('KjSliderRange (filled span)', () => {
  test('writes --kj-slider-start and --kj-slider-end CSS variables', async () => {
    const { container } = await render(
      `<div kjSlider [kjMin]="0" [kjMax]="100">
         <div kjSliderTrack>
           <div kjSliderRange data-test="range"></div>
           <button kjSliderThumb [kjValue]="40" kjAriaLabel="V" type="button"></button>
         </div>
       </div>`,
      { imports },
    );
    const range = container.querySelector('[data-test="range"]') as HTMLElement;
    // Single mode: start=0, end=fraction.
    expect(range.style.getPropertyValue('--kj-slider-start')).toBe('0');
    expect(range.style.getPropertyValue('--kj-slider-end')).toBe('0.4');
  });
});

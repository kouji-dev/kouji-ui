import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test } from 'vitest';
import { KjStat, type KjStatDirection } from './stat';

@Component({
  standalone: true,
  imports: [KjStat],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-stat
      label="Revenue"
      [value]="value"
      [change]="change"
      [direction]="direction"
      [changeLabel]="changeLabel"
      [tone]="tone"
      [size]="size"
      [loading]="loading"
      [emptyText]="emptyText"
    />
  `,
})
class Host {
  value: string | number | null = '$12,400';
  change = '+12%';
  direction: KjStatDirection = 'up';
  changeLabel = '';
  tone = 'success';
  size = 'md';
  loading = false;
  emptyText = '—';
}

function render(configure?: (h: Host) => void) {
  const f = TestBed.createComponent(Host);
  configure?.(f.componentInstance);
  f.detectChanges();
  const root: HTMLElement = f.nativeElement.querySelector('.kj-stat');
  return { root, q: (s: string) => root.querySelector(s) as HTMLElement | null };
}

describe('KjStat', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  test('renders label / value / change as a description list', () => {
    const { root, q } = render();
    expect(root.tagName).toBe('DL');
    expect(q('dt')!.textContent!.trim()).toBe('Revenue');
    expect(q('.kj-stat__value')!.textContent!.trim()).toBe('$12,400');
    expect(q('.kj-stat__change')!.textContent).toContain('+12%');
    expect(root.getAttribute('data-tone')).toBe('success');
    expect(root.getAttribute('data-size')).toBe('md');
  });

  test('direction draws a glyph hidden from AT; none draws nothing', () => {
    expect(render().q('.kj-stat__glyph')!.textContent).toBe('▲');
    expect(render().q('.kj-stat__glyph')!.getAttribute('aria-hidden')).toBe('true');
    expect(render((h) => (h.direction = 'down')).q('.kj-stat__glyph')!.textContent).toBe('▼');
    expect(render((h) => (h.direction = 'none')).q('.kj-stat__glyph')).toBeNull();
  });

  test('changeLabel replaces the short change text for screen readers', () => {
    const { q } = render((h) => (h.changeLabel = 'Up 12% on last week'));
    expect(q('.kj-stat__sr')!.textContent).toBe('Up 12% on last week');
    expect(
      q('.kj-stat__change span:not(.kj-stat__glyph):not(.kj-stat__sr)')!.getAttribute(
        'aria-hidden',
      ),
    ).toBe('true');
  });

  test('loading shows a skeleton, sets aria-busy and hides the change', () => {
    const { root, q } = render((h) => (h.loading = true));
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(q('kj-skeleton')).not.toBeNull();
    expect(q('.kj-stat__change')).toBeNull();
  });

  test('a missing value shows the dash, or emptyText', () => {
    const dash = render((h) => (h.value = null));
    expect(dash.q('.kj-stat__empty')!.textContent!.trim()).toBe('—');
    expect(dash.q('.kj-stat__change')).toBeNull();
    const custom = render((h) => {
      h.value = null;
      h.emptyText = 'No data';
    });
    expect(custom.q('.kj-stat__empty')!.textContent!.trim()).toBe('No data');
  });

  test('zero is a value, not empty', () => {
    expect(
      render((h) => (h.value = 0))
        .q('.kj-stat__value')!
        .textContent!.trim(),
    ).toBe('0');
  });
});

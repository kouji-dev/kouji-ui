import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjRadioComponent, KjRadioGroupComponent } from './radio';

/**
 * Behavioural cover for the styled `<kj-radio-group>` / `<kj-radio>` pair:
 * the radiogroup landmark, label-click forwarding (the focusable element is
 * the inner dot, not the label), selection round-tripping through the
 * group's two-way `value`, and the ARIA shape the `@doc-aria` block promises.
 */

@Component({
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-radio-group [(value)]="size" [orientation]="orientation()" ariaLabel="Size">
      <kj-radio [value]="'s'">Small</kj-radio>
      <kj-radio [value]="'m'">Medium</kj-radio>
      <kj-radio [value]="'l'" [disabled]="lastDisabled()">Large</kj-radio>
    </kj-radio-group>
  `,
})
class Host {
  readonly size = signal<unknown>('m');
  readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  readonly lastDisabled = signal(false);
}

function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const dots = Array.from(root.querySelectorAll<HTMLElement>('.kj-radio-dot'));
  const labels = Array.from(root.querySelectorAll<HTMLElement>('.kj-radio-label'));
  return { fixture, root, dots, labels };
}

describe('KjRadioGroupComponent / KjRadioComponent', () => {
  it('renders a named radiogroup around one role="radio" dot per option', () => {
    const { root, dots } = mount();
    const group = root.querySelector('kj-radio-group');

    expect(group?.getAttribute('role')).toBe('radiogroup');
    expect(group?.getAttribute('aria-label')).toBe('Size');
    expect(group?.getAttribute('data-orientation')).toBe('vertical');
    expect(dots).toHaveLength(3);
    expect(dots.every((d) => d.getAttribute('role') === 'radio')).toBe(true);
  });

  it('reflects the bound value as aria-checked on exactly one dot', () => {
    const { dots } = mount();

    expect(dots.map((d) => d.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
  });

  it('names each dot from its own projected label', () => {
    const { root, dots } = mount();

    const id = dots[0].getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    expect(root.querySelector(`#${id}`)?.textContent?.trim()).toBe('Small');
  });

  it('clicking a label selects its option and writes the group value back', () => {
    const { fixture, labels, dots } = mount();

    labels[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toBe('l');
    expect(dots.map((d) => d.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
  });

  it('Space on the focused dot selects it', () => {
    const { fixture, dots } = mount();

    dots[0].focus();
    expect(document.activeElement).toBe(dots[0]);
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toBe('s');
  });

  it('an externally changed value re-renders the selection', () => {
    const { fixture, dots } = mount();

    fixture.componentInstance.size.set('s');
    fixture.detectChanges();

    expect(dots.map((d) => d.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('disabled marks the option aria-disabled and dims the row via the host', () => {
    const { fixture, root, dots } = mount();
    fixture.componentInstance.lastDisabled.set(true);
    fixture.detectChanges();

    expect(dots[2].getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelectorAll('kj-radio')[2].getAttribute('data-disabled')).toBe('');
    // NOTE: `aria-disabled` is presentational here — the headless `KjRadio`
    // still selects on a direct click/Space, and the dot stays a Tab stop.
    // Both are recorded as library-level gaps (APG radiogroup asks for a
    // roving tabindex and for a disabled option to be inert); this spec
    // deliberately pins only the attribute contract so a fix does not have to
    // fight it.
  });

  it('orientation lands on the group as a data attribute', () => {
    const { fixture, root } = mount();
    fixture.componentInstance.orientation.set('horizontal');
    fixture.detectChanges();

    expect(root.querySelector('kj-radio-group')?.getAttribute('data-orientation')).toBe(
      'horizontal',
    );
  });
});

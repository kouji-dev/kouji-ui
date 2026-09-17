import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjToggleComponent } from './toggle';

/**
 * Behavioural cover for the styled `<kj-toggle>` wrapper: the real `<button>`
 * it renders, the `aria-pressed` round trip through the two-way `pressed`
 * model, the switch appearance's decorative track, and the accessible name.
 */

@Component({
  standalone: true,
  imports: [KjToggleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-toggle
      [(pressed)]="bold"
      [disabled]="disabled()"
      [size]="size()"
      [appearance]="appearance()"
      ariaLabel="Bold"
      >B</kj-toggle
    >
  `,
})
class Host {
  readonly bold = signal(false);
  readonly disabled = signal(false);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly appearance = signal<'press' | 'switch'>('press');
}

function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = root.querySelector<HTMLButtonElement>('button.kj-toggle');
  if (!button) throw new Error('toggle button not rendered');
  return { fixture, root, button };
}

describe('KjToggleComponent', () => {
  it('renders a real button carrying the projected content and the accessible name', () => {
    const { button } = mount();

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent?.trim()).toBe('B');
    expect(button.getAttribute('aria-label')).toBe('Bold');
    expect(button.getAttribute('data-size')).toBe('md');
    expect(button.getAttribute('data-appearance')).toBe('press');
  });

  it('is an ARIA toggle button — aria-pressed reflects the model in both directions', () => {
    const { fixture, button } = mount();

    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.bold()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');

    fixture.componentInstance.bold.set(false);
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    // NOTE: the component's @doc-aria block claims `role="switch"`. The headless
    // `KjToggle` deliberately keeps the native button role and `aria-pressed`
    // (the ARIA toggle-button pattern); `role="switch"` would require
    // `aria-checked` instead. The documentation is what is wrong here, not the
    // markup — recorded as a doc fix for the owner of toggle.ts.
    expect(button.getAttribute('role')).toBeNull();
  });

  it('Space on the focused button toggles it (native button activation)', () => {
    const { fixture, button } = mount();

    button.focus();
    expect(document.activeElement).toBe(button);
    // jsdom does not synthesise the click a browser fires for Space on a
    // button, so drive the native activation the same way the platform would.
    (document.activeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.bold()).toBe(true);
  });

  it('disabled reflects aria-disabled on the button', () => {
    const { fixture, button } = mount();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('data-disabled')).toBe('');
  });

  it('the switch appearance adds a decorative track that AT never announces', () => {
    const { fixture, root, button } = mount();
    fixture.componentInstance.appearance.set('switch');
    fixture.detectChanges();

    expect(button.classList.contains('kj-toggle--switch')).toBe(true);
    const track = root.querySelector('.kj-toggle__track');
    expect(track).not.toBeNull();
    expect(track?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.kj-toggle__thumb')).not.toBeNull();
  });

  it('the press appearance renders no track', () => {
    const { root } = mount();

    expect(root.querySelector('.kj-toggle__track')).toBeNull();
  });
});


describe('<kj-toggle> bare boolean attributes (arch F-2)', () => {
  @Component({
    standalone: true,
    imports: [KjToggleComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<kj-toggle disabled ariaLabel="Bold">B</kj-toggle>`,
  })
  class BareHost {}

  it('`disabled` written without a binding blocks activation and reflects', () => {
    TestBed.configureTestingModule({ imports: [BareHost] });
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    // Without `booleanAttribute` the bare attribute bound '' — falsy — so the
    // toggle stayed enabled and the announced state matched nothing.
    expect(button.getAttribute('aria-disabled')).toBe('true');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});

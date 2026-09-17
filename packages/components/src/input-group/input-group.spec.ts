import { ChangeDetectionStrategy, Component, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjInputComponent } from '../input/input';
import { KjInputGroupAddonComponent, KjInputGroupComponent } from './input-group';

/**
 * Behavioural cover for the styled `<kj-input-group>` / `<kj-input-group-addon>`
 * pair: what it renders, how addon position is inferred from DOM order, the
 * decorative-addon opt-out the `@doc-a11y` block requires, and the disabled
 * posture that both the group and its addons paint from.
 */

@Component({
  standalone: true,
  imports: [KjInputGroupComponent, KjInputGroupAddonComponent, KjInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-input-group [kjOrientation]="orientation()" [kjDisabled]="disabled()">
      <kj-input-group-addon [kjAriaHidden]="true">$</kj-input-group-addon>
      <kj-input type="text" placeholder="Amount" aria-label="Amount" />
      <kj-input-group-addon>USD</kj-input-group-addon>
    </kj-input-group>
  `,
})
class Host {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly disabled = signal(false);
}

function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const group = root.querySelector<HTMLElement>('kj-input-group');
  if (!group) throw new Error('group not rendered');
  const addons = Array.from(root.querySelectorAll<HTMLElement>('kj-input-group-addon'));
  return { fixture, root, group, addons };
}

describe('KjInputGroupComponent / KjInputGroupAddonComponent', () => {
  it('renders the group shell with its layout axis and the projected addons', () => {
    const { group, addons } = mount();

    expect(group.classList.contains('kj-input-group')).toBe(true);
    expect(group.getAttribute('data-orientation')).toBe('horizontal');
    expect(addons).toHaveLength(2);
    expect(addons.every((a) => a.classList.contains('kj-input-group__addon'))).toBe(true);
    expect(addons[0].textContent?.trim()).toBe('$');
    expect(addons[1].textContent?.trim()).toBe('USD');
  });

  it('adds no role of its own — the group is a layout shell around real controls', () => {
    const { group, root } = mount();

    expect(group.getAttribute('role')).toBeNull();
    expect(root.querySelector('kj-input-group-addon')?.getAttribute('role')).toBeNull();
    // The projected control keeps its own native semantics.
    expect(root.querySelector('input')?.getAttribute('type')).toBe('text');
    // NOTE: `aria-label` written on `<kj-input>` stays on the wrapper host and
    // never reaches the inner `<input>`, so this composition has no
    // programmatic name (WCAG 4.1.2). `<kj-field>` + `KjFieldControl` is the
    // supported way to name it today; an accessible-name input on `kj-input`
    // is already recorded as an open follow-up.
    expect(root.querySelector('kj-input')?.getAttribute('aria-label')).toBe('Amount');
  });

  it('mints a stable id on every addon so the group can compose aria-labelledby', () => {
    const { addons } = mount();

    const ids = addons.map((a) => a.id);
    expect(ids.every((id) => !!id)).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  it('infers addon position from DOM order relative to the control', () => {
    const { addons } = mount();

    // Both are `kjPosition="auto"`; the one before the input is a prefix.
    expect(addons[0].getAttribute('data-position')).toBe('auto');
    expect(addons[1].getAttribute('data-position')).toBe('auto');
    expect(addons[0].compareDocumentPosition(addons[1]) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeGreaterThan(0);
  });

  it('hides a decorative addon from AT and leaves an informative one announced', () => {
    const { addons } = mount();

    expect(addons[0].getAttribute('aria-hidden')).toBe('true');
    expect(addons[1].getAttribute('aria-hidden')).toBeNull();
  });

  it('kjDisabled paints the whole group', () => {
    const { fixture, group } = mount();
    expect(group.getAttribute('data-disabled')).toBeNull();

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(group.getAttribute('data-disabled')).toBe('');
  });

  it('a vertical group re-renders its axis attribute', () => {
    const { fixture, group } = mount();
    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();

    expect(group.getAttribute('data-orientation')).toBe('vertical');
  });

  // arch F-2 — `<kj-input-group kjDisabled>` and
  // `<kj-input-group-addon kjAriaHidden>` both work as bare attributes; the
  // addon's transform used to map `''` back to `undefined` and write nothing.
  describe('bare boolean attributes (arch F-2)', () => {
    function mountBare(cmp: Type<unknown>): HTMLElement {
      const fixture = TestBed.createComponent(cmp);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('bare kjDisabled reflects aria-disabled / data-disabled on the group', () => {
      @Component({
        standalone: true,
        imports: [KjInputGroupComponent],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<kj-input-group kjDisabled />`,
      })
      class BareHost {}
      const group = mountBare(BareHost).querySelector('kj-input-group') as HTMLElement;
      expect(group.getAttribute('aria-disabled')).toBe('true');
      expect(group.hasAttribute('data-disabled')).toBe(true);
    });

    it('bare kjAriaHidden hides the addon', () => {
      @Component({
        standalone: true,
        imports: [KjInputGroupComponent, KjInputGroupAddonComponent],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<kj-input-group><kj-input-group-addon kjAriaHidden>$</kj-input-group-addon></kj-input-group>`,
      })
      class BareHost {}
      const addon = mountBare(BareHost).querySelector('kj-input-group-addon') as HTMLElement;
      expect(addon.getAttribute('aria-hidden')).toBe('true');
    });

    it('an addon with no kjAriaHidden still writes no aria-hidden', () => {
      @Component({
        standalone: true,
        imports: [KjInputGroupComponent, KjInputGroupAddonComponent],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<kj-input-group><kj-input-group-addon>$</kj-input-group-addon></kj-input-group>`,
      })
      class BareHost {}
      const addon = mountBare(BareHost).querySelector('kj-input-group-addon') as HTMLElement;
      expect(addon.hasAttribute('aria-hidden')).toBe(false);
    });
  });
});

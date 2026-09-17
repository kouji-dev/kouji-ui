import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test } from 'vitest';
import { KjCascadeSelectComponent } from './cascade-select';

/**
 * Behavioural cover for the styled `<kj-cascade-select>` wrapper. The
 * keyboard and selection contracts live on the headless directives and are
 * covered by `packages/core/src/cascade-select/cascade-select.spec.ts`; what
 * the wrapper owns is the trigger it paints and the inputs it forwards.
 */
describe('KjCascadeSelectComponent', () => {
  @Component({
    standalone: true,
    imports: [KjCascadeSelectComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<kj-cascade-select placeholder="Pick a region" />`,
  })
  class DefaultHost {}

  @Component({
    standalone: true,
    imports: [KjCascadeSelectComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<kj-cascade-select disabled />`,
  })
  class BareDisabledHost {}

  test('renders a trigger button showing the placeholder', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [DefaultHost] });
    const fixture = TestBed.createComponent(DefaultHost);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button.kj-cascade-trigger') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.disabled).toBe(false);
    expect(trigger.textContent).toContain('Pick a region');
  });

  // arch F-2 — the bare-attribute form must not be a silent no-op.
  test('a bare `disabled` attribute disables the trigger', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [BareDisabledHost] });
    const fixture = TestBed.createComponent(BareDisabledHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-cascade-select') as HTMLElement;
    const trigger = host.querySelector('button.kj-cascade-trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(host.hasAttribute('data-disabled')).toBe(true);
  });
});

import { ApplicationRef, ChangeDetectionStrategy, Component, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test } from 'vitest';
import { KjPasswordInputComponent } from './password-input';

@Component({
  standalone: true,
  imports: [KjPasswordInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-password-input
      [kjAutocomplete]="autocomplete"
      [kjMaxLength]="maxLength"
      [kjDisabled]="disabled"
      [kjInvalid]="invalid"
      [kjPlaceholder]="placeholder"
      [kjShowToggle]="showToggle"
      [kjShowStrength]="showStrength"
      [kjShowCapsLockWarning]="showCapsLock"
    />
  `,
})
class HostComponent {
  autocomplete: 'current-password' | 'new-password' | 'off' = 'current-password';
  // The wrapper's own default: no limit.
  maxLength = Number.POSITIVE_INFINITY;
  disabled = false;
  invalid = false;
  placeholder = '';
  showToggle = true;
  showStrength = false;
  showCapsLock = false;
}

describe('KjPasswordInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <input> with type="password"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-password-input input');
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('password');
  });

  test('forwards kjAutocomplete to the inner input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.autocomplete = 'new-password';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-password-input input').getAttribute('autocomplete'),
    ).toBe('new-password');
  });

  test('forwards kjMaxLength to native maxlength', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 24;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-password-input input').getAttribute('maxlength'),
    ).toBe('24');
  });

  test('forwards kjPlaceholder to native placeholder', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.placeholder = 'Enter password';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-password-input input').getAttribute('placeholder'),
    ).toBe('Enter password');
  });

  test('renders the show/hide toggle by default', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('kj-password-input button');
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Show password');
    expect(button.getAttribute('aria-controls')).toBeTruthy();
  });

  test('hides the toggle when kjShowToggle is false', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showToggle = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-password-input button')).toBeNull();
  });

  test('clicking the toggle flips the input type', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-password-input input');
    const button = fixture.nativeElement.querySelector('kj-password-input button');
    expect(input.getAttribute('type')).toBe('password');
    button.click();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(input.getAttribute('type')).toBe('text');
  });

  test('renders the strength meter when kjShowStrength is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showStrength = true;
    fixture.detectChanges();
    const meter = fixture.nativeElement.querySelector('[kjPasswordStrength]');
    expect(meter).not.toBeNull();
    expect(meter.getAttribute('role')).toBe('progressbar');
  });

  test('renders the caps lock warning when kjShowCapsLockWarning is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showCapsLock = true;
    fixture.detectChanges();
    const warn = fixture.nativeElement.querySelector('[kjPasswordCapsLockWarning]');
    expect(warn).not.toBeNull();
    expect(warn.getAttribute('role')).toBe('status');
    expect(warn.hasAttribute('hidden')).toBe(true);
  });

  test('forwards kjDisabled to aria-disabled on the input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-password-input input');
    expect(input.getAttribute('aria-disabled')).toBe('true');
  });
});

// arch F-13 — the wrapper seeded its inner FormControl from `ngOnInit`. It is
// an effect now, so the seed still lands AND later model writes are followed.
@Component({
  standalone: true,
  imports: [KjPasswordInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-password-input [(kjValue)]="value" />`,
})
class ValueHost {
  // A signal, so a programmatic write re-runs change detection cleanly under
  // the zoneless TestBed instead of tripping NG0100 on the two-way binding.
  readonly valueSignal = signal('seeded');
  get value(): string {
    return this.valueSignal();
  }
  set value(v: string) {
    this.valueSignal.set(v);
  }
}

describe('KjPasswordInputComponent — kjValue without ngOnInit (arch F-13)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ValueHost] });
  });

  test('seeds the inner control from the model on first render', async () => {
    const fixture = TestBed.createComponent(ValueHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input.kj-password-input__field');
    expect(input.value).toBe('seeded');
  });

  test('follows a later programmatic model write (ngOnInit never could)', async () => {
    const fixture = TestBed.createComponent(ValueHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.value = 'rotated';
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input.kj-password-input__field');
    expect(input.value).toBe('rotated');
  });

  test('typing still flows back out through the model', async () => {
    const fixture = TestBed.createComponent(ValueHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input.kj-password-input__field');
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.value).toBe('typed');
  });

  test('declares no lifecycle hooks', () => {
    const proto = KjPasswordInputComponent.prototype as unknown as Record<string, unknown>;
    expect(proto['ngOnInit']).toBeUndefined();
    expect(proto['ngOnDestroy']).toBeUndefined();
  });

  // arch F-2 — every boolean input on the wrapper carries
  // `transform: booleanAttribute`. `kjShowToggle` defaults to `true`, so the
  // meaningful static form there is `kjShowToggle="false"`.
  describe('bare boolean attributes (arch F-2)', () => {
    function mountBare(cmp: Type<unknown>): HTMLElement {
      const fixture = TestBed.createComponent(cmp);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    @Component({
      standalone: true,
      imports: [KjPasswordInputComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-password-input kjDisabled />`,
    })
    class DisabledHost {}

    @Component({
      standalone: true,
      imports: [KjPasswordInputComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-password-input kjShowStrength />`,
    })
    class StrengthHost {}

    @Component({
      standalone: true,
      imports: [KjPasswordInputComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-password-input kjShowToggle="false" />`,
    })
    class NoToggleHost {}

    @Component({
      standalone: true,
      imports: [KjPasswordInputComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-password-input />`,
    })
    class DefaultHost {}

    test('bare kjDisabled reaches the inner input', () => {
      const root = mountBare(DisabledHost);
      const field = root.querySelector('.kj-password-input__field') as HTMLElement;
      expect(field.getAttribute('aria-disabled')).toBe('true');
      expect(field.hasAttribute('data-disabled')).toBe(true);
    });

    test('bare kjShowStrength renders the meter', () => {
      const root = mountBare(StrengthHost);
      expect(root.querySelector('[kjPasswordStrength]')).not.toBeNull();
    });

    test('kjShowToggle="false" drops the reveal button', () => {
      const root = mountBare(NoToggleHost);
      expect(root.querySelector('.kj-password-input__toggle')).toBeNull();
    });

    test('the reveal button is present by default', () => {
      const root = mountBare(DefaultHost);
      expect(root.querySelector('.kj-password-input__toggle')).not.toBeNull();
    });
  });
});

/**
 * arch F-10. `[kjAnnounceStrength]` is the styled half of the opt-in: the
 * component renders the visually hidden region beside the meter and hands it
 * to `KjPasswordStrength`, which the headless directive cannot do for itself
 * (it owns attributes on a `role="progressbar"`, not markup next to it).
 */
describe('KjPasswordInputComponent — strength announcements', () => {
  @Component({
    standalone: true,
    imports: [KjPasswordInputComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <kj-password-input
        [(kjValue)]="value"
        [kjShowStrength]="showStrength()"
        [kjAnnounceStrength]="announce()"
      />
    `,
  })
  class AnnounceHost {
    readonly value = signal('');
    readonly showStrength = signal(true);
    readonly announce = signal(true);
  }

  /** Drains effects and waits past `KjLiveRegion`'s 50 ms announce timer. */
  async function settle(fixture: { detectChanges(): void }): Promise<void> {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 90));
    TestBed.inject(ApplicationRef).tick();
  }

  function region(root: HTMLElement): HTMLElement | null {
    return root.querySelector('kj-password-input [kjLiveRegion]');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AnnounceHost] });
  });

  test('the region is a sibling of the meter, not a descendant of it', async () => {
    const fixture = TestBed.createComponent(AnnounceHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const meter = root.querySelector('[kjPasswordStrength]') as HTMLElement;
    const live = region(root)!;
    expect(live).not.toBeNull();
    // A progressbar's descendants are not exposed, so a region inside the
    // meter would never be announced.
    expect(meter.contains(live)).toBe(false);
    expect(live.getAttribute('aria-live')).toBe('polite');
  });

  test('typing past a tier boundary announces the new tier', async () => {
    const fixture = TestBed.createComponent(AnnounceHost);
    await settle(fixture);
    expect(region(fixture.nativeElement)!.textContent).toBe('');
    fixture.componentInstance.value.set('Aa1!aaaaaaaa');
    await settle(fixture);
    expect(region(fixture.nativeElement)!.textContent).toBe('Password strength: strong');
  });

  test('[kjAnnounceStrength]="false" keeps the region silent', async () => {
    const fixture = TestBed.createComponent(AnnounceHost);
    fixture.componentInstance.announce.set(false);
    await settle(fixture);
    fixture.componentInstance.value.set('Aa1!aaaaaaaa');
    await settle(fixture);
    expect(region(fixture.nativeElement)!.textContent).toBe('');
  });

  test('hiding the meter takes the region with it and re-registers on return', async () => {
    const fixture = TestBed.createComponent(AnnounceHost);
    await settle(fixture);
    fixture.componentInstance.showStrength.set(false);
    await settle(fixture);
    expect(region(fixture.nativeElement)).toBeNull();

    // Back again: a NEW meter instance and a NEW region, so the wiring has to
    // be an effect rather than a one-shot `afterNextRender`.
    fixture.componentInstance.showStrength.set(true);
    await settle(fixture);
    fixture.componentInstance.value.set('Aa1!aaaaaaaa');
    await settle(fixture);
    expect(region(fixture.nativeElement)!.textContent).toBe('Password strength: strong');
  });
});

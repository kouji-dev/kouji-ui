import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjSpinnerComponent } from './spinner';

/**
 * Flush microtasks + the rAF that backs `afterNextRender` so the composed
 * `KjSpinner` directive has a chance to read host attributes and the
 * `prefers-reduced-motion` media query before assertions run.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

@Component({
  standalone: true,
  imports: [KjSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-spinner />`,
})
class DefaultHost {}

@Component({
  standalone: true,
  imports: [KjSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-spinner
    [kjAnimation]="animation"
    [kjVariant]="variant"
    [kjSize]="size"
    [kjAriaLabel]="label"
  />`,
})
class ConfigurableHost {
  animation: 'spin' | 'dots' | 'pulse' | 'bars' = 'spin';
  variant = 'neutral';
  size = 'md';
  label = 'Loading';
}

@Component({
  standalone: true,
  imports: [KjSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <span id="busy-lbl">Loading users</span>
    <kj-spinner aria-labelledby="busy-lbl" />
  `,
})
class LabelledByHost {}

describe('KjSpinnerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('directive composition', () => {
    test('hosts the KjSpinner directive on the kj-spinner element', async () => {
      const fixture = TestBed.createComponent(DefaultHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      // hostDirectives composition lands the directive's host bindings on the
      // wrapper's host element — role / aria-live / aria-atomic are the
      // canonical fingerprint of KjSpinner being applied.
      expect(host).not.toBeNull();
      expect(host.getAttribute('role')).toBe('status');
      expect(host.getAttribute('aria-live')).toBe('polite');
      expect(host.getAttribute('aria-atomic')).toBe('true');
      expect(host.classList.contains('kj-spinner')).toBe(true);
    });

    test('renders the inner aria-hidden glyph element', async () => {
      const fixture = TestBed.createComponent(DefaultHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const glyph = fixture.nativeElement.querySelector(
        'kj-spinner .kj-spinner__glyph',
      ) as HTMLElement;
      expect(glyph).not.toBeNull();
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('default aria-label', () => {
    test('applies "Loading" as the default aria-label on the host', async () => {
      const fixture = TestBed.createComponent(DefaultHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('aria-label')).toBe('Loading');
    });

    test('forwards a custom kjAriaLabel input to the host aria-label', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.label = 'Saving draft';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('aria-label')).toBe('Saving draft');
    });

    test('renders the visually-hidden label copy when no aria-labelledby is authored', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.label = 'Sending message';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const hidden = fixture.nativeElement.querySelector(
        'kj-spinner span[kjVisuallyHidden]',
      ) as HTMLElement;
      expect(hidden).not.toBeNull();
      expect(hidden.textContent?.trim()).toBe('Sending message');
    });

    test('skips the visually-hidden label when consumer authors aria-labelledby', async () => {
      const fixture = TestBed.createComponent(LabelledByHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const hidden = fixture.nativeElement.querySelector('kj-spinner span[kjVisuallyHidden]');
      expect(hidden).toBeNull();
      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('aria-labelledby')).toBe('busy-lbl');
    });
  });

  describe('data-animation reflection', () => {
    test('defaults to data-animation="spin"', async () => {
      const fixture = TestBed.createComponent(DefaultHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('data-animation')).toBe('spin');
    });

    test('reflects kjAnimation="dots"', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.animation = 'dots';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('data-animation')).toBe('dots');
    });

    test('reflects kjAnimation="pulse"', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.animation = 'pulse';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('data-animation')).toBe('pulse');
    });

    test('reflects kjAnimation="bars"', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.animation = 'bars';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('kj-spinner') as HTMLElement;
      expect(host.getAttribute('data-animation')).toBe('bars');
    });
  });
});

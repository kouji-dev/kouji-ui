import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjKbdComponent } from './kbd';

/**
 * Flush microtasks + the rAF that backs `afterNextRender` so the underlying
 * `KjKbd` directive's dev-mode host inspection has a chance to settle before
 * assertions.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

@Component({
  standalone: true,
  imports: [KjKbdComponent],
  template: `<kj-kbd>K</kj-kbd>`,
})
class DefaultHost {}

@Component({
  standalone: true,
  imports: [KjKbdComponent],
  template: `<kj-kbd [kjSize]="size">{{ label }}</kj-kbd>`,
})
class SizedHost {
  size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  label = 'Enter';
}

@Component({
  standalone: true,
  imports: [KjKbdComponent],
  template: `<kj-kbd [kjKbdAriaLabel]="ariaLabel">{{ label }}</kj-kbd>`,
})
class AriaLabelHost {
  ariaLabel: string | undefined = undefined;
  label = '⌘';
}

describe('KjKbdComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('host element', () => {
    test('renders an inner <kbd> with the .kj-kbd class', async () => {
      const fixture = TestBed.createComponent(DefaultHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('kj-kbd kbd.kj-kbd')).not.toBeNull();
    });

    test('projects content into the inner <kbd>', async () => {
      const fixture = TestBed.createComponent(DefaultHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const kbd = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd')!;
      expect(kbd.textContent?.trim()).toBe('K');
    });
  });

  describe('aliased input forwarding', () => {
    test('resolves kjSize via the wrapper preset (default md)', async () => {
      const fixture = TestBed.createComponent(SizedHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd')!;
      expect(host.getAttribute('data-size')).toBe('md');
    });

    test('forwards kjSize=xs to the directive (data-size)', async () => {
      const fixture = TestBed.createComponent(SizedHost);
      fixture.componentInstance.size = 'xs';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd')!;
      expect(host.getAttribute('data-size')).toBe('xs');
    });

    test('forwards kjSize=lg to the directive (data-size)', async () => {
      const fixture = TestBed.createComponent(SizedHost);
      fixture.componentInstance.size = 'lg';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd')!;
      expect(host.getAttribute('data-size')).toBe('lg');
    });
  });

  describe('aria-label propagation', () => {
    test('omits aria-label by default', async () => {
      const fixture = TestBed.createComponent(AriaLabelHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd')!;
      expect(host.hasAttribute('aria-label')).toBe(false);
    });

    test('reflects kjKbdAriaLabel to the inner <kbd> aria-label', async () => {
      const fixture = TestBed.createComponent(AriaLabelHost);
      fixture.componentInstance.ariaLabel = 'Command';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd')!;
      expect(host.getAttribute('aria-label')).toBe('Command');
    });
  });
});

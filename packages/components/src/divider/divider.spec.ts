import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjDividerComponent } from './divider';

/**
 * Flush microtasks + the rAF that backs afterNextRender so the wrapper's
 * one-shot host-content probe (and the underlying KjDivider directive's
 * isHr / withContent signals) settles before assertions.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

@Component({
  standalone: true,
  imports: [KjDividerComponent],
  template: `<kj-divider />`,
})
class RuleOnlyHost {}

@Component({
  standalone: true,
  imports: [KjDividerComponent],
  template: `<kj-divider>OR</kj-divider>`,
})
class WithTextHost {}

@Component({
  standalone: true,
  imports: [KjDividerComponent],
  template: `<kj-divider><span class="probe">OR</span></kj-divider>`,
})
class WithElementHost {}

@Component({
  standalone: true,
  imports: [KjDividerComponent],
  template: `<kj-divider [kjOrientation]="orientation" [kjStructural]="structural" [kjAlign]="align" [kjVariant]="variant" [kjSize]="size">{{ label }}</kj-divider>`,
})
class ConfigurableHost {
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  structural = false;
  align: 'start' | 'center' | 'end' = 'center';
  variant: 'solid' | 'dashed' | 'dotted' = 'solid';
  size: 'sm' | 'md' | 'lg' = 'md';
  label = '';
}

@Component({
  standalone: true,
  imports: [KjDividerComponent],
  template: `<kj-divider [kjStructural]="true" [kjOrientation]="'vertical'" />`,
})
class StructuralVerticalHost {}

describe('KjDividerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('host election', () => {
    test('renders an inner <hr> when no content is projected', async () => {
      const fixture = TestBed.createComponent(RuleOnlyHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('kj-divider hr.kj-divider')).not.toBeNull();
      expect(root.querySelector('kj-divider div.kj-divider')).toBeNull();
    });

    test('renders an inner <div> when text content is projected', async () => {
      const fixture = TestBed.createComponent(WithTextHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('kj-divider div.kj-divider')).not.toBeNull();
      expect(root.querySelector('kj-divider hr.kj-divider')).toBeNull();
    });

    test('renders an inner <div> when element content is projected', async () => {
      const fixture = TestBed.createComponent(WithElementHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const divHost = root.querySelector('kj-divider div.kj-divider');
      expect(divHost).not.toBeNull();
      expect(divHost!.querySelector('.kj-divider__content .probe')?.textContent).toBe('OR');
    });
  });

  describe('aliased input forwarding', () => {
    test('forwards kjOrientation to the directive (data-orientation)', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.orientation = 'vertical';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      expect(host.getAttribute('data-orientation')).toBe('vertical');
    });

    test('forwards kjAlign to the directive (data-align) on the with-content host', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.label = 'Today';
      fixture.componentInstance.align = 'start';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider div.kj-divider')!;
      expect(host).not.toBeNull();
      expect(host.getAttribute('data-align')).toBe('start');
    });

    test('resolves kjVariant via the wrapper preset (default solid)', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      expect(host.getAttribute('data-variant')).toBe('solid');
    });

    test('forwards kjVariant to the directive (data-variant)', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.variant = 'dashed';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      expect(host.getAttribute('data-variant')).toBe('dashed');
    });

    test('resolves kjSize via the wrapper preset (default md)', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      expect(host.getAttribute('data-size')).toBe('md');
    });

    test('forwards kjSize to the directive (data-size)', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.size = 'lg';
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      expect(host.getAttribute('data-size')).toBe('lg');
    });
  });

  describe('structural-mode wiring (via KjDivider directive)', () => {
    test('decorative default: aria-hidden="true" on the inner <hr>', async () => {
      const fixture = TestBed.createComponent(RuleOnlyHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      expect(host.getAttribute('aria-hidden')).toBe('true');
      expect(host.hasAttribute('role')).toBe(false);
    });

    test('structural mode on a with-content <div>: role="separator"', async () => {
      const fixture = TestBed.createComponent(ConfigurableHost);
      fixture.componentInstance.label = 'OR';
      fixture.componentInstance.structural = true;
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider div.kj-divider')!;
      expect(host).not.toBeNull();
      expect(host.getAttribute('role')).toBe('separator');
      expect(host.hasAttribute('aria-hidden')).toBe(false);
    });

    test('structural + vertical: aria-orientation="vertical" via the directive', async () => {
      const fixture = TestBed.createComponent(StructuralVerticalHost);
      fixture.detectChanges();
      await flushAfterNextRender();
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('kj-divider hr.kj-divider')!;
      // <hr> has implicit role="separator" — directive must NOT set role explicitly.
      expect(host.hasAttribute('role')).toBe(false);
      expect(host.getAttribute('aria-orientation')).toBe('vertical');
      expect(host.hasAttribute('aria-hidden')).toBe(false);
    });
  });
});

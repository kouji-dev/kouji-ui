import { ChangeDetectionStrategy, Component, NgZone, signal, ɵNoopNgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

/**
 * The library's supported change-detection mode is zoneless: Angular 22 defaults
 * to it, `test-setup.ts` opts in explicitly, and apps/docs provides it. This spec
 * keeps that claim falsifiable — a signal write made outside the Angular zone must
 * reach the DOM through the zoneless scheduler alone, with no `detectChanges()`.
 */
@Component({
  selector: 'kj-zoneless-probe',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<output data-test="count">{{ count() }}</output>`,
})
class ZonelessProbe {
  readonly count = signal(0);
}

describe('zoneless change detection', () => {
  it('zone.js is not loaded and the TestBed runs without an Angular zone', () => {
    expect((globalThis as { Zone?: unknown }).Zone).toBeUndefined();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(NgZone)).toBeInstanceOf(ɵNoopNgZone);
  });

  it('a signal write reaches the DOM with no zone and no manual detectChanges', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(ZonelessProbe);
    await fixture.whenStable();
    const out = fixture.nativeElement.querySelector('[data-test="count"]') as HTMLElement;
    expect(out.textContent).toBe('0');

    // Nothing but the signal graph can schedule this render: there is no zone
    // to notice the write, and the spec never calls `detectChanges()`.
    TestBed.inject(NgZone).runOutsideAngular(() => fixture.componentInstance.count.set(1));

    await fixture.whenStable();
    expect(out.textContent).toBe('1');
  });
});

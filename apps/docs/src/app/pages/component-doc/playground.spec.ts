import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { PlaygroundComponent } from './playground';

/**
 * The playground stage is the only place a *real* library component is
 * instantiated on a `/docs/*` page during prerender, so two properties have to
 * hold together (SSR review F-16, lazy-loading review F-1):
 *
 *  1. the playground arrives through a dynamic `import()`, so nothing pins the
 *     styled library into the component-doc route chunk, and
 *  2. the load blocks `ApplicationRef.whenStable()` — the promise the
 *     prerender awaits — so the rendered HTML contains the mounted component
 *     rather than the "not yet wired" placeholder.
 *
 * Asserting (2) is what makes this more than a smoke test: before the
 * `PendingTasks` wrapper, `whenStable()` resolved with an empty stage and
 * every prerendered docs page shipped chrome only.
 */
describe('PlaygroundComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  test('renders the placeholder for a symbol with no playground', async () => {
    const fixture = TestBed.createComponent(PlaygroundComponent);
    fixture.componentRef.setInput('symbol', 'NotAComponent');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.playground-stage')).toBeNull();
  });

  test('the stage is empty synchronously — the playground is a separate chunk', () => {
    const fixture = TestBed.createComponent(PlaygroundComponent);
    fixture.componentRef.setInput('symbol', 'KjButtonComponent');
    fixture.detectChanges();
    // A static registry would have mounted here, in the first change detection.
    expect(fixture.nativeElement.querySelector('.playground-stage')).toBeNull();
  });

  test('mounts the real component once the app reports stability', async () => {
    const fixture = TestBed.createComponent(PlaygroundComponent);
    fixture.componentRef.setInput('symbol', 'KjButtonComponent');
    fixture.detectChanges();

    // `whenStable()` is exactly what the prerender awaits before serializing.
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    const stage = fixture.nativeElement.querySelector('.playground-stage');
    expect(stage).not.toBeNull();
    expect(stage.querySelector('.kj-button'), 'no real kj component in the stage').not.toBeNull();
  });

  test('renders the generated snippet next to the stage', async () => {
    const fixture = TestBed.createComponent(PlaygroundComponent);
    fixture.componentRef.setInput('symbol', 'KjButtonComponent');
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    const snippet = fixture.nativeElement.querySelector('.pg-snippet-code');
    expect(snippet?.textContent).toContain('kj-button');
  });
});

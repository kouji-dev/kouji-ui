import { Component, Directive, InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { injectParent } from './inject-parent';
import { KJ_TABS } from '../../tabs/tabs.context';

interface Ctx { readonly tag: string }
const TOKEN = new InjectionToken<Ctx>('KjThing');

@Directive({ selector: '[kjThingParent]', standalone: true, providers: [{ provide: TOKEN, useValue: { tag: 'parent' } }] })
class ThingParent {}

@Directive({ selector: '[kjThingChild]', standalone: true })
class ThingChild {
  readonly ctx = injectParent(TOKEN, { child: 'KjThingChild', parent: '[kjThingParent]' });
}

@Component({ standalone: true, imports: [ThingParent, ThingChild], template: `<div kjThingParent><span kjThingChild></span></div>` })
class Nested {}

@Component({ standalone: true, imports: [ThingChild], template: `<span kjThingChild></span>` })
class Orphan {}

describe('injectParent (arch F-14)', () => {
  it('returns the parent context when an ancestor provides it', () => {
    const fixture = TestBed.createComponent(Nested);
    fixture.detectChanges();
    const child = fixture.debugElement.query((d) => d.injector.get(ThingChild, null) !== null);
    expect(child.injector.get(ThingChild).ctx.tag).toBe('parent');
  });

  it('throws a message naming the child and the selector to add, not NG0201', () => {
    // Angular's own failure is `NG0201: No provider for InjectionToken KjThing`,
    // which names neither the child that needs it nor what to type.
    expect(() => {
      const fixture = TestBed.createComponent(Orphan);
      fixture.detectChanges();
    }).toThrow(/\[KjThingChild\] must be used inside `\[kjThingParent\]`/);
  });

  it('is what the shipped context children use', () => {
    // KJ_TABS is one of the real parent tokens routed through the helper, so a
    // stray <div kjTab> reports the tabs contract rather than a token name.
    @Directive({ selector: '[kjStrayTab]', standalone: true })
    class StrayTab {
      readonly tabs = injectParent(KJ_TABS, { child: 'KjTab', parent: '[kjTabs]' });
    }
    @Component({ standalone: true, imports: [StrayTab], template: `<div kjStrayTab></div>` })
    class StrayHost {}
    expect(() => {
      const fixture = TestBed.createComponent(StrayHost);
      fixture.detectChanges();
    }).toThrow(/\[KjTab\] must be used inside `\[kjTabs\]`/);
  });
});

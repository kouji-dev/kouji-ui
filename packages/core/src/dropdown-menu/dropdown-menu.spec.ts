import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, it, expect, beforeEach } from 'vitest';

import { KjDropdownMenu } from './dropdown-menu';
import { KjDropdownMenuTrigger, type KjDropdownMenuCloseReason } from './dropdown-menu-trigger';
import { KjDropdownMenuContent } from './dropdown-menu-content';
import { KjDropdownMenuItem } from './dropdown-menu-item';
import { KjDropdownMenuGroup } from './dropdown-menu-group';
import { KjDropdownMenuLabel } from './dropdown-menu-label';
import { KjDropdownMenuSeparator } from './dropdown-menu-separator';

function mkHost(triggerKind: 'click' | 'contextmenu', mount: 'portal' | 'point' | 'inline') {
  @Component({
    selector: 'kj-host-cmp',
    standalone: true,
    imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
    template: `
      <button
        kjDropdownMenuTrigger
        #t="kjDropdownMenuTrigger"
        [kjTrigger]="kind"
        [kjMount]="mount">Open</button>
      <kj-dropdown-menu-content [kjFor]="t" [kjMount]="mount">
        <button kjDropdownMenuItem>One</button>
      </kj-dropdown-menu-content>
    `,
  })
  class Host {
    readonly kind = triggerKind;
    readonly mount = mount;
  }
  return Host;
}

describe('KjDropdownMenu (overlay primitives)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  // The trigger provides a switchable trigger-event slot whose popup kind is
  // fixed to `'menu'`, so `aria-haspopup` no longer depends on the concrete
  // click / contextmenu strategy.
  it('click trigger + portal mount: aria-haspopup=menu, aria-expanded=false', () => {
    const fixture = TestBed.createComponent(mkHost('click', 'portal'));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[kjDropdownMenuTrigger]') as HTMLElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('contextmenu trigger: aria-haspopup=menu, aria-expanded=false', () => {
    const fixture = TestBed.createComponent(mkHost('contextmenu', 'point'));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[kjDropdownMenuTrigger]') as HTMLElement;
    expect(btn.getAttribute('aria-haspopup')).toBe('menu');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  describe('reactive inputs (F-17)', () => {
    const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

    afterEach(() => {
      document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    });

    it('a bound kjMount="inline" keeps the panel in place on open (no portal wrapper)', async () => {
      const fixture = TestBed.createComponent(mkHost('click', 'inline'));
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const btn = host.querySelector('button[kjDropdownMenuTrigger]') as HTMLButtonElement;
      const panel = host.querySelector('kj-dropdown-menu-content') as HTMLElement;
      btn.click();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(panel.getAttribute('data-state')).toBe('open');
      expect(panel.parentElement, 'inline: never portalled').toBe(host);
      expect(panel.closest('.kj-overlay-wrapper')).toBeNull();
      fixture.destroy();
      await settle();
    });

    it('a bound kjTrigger="contextmenu" opens on the contextmenu event, not on click', async () => {
      const fixture = TestBed.createComponent(mkHost('contextmenu', 'point'));
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const btn = host.querySelector('button[kjDropdownMenuTrigger]') as HTMLButtonElement;
      const panel = host.querySelector('kj-dropdown-menu-content') as HTMLElement;
      btn.click();
      fixture.detectChanges();
      expect(panel.getAttribute('data-state')).toBe('closed');
      btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 60 }));
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(panel.getAttribute('data-state')).toBe('open');
      expect(panel.closest('.kj-overlay-wrapper'), 'point: portalled').not.toBeNull();
      fixture.destroy();
      await settle();
    });
  });

  it('panel: role="menu" + hidden while closed (portal mount)', () => {
    const fixture = TestBed.createComponent(mkHost('click', 'portal'));
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('panel: role="menu" + hidden (point mount)', () => {
    const fixture = TestBed.createComponent(mkHost('contextmenu', 'point'));
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('panel: role="menu" + hidden (inline mount)', () => {
    const fixture = TestBed.createComponent(mkHost('click', 'inline'));
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('item composes KjListItem — role="menuitem" + a stable id', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <button kjDropdownMenuItem>One</button>
          <button kjDropdownMenuItem>Two</button>
        </kj-dropdown-menu-content>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button[kjDropdownMenuItem]'),
    );
    expect(items).toHaveLength(2);
    for (const i of items) {
      expect(i.getAttribute('role')).toBe('menuitem');
      expect(i.id).toMatch(/^kj-list-item-\d+$/);
    }
  });

  it('disabled item gets aria-disabled="true" via composed KjListItem', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <button kjDropdownMenuItem kjDisabled>Disabled</button>
        </kj-dropdown-menu-content>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('button[kjDropdownMenuItem]') as HTMLElement;
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('click on item emits (kjSelect) and routes through KjListItem.activate', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <button kjDropdownMenuItem (kjSelect)="hit = hit + 1">One</button>
        </kj-dropdown-menu-content>
      `,
    })
    class Host { hit = 0; }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('button[kjDropdownMenuItem]') as HTMLElement;
    item.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.hit).toBe(1);
  });

  it('click on a disabled item does not emit (kjSelect)', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <button kjDropdownMenuItem kjDisabled (kjSelect)="hit = hit + 1">Disabled</button>
        </kj-dropdown-menu-content>
      `,
    })
    class Host { hit = 0; }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('button[kjDropdownMenuItem]') as HTMLElement;
    item.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.hit).toBe(0);
  });

  it('content has KjListNavigator in roving mode: items get tabindex bindings', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <button kjDropdownMenuItem>One</button>
          <button kjDropdownMenuItem>Two</button>
        </kj-dropdown-menu-content>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button[kjDropdownMenuItem]'),
    );
    // Roving seed: the first navigable is tabbable (0), others get -1.
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');

    // a11y F-15 — one focus signal at a time (SC 4.1.2). DOM focus roves onto
    // the menuitem, so the role="menu" host must NOT also publish
    // aria-activedescendant. The roving model reaches the composed navigator
    // through KJ_LIST_FOCUS_MODE_DEFAULT; the static `kjFocusMode` host
    // attribute this component used to carry never bound the input at all, so
    // the navigator stayed in activedescendant mode and published the
    // attribute over a roving list. Asserted after a real navigation, since an
    // active id only exists once something activates.
    const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
    items[0].focus();
    fixture.detectChanges();
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[1]);
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('group composes KjListGroup: role="group" + aria-labelledby wired to label', () => {
    @Component({
      standalone: true,
      imports: [
        KjDropdownMenuTrigger,
        KjDropdownMenuContent,
        KjDropdownMenuItem,
        KjDropdownMenuGroup,
        KjDropdownMenuLabel,
      ],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <div kjDropdownMenuGroup>
            <span kjDropdownMenuLabel>Account</span>
            <button kjDropdownMenuItem>Profile</button>
          </div>
        </kj-dropdown-menu-content>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector('[kjDropdownMenuGroup]') as HTMLElement;
    const label = fixture.nativeElement.querySelector('[kjDropdownMenuLabel]') as HTMLElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.id).toMatch(/^kj-list-group-label-\d+$/);
  });

  it('separator composes KjListSeparator: role="separator" + aria-orientation', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuSeparator],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</button>
        <kj-dropdown-menu-content [kjFor]="t" [kjMount]="'inline'">
          <div kjDropdownMenuSeparator></div>
        </kj-dropdown-menu-content>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const sep = fixture.nativeElement.querySelector('[kjDropdownMenuSeparator]') as HTMLElement;
    expect(sep.getAttribute('role')).toBe('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
    expect(sep.getAttribute('tabindex')).toBe('-1');
  });

  describe('focus management (portal mount)', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem],
      template: `
        <button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger" id="trigger" (kjMenuClosed)="closed.push($event)">Open</button>
        <kj-dropdown-menu-content [kjFor]="t">
          <button kjDropdownMenuItem id="one" (kjSelect)="picked = 'one'">One</button>
          <button kjDropdownMenuItem id="two" (kjSelect)="picked = 'two'">Two</button>
        </kj-dropdown-menu-content>
      `,
    })
    class Host {
      picked = '';
      readonly closed: KjDropdownMenuCloseReason[] = [];
    }

    const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));
    const pressKey = (key: string): boolean =>
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );

    afterEach(() => {
      document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    });

    async function openMenu() {
      const fixture = TestBed.createComponent(Host);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
      const panel = fixture.nativeElement.querySelector('kj-dropdown-menu-content') as HTMLElement;
      const item = (id: string) => panel.querySelector<HTMLButtonElement>(`#${id}`)!;
      trigger.focus();
      trigger.click();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(panel.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      const done = async () => {
        fixture.destroy();
        fixture.nativeElement.remove();
        await settle();
      };
      return { fixture, trigger, panel, item, done };
    }

    it('opening moves focus onto the first item; ArrowDown moves to the second', async () => {
      const { fixture, item, done } = await openMenu();
      expect(document.activeElement).toBe(item('one'));
      pressKey('ArrowDown');
      fixture.detectChanges();
      expect(document.activeElement).toBe(item('two'));
      await done();
    });

    it('Escape closes the menu and returns focus to the trigger', async () => {
      const { fixture, trigger, item, done } = await openMenu();
      pressKey('ArrowDown');
      fixture.detectChanges();
      expect(document.activeElement).toBe(item('two'));

      pressKey('Escape');
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
      await done();
    });

    it('selecting an item closes the menu and returns focus to the trigger', async () => {
      const { fixture, trigger, item, done } = await openMenu();
      pressKey('ArrowDown');
      fixture.detectChanges();
      const two = item('two');
      expect(document.activeElement).toBe(two);

      two.click();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(fixture.componentInstance.picked).toBe('two');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
      await done();
    });

    it('kjMenuClosed reports every close with its reason: item, escape, click-outside, and the trigger toggle (F-11)', async () => {
      const { fixture, trigger, item, done } = await openMenu();
      const closed = fixture.componentInstance.closed;
      item('one').click();
      fixture.detectChanges();
      expect(closed).toEqual(['item']);

      await settle();
      trigger.click();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      pressKey('Escape');
      fixture.detectChanges();
      expect(closed).toEqual(['item', 'escape']);

      await settle();
      trigger.click();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      fixture.detectChanges();
      expect(closed).toEqual(['item', 'escape', 'click-outside']);

      await settle();
      trigger.click();
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      // A click on the trigger while open is the trigger's own toggle (the
      // stack never treats its trigger as "outside"): an API-level close.
      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(closed).toEqual(['item', 'escape', 'click-outside', 'programmatic']);
      await done();
    });
  });

  it('KjDropdownMenu root directive provides KJ_LIST_NAVIGATOR_CONFIG with items and owns role="menu"', () => {
    @Component({
      standalone: true,
      imports: [KjDropdownMenu, KjDropdownMenuItem],
      template: `
        <div kjDropdownMenu>
          <button kjDropdownMenuItem>A</button>
          <button kjDropdownMenuItem>B</button>
        </div>
      `,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('button[kjDropdownMenuItem]');
    expect(items.length).toBe(2);
    expect((fixture.nativeElement as HTMLElement).querySelector('[kjDropdownMenu]')!.getAttribute('role')).toBe('menu');
  });
});

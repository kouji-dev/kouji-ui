import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjDropdownMenu, KjDropdownMenuItem, KjDropdownMenuSeparator, KjMenubar } from '@kouji-ui/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';

/**
 * The styled menubar suite, end to end: `<kj-menubar>` + `<kj-menubar-item>`
 * with a `[kjDropdownMenuTriggerFor]` submenu. The headless `KjMenubar` spec
 * owns the navigator mechanics; this file covers the wrapper composition a
 * consumer types — the landmark, one roving Tab stop, arrow keys across the
 * bar, the disabled item being skipped, and submenu open / select / Escape
 * with focus coming back to the bar item each time.
 */

/** Body-level overlays produced by `KjOverlayService.createFromTemplate`. */
function findOverlays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kj-overlay]'));
}

function findOpenPanel(): HTMLElement | null {
  for (const o of findOverlays()) {
    if (o.getAttribute('role') === 'menu') return o;
    const m = o.querySelector<HTMLElement>('[role="menu"]');
    if (m) return m;
  }
  return null;
}

function cleanupOverlays(): void {
  for (const o of findOverlays()) o.remove();
  document.body.querySelector('.kj-overlay-container')?.remove();
}

function settle(fixture: { detectChanges(): void }): void {
  fixture.detectChanges();
  for (let i = 0; i < 32; i++) {
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
  }
  fixture.detectChanges();
}

@Component({
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenu,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-menubar kjAriaLabel="Application" [kjLoop]="loop()">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDisabled]="editDisabled()" [kjDropdownMenuTriggerFor]="editMenu">
        Edit
      </kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="viewMenu">View</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem id="new" (kjSelect)="picked.set('new')">New</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem id="save" (kjSelect)="picked.set('save')">Save</button>
      </div>
    </ng-template>
    <ng-template #editMenu>
      <div kjDropdownMenu><button kjDropdownMenuItem id="undo">Undo</button></div>
    </ng-template>
    <ng-template #viewMenu>
      <div kjDropdownMenu><button kjDropdownMenuItem id="zoom">Zoom in</button></div>
    </ng-template>
  `,
})
class Host {
  readonly loop = signal(false);
  readonly editDisabled = signal(false);
  readonly picked = signal<string | null>(null);
}

describe('KjMenubarComponent (wrapper suite)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'queueMicrotask',
        'Date',
      ],
    });
  });

  afterEach(() => {
    cleanupOverlays();
    vi.useRealTimers();
  });

  function mount() {
    const fixture = TestBed.createComponent(Host);
    settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const bar = root.querySelector<HTMLElement>('kj-menubar')!;
    const items = Array.from(root.querySelectorAll<HTMLElement>('.kj-menubar-item'));
    return { fixture, root, bar, items };
  }

  function press(key: string): void {
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  it('renders a named menubar landmark around one menuitem per item', () => {
    const { bar, items } = mount();

    expect(bar.classList.contains('kj-menubar')).toBe(true);
    expect(bar.getAttribute('role')).toBe('menubar');
    expect(bar.getAttribute('aria-label')).toBe('Application');
    expect(bar.getAttribute('aria-orientation')).toBe('horizontal');

    expect(items).toHaveLength(3);
    expect(items.map((i) => i.textContent?.trim())).toEqual(['File', 'Edit', 'View']);
    expect(items.every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
    expect(items.every((i) => i.getAttribute('aria-haspopup') === 'menu')).toBe(true);
    expect(items.every((i) => i.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('the whole bar is one Tab stop and nothing is focused on first render', () => {
    const { items } = mount();

    expect(items.map((i) => i.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(items).not.toContain(document.activeElement);
  });

  it('ArrowRight and ArrowLeft walk across the bar without wrapping by default', () => {
    const { fixture, items } = mount();

    items[0].focus();
    press('ArrowRight');
    settle(fixture);
    expect(document.activeElement).toBe(items[1]);

    press('ArrowRight');
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);

    press('ArrowRight');
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);

    press('ArrowLeft');
    settle(fixture);
    expect(document.activeElement).toBe(items[1]);
  });

  it('Home and End jump to the ends of the bar', () => {
    const { fixture, items } = mount();

    items[1].focus();
    press('End');
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);

    press('Home');
    settle(fixture);
    expect(document.activeElement).toBe(items[0]);
  });

  it('kjLoop wraps past the last item', () => {
    const { fixture, items } = mount();
    fixture.componentInstance.loop.set(true);
    settle(fixture);

    items[2].focus();
    press('ArrowRight');
    settle(fixture);
    expect(document.activeElement).toBe(items[0]);
  });

  it('a disabled item is announced, skipped by the arrow keys and never opens', () => {
    const { fixture, items } = mount();
    fixture.componentInstance.editDisabled.set(true);
    settle(fixture);

    expect(items[1].getAttribute('aria-disabled')).toBe('true');

    items[0].focus();
    press('ArrowRight');
    settle(fixture);
    expect(document.activeElement).toBe(items[2]);

    items[1].click();
    settle(fixture);
    expect(findOpenPanel()).toBeNull();
  });

  it('clicking a bar item opens its submenu as a role="menu" panel', () => {
    const { fixture, items } = mount();

    items[0].click();
    settle(fixture);

    const panel = findOpenPanel();
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('#new')?.getAttribute('role')).toBe('menuitem');
    expect(items[0].getAttribute('aria-expanded')).toBe('true');
    expect(items[0].getAttribute('data-state')).toBe('active');
  });

  it('opening another bar item closes the first — only one submenu at a time', () => {
    const { fixture, items } = mount();

    items[0].click();
    settle(fixture);
    items[2].click();
    settle(fixture);

    expect(items[0].getAttribute('aria-expanded')).toBe('false');
    expect(items[2].getAttribute('aria-expanded')).toBe('true');
    expect(findOpenPanel()?.querySelector('#zoom')).not.toBeNull();
  });

  it('ArrowDown opens the focused item — never another one, and never moves along the bar', () => {
    const { fixture, items } = mount();

    // The last item: a navigator that treated ArrowDown as movement would
    // wrap to the first item and open that submenu instead.
    items[2].focus();
    settle(fixture);
    press('ArrowDown');
    settle(fixture);

    expect(items.map((i) => i.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'true']);
    expect(findOpenPanel()?.querySelector('#zoom')).not.toBeNull();
  });

  it('ArrowUp opens the focused item too, rather than walking the bar', () => {
    const { fixture, items } = mount();

    items[0].focus();
    settle(fixture);
    press('ArrowUp');
    settle(fixture);

    expect(items.map((i) => i.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);
  });

  it('a disclosure key on a disabled item opens nothing', () => {
    const { fixture, items } = mount();
    fixture.componentInstance.editDisabled.set(true);
    settle(fixture);

    items[1].focus();
    settle(fixture);
    press('ArrowDown');
    settle(fixture);

    expect(findOpenPanel()).toBeNull();
  });

  it('selecting a submenu item emits it, closes the submenu and returns focus to the bar item', () => {
    const { fixture, items } = mount();

    items[0].focus();
    items[0].click();
    settle(fixture);

    (findOpenPanel()!.querySelector('#save') as HTMLButtonElement).click();
    settle(fixture);

    expect(fixture.componentInstance.picked()).toBe('save');
    expect(findOpenPanel()).toBeNull();
    expect(items[0].getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(items[0]);
  });

  it('Escape closes the open submenu and leaves focus on the bar item', () => {
    const { fixture, items } = mount();

    items[0].focus();
    items[0].click();
    settle(fixture);
    expect(findOpenPanel()).not.toBeNull();

    press('Escape');
    settle(fixture);

    expect(findOpenPanel()).toBeNull();
    expect(items[0].getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(items[0]);
  });

  it('(kjActivate) fires for an item used as a plain action', () => {
    @Component({
      standalone: true,
      imports: [KjMenubarComponent, KjMenubarItemComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <kj-menubar kjAriaLabel="Toolbar">
          <kj-menubar-item (kjActivate)="hits.set(hits() + 1)">Run</kj-menubar-item>
        </kj-menubar>
      `,
    })
    class ActionHost {
      readonly hits = signal(0);
    }

    const fixture = TestBed.createComponent(ActionHost);
    settle(fixture);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.kj-menubar-item')!
      .click();
    settle(fixture);

    expect(fixture.componentInstance.hits()).toBe(1);
    expect(findOpenPanel()).toBeNull();
  });

  // arch F-2 — `kjLoop` on `<kj-menubar>` and `kjDisabled` on
  // `<kj-menubar-item>` both carry `transform: booleanAttribute`, so the
  // bare-attribute form reaches the composed core directives.
  describe('bare boolean attributes (arch F-2)', () => {
    it('bare kjDisabled reflects aria-disabled on the item host', () => {
      @Component({
        standalone: true,
        imports: [KjMenubarComponent, KjMenubarItemComponent, KjDropdownMenu, KjDropdownMenuItem],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `
          <kj-menubar kjAriaLabel="App">
            <kj-menubar-item kjDisabled [kjDropdownMenuTriggerFor]="m">File</kj-menubar-item>
          </kj-menubar>
          <ng-template #m><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
        `,
      })
      class BareHost {}
      const fixture = TestBed.createComponent(BareHost);
      fixture.detectChanges();
      const item = fixture.nativeElement.querySelector('kj-menubar-item') as HTMLElement;
      expect(item.getAttribute('aria-disabled')).toBe('true');
    });

    it('bare kjLoop reaches the composed KjMenubar', () => {
      @Component({
        standalone: true,
        imports: [KjMenubarComponent, KjMenubarItemComponent, KjDropdownMenu, KjDropdownMenuItem],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `
          <kj-menubar kjLoop kjAriaLabel="App">
            <kj-menubar-item [kjDropdownMenuTriggerFor]="m1">File</kj-menubar-item>
            <kj-menubar-item [kjDropdownMenuTriggerFor]="m2">Edit</kj-menubar-item>
          </kj-menubar>
          <ng-template #m1><div kjDropdownMenu><button kjDropdownMenuItem>A</button></div></ng-template>
          <ng-template #m2><div kjDropdownMenu><button kjDropdownMenuItem>B</button></div></ng-template>
        `,
      })
      class BareHost {}
      const fixture = TestBed.createComponent(BareHost);
      fixture.detectChanges();
      const bar = fixture.nativeElement.querySelector('kj-menubar') as HTMLElement;
      const menubar = fixture.debugElement
        .query((n: { nativeElement?: HTMLElement }) => n.nativeElement === bar)
        .injector.get(KjMenubar);
      expect(menubar.kjLoop()).toBe(true);
    });
  });
});

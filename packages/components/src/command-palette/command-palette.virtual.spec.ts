import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  KjCommandItemComponent,
  KjCommandPaletteComponent,
  KjCommandPaletteItemTemplate,
} from './command-palette';

interface Cmd {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const COMMANDS: readonly Cmd[] = Array.from({ length: 5000 }, (_, i) => ({
  id: `cmd-${i}`,
  label: `Command ${i}`,
}));

function overlay(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container');
}

const flush = (): Promise<void> => new Promise(r => setTimeout(r, 0));

@Component({
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent, KjCommandPaletteItemTemplate],
  template: `
    <kj-command-palette
      [(kjOpen)]="open"
      [kjItems]="items()"
      [kjVirtual]="virtual()"
      [kjVirtualItemSize]="32"
      [kjAutoCloseOnActivate]="false"
      (kjActivate)="activated.set($any($event).value)"
    >
      <ng-template kjCommandPaletteItemTemplate let-item>
        <kj-command-item [kjValue]="item.id" [kjDisabled]="!!item.disabled">
          {{ item.label }}
        </kj-command-item>
      </ng-template>
    </kj-command-palette>
  `,
})
class Host {
  readonly open = signal(true);
  readonly virtual = signal(true);
  readonly items = signal<readonly Cmd[]>(COMMANDS);
  readonly activated = signal<unknown>(null);
}

describe('<kj-command-palette [kjVirtual]> — windowed list (perf F-4)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let appRef: ApplicationRef;

  const settle = (times = 3): void => {
    for (let i = 0; i < times; i++) {
      fixture.detectChanges();
      appRef.tick();
    }
  };

  const rows = (): HTMLElement[] =>
    [...document.querySelectorAll<HTMLElement>('.kj-command-item')];
  const labels = (): string[] => rows().map(r => r.textContent!.trim());
  const input = (): HTMLInputElement =>
    document.querySelector<HTMLInputElement>('.kj-command-palette__input')!;
  const activeRow = (): HTMLElement | null => {
    const id = input().getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };
  const press = (key: string): void => {
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    settle();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    appRef = TestBed.inject(ApplicationRef);
    settle();
    await flush();
    settle();
  });

  afterEach(() => {
    fixture.destroy();
    overlay()?.remove();
  });

  it('renders a bounded window for 5 000 items instead of one row each', () => {
    expect(fixture.componentInstance.items()).toHaveLength(5000);
    const n = rows().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(100);
    // The scrollable content is still sized for the whole dataset, so the
    // scrollbar tells the truth about how much list there is.
    const box = document.querySelector<HTMLElement>('.kj-command-palette__virtual')!;
    expect(parseInt(box.style.height, 10)).toBe(5000 * 32);
  });

  it('ArrowDown walks past the end of the window and keeps the active row rendered', () => {
    press('ArrowDown');
    expect(activeRow()?.textContent?.trim()).toBe('Command 1');

    const windowEnd = rows().length;
    for (let i = 1; i < windowEnd + 5; i++) press('ArrowDown');

    const active = activeRow();
    expect(active, 'aria-activedescendant always points at a rendered row').not.toBeNull();
    expect(active!.textContent!.trim()).toBe(`Command ${windowEnd + 5}`);
    expect(rows().length).toBeLessThan(100);
  });

  it('End jumps to the last item in the dataset and Home comes back to the first', () => {
    press('End');
    expect(activeRow()?.textContent?.trim()).toBe('Command 4999');
    expect(labels()).toContain('Command 4999');
    expect(rows().length).toBeLessThan(100);

    press('Home');
    expect(activeRow()?.textContent?.trim()).toBe('Command 0');
  });

  it('Enter activates the windowed row the cursor is on', () => {
    press('End');
    press('Enter');
    expect(fixture.componentInstance.activated()).toBe('cmd-4999');
  });

  it('reports the dataset position, not the window position, through ARIA', () => {
    press('End');
    const active = activeRow()!;
    expect(active.getAttribute('aria-setsize')).toBe('5000');
    expect(active.getAttribute('aria-posinset')).toBe('5000');
  });

  it('filters the data and restarts the cursor at the top of the new result set', () => {
    input().value = 'Command 4321';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    settle();

    expect(labels()).toEqual(['Command 4321']);
    expect(activeRow()?.textContent?.trim()).toBe('Command 4321');
    expect(document.querySelector('.kj-command-palette__empty')!.hasAttribute('hidden')).toBe(true);
  });

  it('shows the empty state when nothing in the dataset matches', () => {
    input().value = 'zzzz-no-such-command';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    settle();

    expect(rows()).toHaveLength(0);
    expect(document.querySelector('.kj-command-palette__empty')!.hasAttribute('hidden')).toBe(false);
    expect(input().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('skips a disabled row when the cursor moves over it', () => {
    fixture.componentInstance.items.set([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Bravo', disabled: true },
      { id: 'c', label: 'Charlie' },
    ]);
    settle();

    press('ArrowDown');
    expect(activeRow()?.textContent?.trim()).toBe('Charlie');
  });

  it('renders every row again when kjVirtual is turned off', () => {
    fixture.componentInstance.items.set(COMMANDS.slice(0, 40));
    fixture.componentInstance.virtual.set(false);
    settle();

    expect(rows()).toHaveLength(40);
    expect(document.querySelector('.kj-command-palette__virtual')).toBeNull();
  });
});

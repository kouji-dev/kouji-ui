import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjDrawer, KjDrawerComponent, KjDrawerRef, KjDrawerService, KjDrawerTitleComponent, type KjDrawerOpenOptions } from './drawer';

/**
 * A drawer body the way an app writes one: the core `<kj-drawer>` panel
 * wrapped in the styled `<kj-drawer-shell>` so `drawer.css` applies.
 */
@Component({
  selector: 'kj-styled-drawer-body',
  standalone: true,
  imports: [KjDrawer, KjDrawerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-drawer-shell>
      <kj-drawer>
        <header class="kj-drawer-header"><h2 class="kj-drawer-title" id="title">Settings</h2></header>
        <div class="kj-drawer-body">Body</div>
        <footer class="kj-drawer-footer"><button id="ok" (click)="ref.close('ok')">OK</button></footer>
      </kj-drawer>
    </kj-drawer-shell>
  `,
})
class StyledDrawerBody {
  readonly ref = inject<KjDrawerRef<StyledDrawerBody, string>>(KjDrawerRef);
}

/**
 * The service renders the body outside a fixture; an explicit
 * `ApplicationRef.tick()` stands in for the change detection a running app
 * performs after `open()`.
 */
function openDrawer(opts?: KjDrawerOpenOptions): KjDrawerRef<StyledDrawerBody, string> {
  const ref = TestBed.inject(KjDrawerService).open<StyledDrawerBody, string>(StyledDrawerBody, opts);
  TestBed.inject(ApplicationRef).tick();
  return ref;
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container kj-drawer');
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

function cleanupOverlays(): void {
  document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

describe('KjDrawerComponent (styled shell) with KjDrawerService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    cleanupOverlays();
    await settle();
  });

  it('renders the core panel inside the shell as a modal dialog on the default side', () => {
    openDrawer();
    const panel = findPanel();
    expect(panel).toBeTruthy();
    expect(panel!.closest('kj-drawer-shell')).toBeTruthy();
    expect(panel!.classList.contains('kj-drawer')).toBe(true);
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(panel!.getAttribute('aria-modal')).toBe('true');
    expect(panel!.getAttribute('data-kj-side')).toBe('right');
    expect(panel!.querySelector('.kj-drawer-header')).toBeTruthy();
    expect(panel!.querySelector('.kj-drawer-body')).toBeTruthy();
    expect(panel!.querySelector('.kj-drawer-footer')).toBeTruthy();
  });

  it('shell host renders as display: contents so it never breaks the panel layout', () => {
    openDrawer();
    const shell = document.body.querySelector<HTMLElement>('.kj-overlay-container kj-drawer-shell')!;
    expect(shell.style.display).toBe('contents');
  });

  it('side option is reflected on the panel as data-kj-side', () => {
    openDrawer({ side: 'left' });
    expect(findPanel()!.getAttribute('data-kj-side')).toBe('left');
  });

  it('a control projected in the footer closes the drawer with its result', async () => {
    const ref = openDrawer();
    await flush();
    findPanel()!.querySelector<HTMLButtonElement>('#ok')!.click();
    await expect(ref.result).resolves.toBe('ok');
    await flush();
    expect(ref.state()).toBe('closed');
  });
});

@Component({
  selector: 'kj-styled-titled-drawer-body',
  standalone: true,
  imports: [KjDrawer, KjDrawerComponent, KjDrawerTitleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-drawer-shell>
      <kj-drawer>
        <kj-drawer-title>Settings</kj-drawer-title>
        <div class="kj-drawer-body">Body</div>
        <button id="ok" (click)="ref.close('ok')">OK</button>
      </kj-drawer>
    </kj-drawer-shell>
  `,
})
class StyledTitledDrawerBody {
  readonly ref = inject<KjDrawerRef<StyledTitledDrawerBody, string>>(KjDrawerRef);
}

describe('KjDrawerTitleComponent with KjDrawerService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    cleanupOverlays();
  });

  it('renders an <h2 kjDrawerTitle> that names the drawer', async () => {
    const ref = TestBed.inject(KjDrawerService).open<StyledTitledDrawerBody, string>(StyledTitledDrawerBody);
    TestBed.inject(ApplicationRef).tick();
    await flush();
    const panel = findPanel()!;
    const heading = panel.querySelector('kj-drawer-title > h2.kj-drawer-title') as HTMLElement;
    expect(heading).not.toBeNull();
    expect(heading.id).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(panel).toHaveAccessibleName('Settings');
    ref.close();
    await flush();
  });
});

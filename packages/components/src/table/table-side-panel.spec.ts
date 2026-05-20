import { Component, signal } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { afterEach, describe, expect, it } from 'vitest';
import { KjTable, kjColumn } from '@kouji-ui/core';
import { KjTableSidePanelComponent } from './table-side-panel';

interface User { id: string; name: string; email: string; role: string; }

const COLS = [
  kjColumn<User>({ accessorKey: 'name',  header: 'Name', id: 'name' }),
  kjColumn<User>({ accessorKey: 'email', header: 'Email', id: 'email' }),
  kjColumn<User>({ accessorKey: 'role',  header: 'Role', id: 'role' }),
];

@Component({
  standalone: true,
  imports: [KjTable, KjTableSidePanelComponent],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()">
      <kj-table-side-panel [(kjOpen)]="open" [kjTitle]="title()" />
    </table>
  `,
})
class Host {
  readonly data = signal<User[]>([
    { id: '1', name: 'Ada',  email: 'a@x', role: 'admin' },
    { id: '2', name: 'Linus', email: 'l@x', role: 'user' },
  ]);
  readonly cols = COLS;
  readonly open = signal(false);
  readonly title = signal('Columns');
}

/** Drawer is portaled — query the body, not the host fixture. */
function getDrawer(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('kj-drawer');
}

function getDrawerOrThrow(): HTMLElement {
  const el = getDrawer();
  if (!el) throw new Error('drawer not rendered');
  return el;
}

function cleanupOverlays(): void {
  document.body.querySelectorAll('kj-drawer-shell, kj-overlay-wrapper, .kj-overlay-container')
    .forEach((el) => el.remove());
  document.body.querySelectorAll('kj-drawer').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = '';
}

describe('KjTableSidePanelComponent', () => {
  afterEach(() => {
    cleanupOverlays();
  });

  it('mounts no drawer DOM when kjOpen=false; mounts a portaled drawer when true', async () => {
    const { fixture } = await render(Host);
    expect(getDrawer()).toBeNull();

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawer = getDrawerOrThrow();
    expect(drawer.getAttribute('data-kj-side')).toBe('right');
  });

  it('lists every leaf column from the table', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawer = getDrawerOrThrow();
    expect(drawer.textContent).toContain('Name');
    expect(drawer.textContent).toContain('Email');
    expect(drawer.textContent).toContain('Role');

    const checkboxes = drawer.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);
  });

  it('toggling a column checkbox flips column visibility', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawer = getDrawerOrThrow();
    const emailCheckbox = drawer.querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement;
    expect(emailCheckbox.checked).toBe(true);

    fireEvent.click(emailCheckbox);
    fixture.detectChanges();
    await fixture.whenStable();

    const after = getDrawerOrThrow().querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement;
    expect(after.checked).toBe(false);
  });

  it('clicking "Pin left" pushes the column id into columnPinning.left', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawer = getDrawerOrThrow();
    const pinLeftBtn = drawer.querySelectorAll('button[data-action="pin-left"]')[0] as HTMLButtonElement;
    fireEvent.click(pinLeftBtn);
    fixture.detectChanges();
    await fixture.whenStable();

    const after = getDrawerOrThrow().querySelectorAll('button[data-action="pin-left"]')[0] as HTMLButtonElement;
    expect(after.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking "Group by" pushes the column id into grouping', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const findRoleGroupBtn = (): HTMLButtonElement => {
      const drawer = getDrawerOrThrow();
      const rows = Array.from(drawer.querySelectorAll('.kj-table-side-panel-row'));
      const roleRow = rows.find(r => r.textContent?.includes('Role'));
      if (!roleRow) throw new Error('Role row missing');
      return roleRow.querySelector('button[data-action="group"]') as HTMLButtonElement;
    };

    fireEvent.click(findRoleGroupBtn());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(findRoleGroupBtn().getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the kjTitle in the drawer header', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.title.set('Pick your columns');
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawer = getDrawerOrThrow();
    const title = drawer.querySelector('.kj-drawer-title') as HTMLElement;
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Pick your columns');
    // The host element of the content component (parent of `<kj-drawer>`)
    // carries the accessible name via `aria-label`.
    const content = document.body.querySelector('kj-table-side-panel-content') as HTMLElement;
    expect(content).toBeTruthy();
    expect(content.getAttribute('aria-label')).toBe('Pick your columns');
  });
});

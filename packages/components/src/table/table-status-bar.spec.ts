import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable, kjColumn } from '@kouji-ui/core';
import { KjTableStatusBarComponent } from './table-status-bar';

interface Row {
  id: string;
  name: string;
}

@Component({
  standalone: true,
  imports: [KjTable, KjTableStatusBarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <table [kjTable]="cols" [kjTableData]="data()">
      <kj-table-status-bar />
    </table>
  `,
})
class Host {
  readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  readonly data = signal<Row[]>([]);
}

describe('KjTableStatusBarComponent', () => {
  it('renders "0 rows" when data is empty', async () => {
    const { container } = await render(Host);
    expect(container.textContent).toContain('0 rows');
  });

  it('renders "2 rows" with two data rows and no selection', async () => {
    const { container, fixture } = await render(Host);
    (fixture.componentInstance as Host).data.set([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    fixture.detectChanges();
    expect(container.textContent).toContain('2 rows');
    expect(container.textContent).not.toContain('selected');
    expect(container.textContent).not.toContain('Filtered');
  });

  it('renders "2 rows • 1 selected" when one row is selected', async () => {
    const { container, fixture } = await render(Host);
    (fixture.componentInstance as Host).data.set([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    fixture.detectChanges();
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ rowSelection: { '0': true } });
    fixture.detectChanges();
    expect(container.textContent).toContain('2 rows');
    expect(container.textContent).toContain('1 selected');
  });

  it('renders "Filtered" when globalFilter is non-empty', async () => {
    const { container, fixture } = await render(Host);
    (fixture.componentInstance as Host).data.set([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]);
    fixture.detectChanges();
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ globalFilter: 'Alp' });
    fixture.detectChanges();
    expect(container.textContent).toContain('Filtered');
  });

  it('exposes role="status" and aria-live="polite"', async () => {
    const { container } = await render(Host);
    const status = container.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });
});

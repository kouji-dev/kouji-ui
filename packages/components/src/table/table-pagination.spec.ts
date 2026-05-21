import { Component, signal, viewChild } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable, kjColumn } from '@kouji-ui/core';
import { KjTablePaginationComponent } from './table-pagination';

interface Row { id: string; name: string; }

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Row ${i + 1}` }));
}

// KJ_TABLE is provided on the element hosting the `kjTable` directive. The
// pagination component must therefore be projected *inside* that element so
// it can inject the token via element-injector inheritance. We park it in a
// dedicated `<td>` so the markup remains valid `<table>` content.
@Component({
  standalone: true,
  imports: [KjTable, KjTablePaginationComponent],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        <tr>
          <td>
            <kj-table-pagination
              [kjPageSizes]="pageSizes()"
              [kjShowSummary]="showSummary()"
            />
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly data = signal<Row[]>(makeRows(25));
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly pageSizes = signal<readonly number[]>([10, 25, 50]);
  protected readonly showSummary = signal(true);
  readonly tableRef = viewChild.required(KjTable);

  setShowSummary(v: boolean): void { this.showSummary.set(v); }
}

describe('KjTablePaginationComponent', () => {
  it('renders summary "Showing 1–10 of 25" when pageIndex=0, pageSize=10, total=25', async () => {
    const { fixture, getByText } = await render(Host);
    fixture.componentInstance.tableRef().setState({ pagination: { pageIndex: 0, pageSize: 10 } });
    fixture.detectChanges();
    expect(getByText(/Showing 1.10 of 25/)).toBeInTheDocument();
  });

  it('changing the page-size <kj-select> calls setPageSize on the table', async () => {
    const { fixture, container } = await render(Host);
    fixture.componentInstance.tableRef().setState({ pagination: { pageIndex: 0, pageSize: 10 } });
    fixture.detectChanges();

    // Open the kj-select trigger.
    const trigger = container.querySelector('kj-select button') as HTMLButtonElement;
    fireEvent.click(trigger);
    fixture.detectChanges();

    // Options are portalled to document.body via kj-select-content. Pick the
    // one whose visible text is "25" and click it.
    const options = Array.from(document.querySelectorAll('[role="option"]')) as HTMLElement[];
    const opt25 = options.find((o) => o.textContent?.trim() === '25');
    expect(opt25).toBeDefined();
    fireEvent.click(opt25!);
    fixture.detectChanges();

    expect(fixture.componentInstance.tableRef().state.pagination().pageSize).toBe(25);
  });

  it('clicking Next moves pageIndex forward', async () => {
    const { fixture, getByLabelText } = await render(Host);
    fixture.componentInstance.tableRef().setState({ pagination: { pageIndex: 0, pageSize: 10 } });
    fixture.detectChanges();

    fireEvent.click(getByLabelText('Next page'));
    fixture.detectChanges();

    expect(fixture.componentInstance.tableRef().state.pagination().pageIndex).toBe(1);
  });

  it('Previous button is disabled on page 0', async () => {
    const { fixture, getByLabelText } = await render(Host);
    fixture.componentInstance.tableRef().setState({ pagination: { pageIndex: 0, pageSize: 10 } });
    fixture.detectChanges();

    const prev = getByLabelText('Previous page') as HTMLButtonElement;
    expect(prev.getAttribute('aria-disabled')).toBe('true');
  });

  it('Last jumps to final page, First returns to page 0', async () => {
    const { fixture, getByLabelText } = await render(Host);
    fixture.componentInstance.tableRef().setState({ pagination: { pageIndex: 0, pageSize: 10 } });
    fixture.detectChanges();

    fireEvent.click(getByLabelText('Last page'));
    fixture.detectChanges();
    expect(fixture.componentInstance.tableRef().state.pagination().pageIndex).toBe(2);

    fireEvent.click(getByLabelText('First page'));
    fixture.detectChanges();
    expect(fixture.componentInstance.tableRef().state.pagination().pageIndex).toBe(0);
  });

  it('summary is hidden when [kjShowSummary]="false"', async () => {
    const { fixture, queryByText } = await render(Host);
    fixture.componentInstance.tableRef().setState({ pagination: { pageIndex: 0, pageSize: 10 } });
    fixture.componentInstance.setShowSummary(false);
    fixture.detectChanges();
    expect(queryByText(/Showing /)).toBeNull();
  });
});

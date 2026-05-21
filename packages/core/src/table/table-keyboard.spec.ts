import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { KjTableCell } from './table-cell';
import { KjTableKeyboardNav } from './table-keyboard';
import { kjColumn } from './column-helpers';

interface Row { a: string; b: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow, KjTableCell, KjTableKeyboardNav],
  template: `
    <table kjTableKeyboardNav [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r">
            @for (c of r.getVisibleCells(); track c.id) {
              <td kjTableCell [kjCell]="c" tabindex="-1">{{ c.getValue() }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'a' }), kjColumn<Row>({ accessorKey: 'b' }),
  ];
  protected readonly data = signal<Row[]>([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
}

describe('KjTableKeyboardNav', () => {
  it('ArrowRight moves focus to the next cell', async () => {
    const { container } = await render(Host);
    const cells = container.querySelectorAll<HTMLElement>('tbody td');
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(cells[1]);
  });

  it('ArrowDown moves focus down a row, same column', async () => {
    const { container } = await render(Host);
    const cells = container.querySelectorAll<HTMLElement>('tbody td');
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(cells[2]);
  });

  it('Home moves focus to first cell of the row', async () => {
    const { container } = await render(Host);
    const cells = container.querySelectorAll<HTMLElement>('tbody td');
    cells[1].focus();
    cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(cells[0]);
  });
});

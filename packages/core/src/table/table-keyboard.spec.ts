import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { KjTableCell } from './table-cell';
import { KjTableKeyboardNav } from './table-keyboard';
import { kjColumn } from './column-helpers';

interface Row {
  id: string;
  a: string;
  b: string;
}

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow, KjTableCell, KjTableKeyboardNav],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <table kjTableKeyboardNav [kjTable]="cols" [kjTableData]="data()" [kjGetRowId]="rowId" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r">
            @for (c of r.getVisibleCells(); track c.id) {
              <td kjTableCell [kjCell]="c">
                @if (c.column.id === 'b') {
                  <input type="text" [value]="c.getValue()" />
                } @else {
                  {{ c.getValue() }}
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'a' }),
    kjColumn<Row>({ accessorKey: 'b' }),
  ];
  readonly data = signal<Row[]>([
    { id: 'r1', a: '1', b: '2' },
    { id: 'r2', a: '3', b: '4' },
    { id: 'r3', a: '5', b: '6' },
  ]);
  protected readonly rowId = (r: Row): string => r.id;
}

/** Type a key on whatever currently has focus, the way a user would. */
function press(key: string, init: KeyboardEventInit = {}): void {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

function cellsOf(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('tbody td'));
}

function tabStops(container: Element): HTMLElement[] {
  return cellsOf(container).filter((c) => c.getAttribute('tabindex') === '0');
}

describe('KjTableKeyboardNav', () => {
  describe('roving tabindex', () => {
    it('gives the body exactly one Tab stop — the first cell — and -1 to every other cell', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      expect(cells.length).toBe(6);
      expect(tabStops(container)).toEqual([cells[0]]);
      expect(cells.slice(1).every((c) => c.getAttribute('tabindex') === '-1')).toBe(true);
    });

    it('moves the Tab stop to the cell the user navigates to', async () => {
      const { container, fixture } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('ArrowRight');
      expect(document.activeElement).toBe(cells[1]);
      fixture.detectChanges();
      expect(tabStops(container)).toEqual([cells[1]]);
      expect(cells[0].getAttribute('tabindex')).toBe('-1');
    });

    it('keeps the last focused cell as the Tab stop after focus leaves the grid', async () => {
      const { container, fixture } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('ArrowDown');
      expect(document.activeElement).toBe(cells[2]);
      (document.activeElement as HTMLElement).blur();
      expect(document.activeElement).toBe(document.body);
      fixture.detectChanges();
      expect(tabStops(container)).toEqual([cells[2]]);
    });

    it('falls back to the first rendered cell when the active cell leaves the DOM', async () => {
      const { container, fixture } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('ArrowDown');
      fixture.detectChanges();
      expect(tabStops(container)).toEqual([cells[2]]);
      fixture.componentInstance.data.set([
        { id: 'r1', a: '1', b: '2' },
        { id: 'r3', a: '5', b: '6' },
      ]);
      fixture.detectChanges();
      const after = cellsOf(container);
      expect(after.length).toBe(4);
      expect(tabStops(container)).toEqual([after[0]]);
    });
  });

  describe('navigation keys, typed from the focused cell', () => {
    it('ArrowRight moves focus to the next cell', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('ArrowRight');
      expect(document.activeElement).toBe(cells[1]);
    });

    it('ArrowDown moves focus down a row, same column', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('ArrowDown');
      expect(document.activeElement).toBe(cells[2]);
    });

    it('Home moves focus to the first cell of the row', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('ArrowRight');
      press('Home');
      expect(document.activeElement).toBe(cells[0]);
    });

    it('End moves focus to the last cell of the row; Ctrl+End to the last cell of the grid', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('End');
      expect(document.activeElement).toBe(cells[1]);
      press('End', { ctrlKey: true });
      expect(document.activeElement).toBe(cells[5]);
      press('Home', { ctrlKey: true });
      expect(document.activeElement).toBe(cells[0]);
    });

    it('PageDown clamps to the last row and PageUp to the first', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      cells[0].focus();
      press('PageDown');
      expect(document.activeElement).toBe(cells[4]);
      press('PageUp');
      expect(document.activeElement).toBe(cells[0]);
    });

    it('does not move past the last cell', async () => {
      const { container } = await render(Host);
      const cells = cellsOf(container);
      cells[5].focus();
      press('ArrowRight');
      press('ArrowDown');
      expect(document.activeElement).toBe(cells[5]);
    });

    it('leaves arrow keys to a text control inside the cell', async () => {
      const { container } = await render(Host);
      const input = container.querySelector<HTMLInputElement>('tbody input')!;
      input.focus();
      press('ArrowLeft');
      expect(document.activeElement).toBe(input);
    });
  });
});

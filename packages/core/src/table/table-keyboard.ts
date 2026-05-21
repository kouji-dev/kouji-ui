import { Directive, contentChildren } from '@angular/core';
import { KjTableCell } from './table-cell';

/**
 * WAI-ARIA Grid keyboard pattern. Attach to the same element as `[kjTable]`.
 * Handles Arrow / Home / End / Ctrl+Home/End / PageUp/Down. Tab leaves the
 * grid; cell-level F2 / Enter / Esc / Space are handled by row/cell
 * directives or the styled wrapper's editor.
 *
 * Cells are resolved through Angular's `contentChildren()` query against
 * `KjTableCell`, so the directive only ever sees **rendered** (visible) cells.
 * That keeps navigation correct under virtualization (off-window rows aren't
 * in the query result) and column visibility (hidden columns aren't queryable
 * either). No raw DOM selectors.
 */
@Directive({
  selector: '[kjTableKeyboardNav]',
  standalone: true,
  host: { '(keydown)': 'onKeyDown($event)' },
})
export class KjTableKeyboardNav {
  /** Live list of every `KjTableCell` rendered inside the grid. */
  private readonly cells = contentChildren(KjTableCell, { descendants: true });

  onKeyDown(event: KeyboardEvent): void {
    const startEl = (event.target as HTMLElement).closest<HTMLElement>('[kjTableCell]');
    if (!startEl) return;

    const matrix = this.buildMatrix();
    if (!matrix.length) return;

    const pos = this.findCell(matrix, startEl);
    if (!pos) return;
    const { rowIdx, colIdx } = pos;

    let target: HTMLElement | null;

    switch (event.key) {
      case 'ArrowLeft':  target = matrix[rowIdx]?.[colIdx - 1] ?? null; break;
      case 'ArrowRight': target = matrix[rowIdx]?.[colIdx + 1] ?? null; break;
      case 'ArrowUp':    target = matrix[rowIdx - 1]?.[colIdx] ?? null; break;
      case 'ArrowDown':  target = matrix[rowIdx + 1]?.[colIdx] ?? null; break;
      case 'Home':
        target = event.ctrlKey
          ? (matrix[0]?.[0] ?? null)
          : (matrix[rowIdx]?.[0] ?? null);
        break;
      case 'End': {
        const lastRow = matrix[matrix.length - 1];
        if (event.ctrlKey) {
          target = lastRow?.[lastRow.length - 1] ?? null;
        } else {
          const row = matrix[rowIdx];
          target = row?.[row.length - 1] ?? null;
        }
        break;
      }
      case 'PageDown':
        target = matrix[Math.min(rowIdx + 10, matrix.length - 1)]?.[colIdx] ?? null;
        break;
      case 'PageUp':
        target = matrix[Math.max(rowIdx - 10, 0)]?.[colIdx] ?? null;
        break;
      default: return;
    }

    if (target) {
      event.preventDefault();
      target.focus();
    }
  }

  /**
   * Group every rendered cell host by its `<tr>` ancestor, then sort the
   * rows in DOM order. This produces a `rows[r][c]` matrix that interleaves
   * pinned and virtualized tbodies in the order the user actually sees.
   */
  private buildMatrix(): HTMLElement[][] {
    const byRow = new Map<HTMLTableRowElement, HTMLElement[]>();
    const order: HTMLTableRowElement[] = [];
    for (const cell of this.cells()) {
      const host = cell.hostElement;
      const tr = host.closest<HTMLTableRowElement>('tr');
      if (!tr) continue;
      if (!byRow.has(tr)) {
        byRow.set(tr, []);
        order.push(tr);
      }
      byRow.get(tr)!.push(host);
    }
    order.sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    return order.map((tr) => byRow.get(tr)!);
  }

  private findCell(
    matrix: HTMLElement[][],
    el: HTMLElement,
  ): { rowIdx: number; colIdx: number } | null {
    for (let r = 0; r < matrix.length; r++) {
      const c = matrix[r].indexOf(el);
      if (c !== -1) return { rowIdx: r, colIdx: c };
    }
    return null;
  }
}

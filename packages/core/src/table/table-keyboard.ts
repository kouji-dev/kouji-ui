import { Directive, ElementRef, inject } from '@angular/core';

const FOCUSABLE_CELL = '[kjTableCell]';

/**
 * WAI-ARIA Grid keyboard pattern. Attach to the same element as `[kjTable]`.
 * Handles Arrow / Home / End / Ctrl+Home/End / PageUp/Down / Cmd+A. Tab leaves
 * the grid; cell-level F2 / Enter / Esc / Space are handled by row/cell
 * directives or the styled wrapper's editor.
 */
@Directive({
  selector: '[kjTableKeyboardNav]',
  standalone: true,
  host: { '(keydown)': 'onKeyDown($event)' },
})
export class KjTableKeyboardNav {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  onKeyDown(event: KeyboardEvent): void {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(FOCUSABLE_CELL);
    if (!cell) return;
    const row = cell.closest('tr');
    if (!row) return;
    const rows = Array.from(this.host.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    const cells = Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE_CELL));
    const rowIdx = rows.indexOf(row as HTMLTableRowElement);
    const colIdx = cells.indexOf(cell);

    let target: HTMLElement | null = null;

    switch (event.key) {
      case 'ArrowLeft':  target = cells[colIdx - 1] ?? null; break;
      case 'ArrowRight': target = cells[colIdx + 1] ?? null; break;
      case 'ArrowUp':    target = this.cellAt(rows[rowIdx - 1], colIdx); break;
      case 'ArrowDown':  target = this.cellAt(rows[rowIdx + 1], colIdx); break;
      case 'Home':
        target = event.ctrlKey ? this.cellAt(rows[0], 0) : cells[0];
        break;
      case 'End':
        target = event.ctrlKey
          ? this.cellAt(rows[rows.length - 1], -1)
          : cells[cells.length - 1];
        break;
      case 'PageDown':
        target = this.cellAt(rows[Math.min(rowIdx + 10, rows.length - 1)], colIdx);
        break;
      case 'PageUp':
        target = this.cellAt(rows[Math.max(rowIdx - 10, 0)], colIdx);
        break;
      default: return;
    }

    if (target) {
      event.preventDefault();
      target.focus();
    }
  }

  private cellAt(row: HTMLTableRowElement | undefined, colIdx: number): HTMLElement | null {
    if (!row) return null;
    const cells = Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE_CELL));
    if (colIdx === -1) return cells[cells.length - 1] ?? null;
    return cells[colIdx] ?? null;
  }
}

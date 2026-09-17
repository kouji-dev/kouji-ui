import { Directive, computed, contentChildren, signal } from '@angular/core';
import { KjTableCell } from './table-cell';
import { KJ_TABLE_KEYBOARD_NAV, type KjTableKeyboardNavContext } from './table-keyboard.context';

/** `Node.DOCUMENT_POSITION_PRECEDING` — inlined so the DOM-order sort also runs on the server. */
const DOCUMENT_POSITION_PRECEDING = 2;

/** Text-entry controls whose own arrow / Home / End handling must win over grid navigation. */
const TEXT_ENTRY_SELECTOR =
  'input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable]:not([contenteditable="false"])';

/**
 * WAI-ARIA Grid keyboard pattern. Attach to the same element as `[kjTable]`.
 * Handles Arrow / Home / End / Ctrl+Home/End / PageUp/Down. Tab leaves the
 * grid; cell-level F2 / Enter / Esc / Space are handled by row/cell
 * directives or the styled wrapper's editor.
 *
 * Owns the grid's roving tabindex: it provides `KJ_TABLE_KEYBOARD_NAV`, and
 * every `KjTableCell` reads `tabStopId()` from it, so exactly one rendered
 * cell is a Tab stop — the cell focused last, or the first rendered cell
 * before any interaction (and again whenever the last focused cell leaves the
 * DOM through sorting, paging or virtualization).
 *
 * Cells are resolved through Angular's `contentChildren()` query against
 * `KjTableCell`, so the directive only ever sees **rendered** (visible) cells.
 * That keeps navigation correct under virtualization (off-window rows aren't
 * in the query result) and column visibility (hidden columns aren't queryable
 * either). No raw DOM selectors.
 *
 * Keys typed into a text-entry control inside a cell (an inline editor, a
 * filter input) are left to that control.
 *
 * @example
 * ```html
 * <table kjTableKeyboardNav [kjTable]="cols" [kjTableData]="rows" role="grid">
 *   <tr kjTableRow [kjRow]="r"><td kjTableCell [kjCell]="c">…</td></tr>
 * </table>
 * ```
 */
@Directive({
  selector: '[kjTableKeyboardNav]',
  standalone: true,
  providers: [{ provide: KJ_TABLE_KEYBOARD_NAV, useExisting: KjTableKeyboardNav }],
  host: { '(keydown)': 'onKeyDown($event)' },
})
export class KjTableKeyboardNav implements KjTableKeyboardNavContext {
  /** Live list of every `KjTableCell` rendered inside the grid. */
  private readonly cells = contentChildren(KjTableCell, { descendants: true });

  /** Id of the cell the user focused last; survives the cell leaving the DOM. */
  private readonly activeId = signal<string | null>(null);

  /**
   * Id of the cell that owns `tabindex="0"`: the last focused cell while it
   * is rendered, else the first rendered cell in DOM order.
   */
  readonly tabStopId = computed<string | null>(() => {
    const cells = this.cells();
    if (cells.length === 0) return null;
    const active = this.activeId();
    if (active !== null && cells.some((c) => c.cellId() === active)) return active;
    return firstInDomOrder(cells).cellId();
  });

  /** Record `cellId` as the last focused cell. @param cellId TanStack `cell.id`. */
  setActive(cellId: string): void {
    this.activeId.set(cellId);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    const startEl = target.closest<HTMLElement>('[kjTableCell]');
    if (!startEl) return;
    if (target !== startEl && target.matches(TEXT_ENTRY_SELECTOR)) return;

    const matrix = this.buildMatrix();
    if (!matrix.length) return;

    const pos = this.findCell(matrix, startEl);
    if (!pos) return;
    const { rowIdx, colIdx } = pos;

    let next: HTMLElement | null;

    switch (event.key) {
      case 'ArrowLeft':  next = matrix[rowIdx]?.[colIdx - 1] ?? null; break;
      case 'ArrowRight': next = matrix[rowIdx]?.[colIdx + 1] ?? null; break;
      case 'ArrowUp':    next = matrix[rowIdx - 1]?.[colIdx] ?? null; break;
      case 'ArrowDown':  next = matrix[rowIdx + 1]?.[colIdx] ?? null; break;
      case 'Home':
        next = event.ctrlKey
          ? (matrix[0]?.[0] ?? null)
          : (matrix[rowIdx]?.[0] ?? null);
        break;
      case 'End': {
        const lastRow = matrix[matrix.length - 1];
        if (event.ctrlKey) {
          next = lastRow?.[lastRow.length - 1] ?? null;
        } else {
          const row = matrix[rowIdx];
          next = row?.[row.length - 1] ?? null;
        }
        break;
      }
      case 'PageDown':
        next = matrix[Math.min(rowIdx + 10, matrix.length - 1)]?.[colIdx] ?? null;
        break;
      case 'PageUp':
        next = matrix[Math.max(rowIdx - 10, 0)]?.[colIdx] ?? null;
        break;
      default: return;
    }

    if (next) {
      event.preventDefault();
      next.focus();
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

/**
 * The first cell in DOM order. Query results follow declaration order, which
 * a row template stamped into several bodies (pinned top, centre, pinned
 * bottom) or moved by `@for` does not keep aligned with the DOM.
 */
function firstInDomOrder(cells: readonly KjTableCell[]): KjTableCell {
  let first = cells[0]!;
  for (let i = 1; i < cells.length; i++) {
    const candidate = cells[i]!;
    if (first.hostElement.compareDocumentPosition(candidate.hostElement) & DOCUMENT_POSITION_PRECEDING) {
      first = candidate;
    }
  }
  return first;
}

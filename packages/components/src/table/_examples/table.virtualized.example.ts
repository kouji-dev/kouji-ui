import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjButtonComponent } from '../../button/button';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly city: string;
}

const CITIES = ['Paris', 'Tokyo', 'Lagos', 'Lima', 'Oslo', 'Cairo'];

function makeRows(n: number): Row[] {
  const out = new Array<Row>(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      id: String(i),
      name: `User ${i}`,
      score: (i * 37) % 1000,
      city: CITIES[i % CITIES.length]!,
    };
  }
  return out;
}

/**
 * 10,000 rows force-virtualized via `[kjVirtual]="true"` with a 32px row
 * estimate. Only the visible window is rendered; scroll position drives the
 * virtualizer. The "scroll to row 5000" button demonstrates programmatic jump
 * by computing offset = rowIndex × estimatedSize.
 */
@Component({
  selector: 'kj-table-virtualized-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjButtonComponent],
  styles: [`
    :host {
      /* Container-driven sizing: we own the box that the kj-table fills.
         Width is explicit so the table doesn't collapse to its 0-width
         content (the virtualizer hides rows until it has a viewport rect,
         and an unwidthed flex column has 0-width children — chicken/egg). */
      display: block;
      width: 100%;
      font-family: var(--kj-font-sans);
      color: var(--kj-fg-default);
    }
    .toolbar {
      display: flex;
      gap: var(--kj-space-md);
      align-items: center;
      margin-bottom: var(--kj-space-md);
      font-size: var(--kj-text-sm);
      color: var(--kj-fg-muted);
    }
    /* Sized box the table fills. The body scrolls inside this 400px height
       and the virtualizer's ResizeObserver gets a non-zero viewport from
       the start. */
    .kj-virt-frame {
      display: flex;
      flex-direction: column;
      height: 400px;
      min-width: 0;
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      background: var(--kj-bg-surface);
      overflow: hidden;
    }
    .kj-virt-frame kj-table {
      flex: 1 1 auto;
      min-height: 0;
    }
  `],
  template: `
    <div class="toolbar">
      <kj-button kjVariant="outline" kjSize="sm" (click)="scrollToRow(5000)">
        Scroll to row 5000
      </kj-button>
      <span>Total: {{ data().length }} rows</span>
    </div>
    <div class="kj-virt-frame">
      <kj-table
        [kjData]="data()"
        [kjColumns]="cols"
        [kjVirtual]="true"
        [kjEstimatedRowSize]="rowSize"
      />
    </div>
  `,
})
export class KjTableVirtualizedExample {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly rowSize = 32;
  protected readonly data = signal<Row[]>(makeRows(10_000));

  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'id',    header: 'ID'    }),
    kjColumn<Row>({ accessorKey: 'name',  header: 'Name'  }),
    kjColumn<Row>({ accessorKey: 'score', header: 'Score' }),
    kjColumn<Row>({ accessorKey: 'city',  header: 'City'  }),
  ];

  protected scrollToRow(index: number): void {
    // The scroll viewport is the table's own body — that's what the
    // virtualizer attaches to (it walks up from `<tbody>` to find the
    // wrapper's `.kj-table-body`).
    const scroller = this.host.nativeElement.querySelector<HTMLElement>(
      'kj-table .kj-table-body',
    );
    if (!scroller) return;
    scroller.scrollTop = index * this.rowSize;
  }
}

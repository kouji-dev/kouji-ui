import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjSheet, KjSheetService, KjSheetRef } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

@Component({
  selector: 'kj-sheet-scrollable-body',
  standalone: true,
  imports: [KjSheet, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-sheet>
    <h2 class="kj-sheet__title">Terms</h2>
    @for (n of lines; track n) {
      <p>Paragraph {{ n }} — the body scrolls inside the sheet while the grab handle stays pinned.</p>
    }
    <div class="kj-sheet__footer" data-align="end">
      <kj-button kjSize="lg" (click)="ref.close()">Accept</kj-button>
    </div>
  </kj-sheet>`,
})
class ScrollBody {
  readonly ref = inject(KjSheetRef);
  readonly lines = Array.from({ length: 20 }, (_, i) => i + 1);
}

@Component({
  selector: 'kj-sheet-scrollable-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open scrollable sheet</kj-button>`,
})
export class KjSheetScrollableExample {
  private readonly sheet = inject(KjSheetService);
  open(): void {
    this.sheet.open(ScrollBody, { detent: 'half' });
  }
}

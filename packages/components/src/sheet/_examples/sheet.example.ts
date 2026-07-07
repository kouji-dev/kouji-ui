import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjSheet, KjSheetService, KjSheetRef } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

@Component({
  selector: 'kj-sheet-default-body',
  standalone: true,
  imports: [KjSheet, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-sheet>
    <h2 class="kj-sheet__title">Share sheet</h2>
    <p class="kj-sheet__description">Drag the handle down or press Escape to dismiss.</p>
    <div class="kj-sheet__footer" data-align="end">
      <kj-button kjSize="lg" (click)="ref.close()">Done</kj-button>
    </div>
  </kj-sheet>`,
})
class SheetBody {
  readonly ref = inject(KjSheetRef);
}

@Component({
  selector: 'kj-sheet-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open bottom sheet</kj-button>`,
})
export class KjSheetExample {
  private readonly sheet = inject(KjSheetService);
  open(): void {
    this.sheet.open(SheetBody);
  }
}

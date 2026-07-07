import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  KjSheet,
  KjSheetService,
  KjSheetRef,
  type KjSheetDetent,
} from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

@Component({
  selector: 'kj-sheet-detents-body',
  standalone: true,
  imports: [KjSheet, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-sheet>
    <h2 class="kj-sheet__title">Detent</h2>
    <p class="kj-sheet__description">This sheet opened at its configured resting height.</p>
    <div class="kj-sheet__footer" data-align="end">
      <kj-button kjSize="lg" (click)="ref.close()">Close</kj-button>
    </div>
  </kj-sheet>`,
})
class DetentBody {
  readonly ref = inject(KjSheetRef);
}

@Component({
  selector: 'kj-sheet-detents-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button (click)="open('auto')">Auto</kj-button>
    <kj-button (click)="open('half')">Half</kj-button>
    <kj-button (click)="open('full')">Full</kj-button>
  `,
})
export class KjSheetDetentsExample {
  private readonly sheet = inject(KjSheetService);
  open(detent: KjSheetDetent): void {
    this.sheet.open(DetentBody, { detent });
  }
}

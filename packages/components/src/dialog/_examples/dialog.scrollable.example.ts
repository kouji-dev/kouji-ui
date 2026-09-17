import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog, KjDialogService, KjDialogTitle } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin scrollable demo.
@Component({
  selector: 'kj-dialog-scrollable-body',
  standalone: true,
  imports: [KjDialog, KjDialogTitle],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-dialog
    ><h2 kjDialogTitle>Long content</h2>
    <div style="max-height:60vh; overflow:auto"><p>Lorem ipsum…</p></div></kj-dialog
  >`,
})
class ScrollableBody {}

@Component({
  selector: 'kj-dialog-scrollable-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open scrollable</kj-button>`,
})
export class KjDialogScrollableExample {
  private readonly dialog = inject(KjDialogService);
  open(): void {
    this.dialog.open(ScrollableBody);
  }
}

import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  KjDialog,
  KjDialogService,
  KjDialogRef,
  KjPopoverTrigger,
  KjPopoverContent,
  KjPopoverTitle,
  KjPopoverClose,
  KjTooltipTrigger,
  KjTooltipContent,
} from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

@Component({
  selector: 'kj-dialog-nested-outer-body',
  standalone: true,
  imports: [
    KjDialog,
    KjButtonComponent,
    KjPopoverTrigger,
    KjPopoverContent,
    KjPopoverTitle,
    KjPopoverClose,
    KjTooltipTrigger,
    KjTooltipContent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dialog>
      <h2>Outer dialog</h2>
      <p>Open overlays from inside a modal — popover, tooltip, or another dialog.</p>

      <kj-button kjTooltipTrigger #tt="kjTooltipTrigger">Hover for tooltip</kj-button>
      <kj-tooltip-content [kjFor]="tt">Tooltip from inside a dialog</kj-tooltip-content>

      <kj-button kjPopoverTrigger #pp="kjPopoverTrigger">Open popover</kj-button>
      <kj-popover-content [kjFor]="pp">
        <h3 kjPopoverTitle>Nested popover</h3>
        <p>Anchored to a button inside the dialog.</p>
        <kj-button kjPopoverClose>Close</kj-button>
      </kj-popover-content>

      <kj-button (click)="openInner()">Open another dialog</kj-button>
      <kj-button (click)="ref.close()">Done</kj-button>
    </kj-dialog>
  `,
})
class OuterBody {
  protected readonly ref = inject(KjDialogRef);
  private readonly dialog = inject(KjDialogService);
  protected openInner(): void {
    this.dialog.open(InnerBody);
  }
}

@Component({
  selector: 'kj-dialog-nested-inner-body',
  standalone: true,
  imports: [KjDialog, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dialog>
      <h2>Inner dialog</h2>
      <p>Stacked above the outer dialog.</p>
      <kj-button (click)="ref.close()">Close</kj-button>
    </kj-dialog>
  `,
})
class InnerBody {
  protected readonly ref = inject(KjDialogRef);
}

@Component({
  selector: 'kj-dialog-nested-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open dialog</kj-button>`,
})
export class KjDialogNestedExample {
  private readonly dialog = inject(KjDialogService);
  open(): void {
    this.dialog.open(OuterBody);
  }
}

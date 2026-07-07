import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjActionSheetService } from '../action-sheet.service';
import { KjButtonComponent } from '../../button/button';

@Component({
  selector: 'kj-action-sheet-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button (click)="open()">Open action sheet</kj-button>
    @if (chosen()) {
      <p>Chose: {{ chosen() }}</p>
    }
  `,
})
export class KjActionSheetExample {
  private readonly actionSheet = inject(KjActionSheetService);
  readonly chosen = signal<string | null>(null);

  open(): void {
    const ref = this.actionSheet.open<string>({
      title: 'Photo',
      description: 'Choose what to do with this photo.',
      actions: [
        { label: 'Edit', value: 'edit' },
        { label: 'Duplicate', value: 'duplicate' },
        { label: 'Delete', value: 'delete', role: 'destructive' },
      ],
    });
    ref.result.then((v) => this.chosen.set(v ?? 'cancelled'));
  }
}

import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjActionSheetService } from '../action-sheet.service';
import { KjButtonComponent } from '../../button/button';

@Component({
  selector: 'kj-action-sheet-icons-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button (click)="open()">Share…</kj-button>
    @if (chosen()) {
      <p>Chose: {{ chosen() }}</p>
    }
  `,
})
export class KjActionSheetIconsExample {
  private readonly actionSheet = inject(KjActionSheetService);
  readonly chosen = signal<string | null>(null);

  open(): void {
    const ref = this.actionSheet.open<string>({
      title: 'Share',
      actions: [
        { label: 'Copy link', value: 'link', icon: 'link' },
        { label: 'Message', value: 'message', icon: 'message-circle' },
        { label: 'Mail', value: 'mail', icon: 'mail' },
        { label: 'Remove', value: 'remove', icon: 'trash-2', role: 'destructive' },
      ],
    });
    ref.result.then((v) => this.chosen.set(v ?? 'cancelled'));
  }
}

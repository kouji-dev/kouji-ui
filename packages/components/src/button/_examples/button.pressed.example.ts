import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjButtonComponent } from '../button';

@Component({
  selector: 'kj-button-pressed-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjVariant="outline" [(kjPressed)]="on">
      {{ on() ? 'Bold ON' : 'Bold OFF' }}
    </kj-button>
  `,
})
export class KjButtonPressedExample {
  readonly on = signal(false);
}

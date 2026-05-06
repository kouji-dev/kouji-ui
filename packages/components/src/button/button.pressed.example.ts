import { Component, signal } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-pressed-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button variant="outline" [pressed]="on()" (click)="on.set(!on())">
      {{ on() ? 'Bold ON' : 'Bold OFF' }}
    </kj-button>
  `,
})
export class KjButtonPressedExample {
  readonly on = signal(false);
}

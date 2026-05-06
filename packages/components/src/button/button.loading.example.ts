import { Component, signal } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-loading-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [loading]="busy()" (click)="run()">
      {{ busy() ? 'Saving…' : 'Save' }}
    </kj-button>
  `,
})
export class KjButtonLoadingExample {
  readonly busy = signal(false);

  async run() {
    if (this.busy()) return;
    this.busy.set(true);
    await new Promise(r => setTimeout(r, 1500));
    this.busy.set(false);
  }
}

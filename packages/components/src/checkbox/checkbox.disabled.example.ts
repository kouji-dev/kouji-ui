import { Component, signal } from '@angular/core';
import { KjCheckboxComponent } from './checkbox';

@Component({
  selector: 'kj-checkbox-disabled-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); display: flex; gap: 1rem; }`],
  template: `
    <kj-checkbox [(checked)]="off" [disabled]="true">Disabled off</kj-checkbox>
    <kj-checkbox [(checked)]="on" [disabled]="true">Disabled on</kj-checkbox>
  `,
})
export class KjCheckboxDisabledExample {
  readonly off = signal(false);
  readonly on = signal(true);
}

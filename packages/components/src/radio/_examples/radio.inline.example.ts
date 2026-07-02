import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from '../radio';

@Component({
  selector: 'kj-radio-inline-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-radio-group [(value)]="vote" orientation="horizontal" ariaLabel="Vote">
      <kj-radio [value]="'yes'">Yes</kj-radio>
      <kj-radio [value]="'no'">No</kj-radio>
      <kj-radio [value]="'abstain'">Abstain</kj-radio>
    </kj-radio-group>
  `,
})
export class KjRadioInlineExample {
  readonly vote = signal<'yes' | 'no' | 'abstain'>('yes');
}

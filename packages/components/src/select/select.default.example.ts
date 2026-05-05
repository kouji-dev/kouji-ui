import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-default-example',
  standalone: true,
  imports: [KjSelectComponent, KjSelectTriggerComponent, KjSelectContentComponent, KjOptionComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-select [(value)]="fruit">
      <kj-select-trigger>{{ fruit() ?? 'Choose a fruit' }}</kj-select-trigger>
      <kj-select-content>
        <kj-option [value]="'apple'">Apple</kj-option>
        <kj-option [value]="'banana'">Banana</kj-option>
        <kj-option [value]="'cherry'">Cherry</kj-option>
      </kj-select-content>
    </kj-select>
  `,
})
export class KjSelectDefaultExample { readonly fruit = signal<string | undefined>(undefined); }

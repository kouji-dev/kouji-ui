import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent } from '../input/input';
import { KjInputGroupComponent, KjInputGroupAddonComponent } from './input-group';

/**
 * URL slug composition: "https://" prefix + input + ".com" suffix.
 */
@Component({
  selector: 'kj-input-group-url-example',
  standalone: true,
  imports: [KjInputGroupComponent, KjInputGroupAddonComponent, KjInputComponent, FormsModule],
  styles: [`:host { display: block; }`],
  template: `
    <kj-input-group>
      <kj-input-group-addon [kjAriaHidden]="true">https://</kj-input-group-addon>
      <kj-input type="text" placeholder="your-site" [(ngModel)]="slug" aria-label="Website domain name" />
      <kj-input-group-addon [kjAriaHidden]="true">.com</kj-input-group-addon>
    </kj-input-group>
  `,
})
export class KjInputGroupUrlExample {
  readonly slug = signal('');
}

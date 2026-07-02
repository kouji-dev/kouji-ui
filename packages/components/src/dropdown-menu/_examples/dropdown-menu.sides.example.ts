import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin sides demo.
@Component({
  selector: 'kj-dropdown-menu-sides-example',
  standalone: true,
  imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</kj-button>
    <kj-dropdown-menu-content [kjFor]="t" kjSide="right">
      <button kjDropdownMenuItem>Item</button>
    </kj-dropdown-menu-content>
  `,
})
export class KjDropdownMenuSidesExample {}

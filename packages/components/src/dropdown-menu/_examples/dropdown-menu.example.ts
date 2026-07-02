import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin via styled wrapper layer.
@Component({
  selector: 'kj-dropdown-menu-example',
  standalone: true,
  imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      <button kjDropdownMenuItem>Profile</button>
      <button kjDropdownMenuItem>Settings</button>
      <button kjDropdownMenuItem>Logout</button>
    </kj-dropdown-menu-content>
  `,
})
export class KjDropdownMenuExample {}

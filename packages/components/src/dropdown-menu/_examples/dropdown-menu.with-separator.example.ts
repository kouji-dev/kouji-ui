import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuGroup,
  KjDropdownMenuLabel,
} from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin separator demo.
@Component({
  selector: 'kj-dropdown-menu-with-separator-example',
  standalone: true,
  imports: [
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
    KjDropdownMenuGroup,
    KjDropdownMenuLabel,
    KjButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      <div kjDropdownMenuGroup>
        <span kjDropdownMenuLabel>Group A</span>
        <button kjDropdownMenuItem>One</button>
      </div>
      <hr kjDropdownMenuSeparator />
      <div kjDropdownMenuGroup>
        <span kjDropdownMenuLabel>Group B</span>
        <button kjDropdownMenuItem>Two</button>
      </div>
    </kj-dropdown-menu-content>
  `,
})
export class KjDropdownMenuWithSeparatorExample {}

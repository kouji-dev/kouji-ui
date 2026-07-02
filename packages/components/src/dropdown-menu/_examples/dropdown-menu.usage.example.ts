import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuLabel,
} from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

/**
 * A walkthrough of the most common dropdown-menu usages — a labelled group of
 * items with a destructive separator section, and a disabled item.
 */
@Component({
  selector: 'kj-dropdown-menu-usage-example',
  standalone: true,
  imports: [
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
    KjDropdownMenuLabel,
    KjButtonComponent,
  ],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-md);
      }
      .status {
        font-size: 0.875rem;
        color: var(--kj-fg-muted);
        align-self: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Account</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      <span kjDropdownMenuLabel>My account</span>
      <button kjDropdownMenuItem (click)="last.set('profile')">Profile</button>
      <button kjDropdownMenuItem (click)="last.set('settings')">Settings</button>
      <button kjDropdownMenuItem [kjDisabled]="true">Billing (admin only)</button>
      <hr kjDropdownMenuSeparator />
      <button kjDropdownMenuItem (click)="last.set('logout')">Logout</button>
    </kj-dropdown-menu-content>

    <span class="status">Last: {{ last() }}</span>
  `,
})
export class KjDropdownMenuUsageExample {
  readonly last = signal<string>('—');
}

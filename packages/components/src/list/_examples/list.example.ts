import { Component } from '@angular/core';
import { KjListComponent, KjListItemComponent } from '../list';

/**
 * Default usage example for KjListComponent. A settings list with five rows
 * inside a labelled list — anchors the default chrome (no dividers, no hover,
 * vertical orientation).
 */
@Component({
  selector: 'kj-list-example',
  standalone: true,
  imports: [KjListComponent, KjListItemComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-list ariaLabel="Account settings">
      <kj-list-item>Profile</kj-list-item>
      <kj-list-item>Notifications</kj-list-item>
      <kj-list-item>Billing</kj-list-item>
      <kj-list-item>Security</kj-list-item>
      <kj-list-item>Connected apps</kj-list-item>
    </kj-list>
  `,
})
export class KjListExample {}

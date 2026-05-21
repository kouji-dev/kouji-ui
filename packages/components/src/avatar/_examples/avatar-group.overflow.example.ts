import { Component } from '@angular/core';
import { KjAvatarGroupComponent } from '../avatar-group';
import { KjAvatarComponent } from '../avatar';

/**
 * Overflow example: seven projected avatars with `kjMax=3` cap show three
 * faces plus a `+4` chip. The count-aware label reads `3 of 7 collaborators`.
 */
@Component({
  selector: 'kj-avatar-group-overflow-example',
  standalone: true,
  imports: [KjAvatarGroupComponent, KjAvatarComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-avatar-group [kjMax]="3" kjAriaLabel="collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
      <kj-avatar content="KJ" alt="Katherine Johnson" />
      <kj-avatar content="MH" alt="Margaret Hamilton" />
      <kj-avatar content="DK" alt="Donald Knuth" />
      <kj-avatar content="BL" alt="Barbara Liskov" />
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupOverflowExample {}

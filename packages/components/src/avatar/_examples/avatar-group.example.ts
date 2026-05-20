import { Component } from '@angular/core';
import { KjAvatarGroupComponent } from '../avatar-group';
import { KjAvatarComponent } from '../avatar';

/**
 * Default usage example for KjAvatarGroupComponent.
 * Stacks four `<kj-avatar>` children with the group's defaults
 * (`kjMax=4`, `kjShape='circle'`, `role="group"`).
 */
@Component({
  selector: 'kj-avatar-group-example',
  standalone: true,
  imports: [KjAvatarGroupComponent, KjAvatarComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-avatar-group kjAriaLabel="collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
      <kj-avatar content="KJ" alt="Katherine Johnson" />
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupExample {}

import { Component } from '@angular/core';
import { KjAvatarGroupComponent } from './avatar-group';
import { KjAvatarComponent } from './avatar';

/**
 * Size propagation: `kjSize` on the group cascades to children via the
 * `KJ_AVATAR_GROUP` context. Three groups render at small, medium, and
 * large without setting `size` on each child.
 */
@Component({
  selector: 'kj-avatar-group-sizes-example',
  standalone: true,
  imports: [KjAvatarGroupComponent, KjAvatarComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-avatar-group kjSize="sm" kjAriaLabel="small collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
    </kj-avatar-group>

    <kj-avatar-group kjSize="md" kjAriaLabel="medium collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
    </kj-avatar-group>

    <kj-avatar-group kjSize="lg" kjAriaLabel="large collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupSizesExample {}

import { Component } from '@angular/core';
import { KjAvatarGroupComponent } from './avatar-group';
import { KjAvatarComponent } from './avatar';

/**
 * Shape propagation: `kjShape` on the group cascades to children — and to
 * the overflow chip — via the `KJ_AVATAR_GROUP` context. Two groups
 * demonstrate the `'circle'` (default) and `'rounded'` variants without
 * setting `shape` on individual avatars.
 */
@Component({
  selector: 'kj-avatar-group-shapes-example',
  standalone: true,
  imports: [KjAvatarGroupComponent, KjAvatarComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
  `],
  template: `
    <kj-avatar-group kjShape="circle" kjAriaLabel="circle collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
    </kj-avatar-group>

    <kj-avatar-group kjShape="rounded" kjAriaLabel="rounded collaborators">
      <kj-avatar content="AL" alt="Ada Lovelace" />
      <kj-avatar content="GH" alt="Grace Hopper" />
      <kj-avatar content="AT" alt="Alan Turing" />
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupShapesExample {}

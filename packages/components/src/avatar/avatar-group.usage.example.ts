import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';
import { KjAvatarGroupComponent } from './avatar-group';

/**
 * Common avatar-group shapes — a capped face-pile with +N chip and a list-mode
 * variant for "shared by" rows. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-avatar-group-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjAvatarGroupComponent, KjAvatarComponent],
  styles: [`:host { display: flex; flex-direction: column; gap: var(--kj-space-md); }`],
  template: `
    <kj-avatar-group kjMax="3" kjTotal="7">
      <kj-avatar content="AL" alt="Alice" />
      <kj-avatar content="BO" alt="Bo" />
      <kj-avatar content="CJ" alt="CJ" />
      <kj-avatar content="DI" alt="Di" />
    </kj-avatar-group>

    <kj-avatar-group kjRole="list" kjSize="sm">
      <kj-avatar content="EV" alt="Evan" />
      <kj-avatar content="FA" alt="Fay" />
      <kj-avatar content="GU" alt="Guo" />
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupUsageExample {}

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjAvatarComponent } from '../avatar';

@Component({
  selector: 'kj-avatar-with-image-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-avatar size="lg" src="https://i.pravatar.cc/96?img=12" alt="Jane Doe" content="JD" />
  `,
})
export class KjAvatarWithImageExample {}

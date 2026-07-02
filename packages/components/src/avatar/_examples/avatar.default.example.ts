import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjAvatarComponent } from '../avatar';

@Component({
  selector: 'kj-avatar-default-example',
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
  template: ` <kj-avatar content="JD" /> `,
})
export class KjAvatarDefaultExample {}

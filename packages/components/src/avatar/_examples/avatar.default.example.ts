import { Component } from '@angular/core';
import { KjAvatarComponent } from '../avatar';

@Component({
  selector: 'kj-avatar-default-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-avatar content="JD" />
  `,
})
export class KjAvatarDefaultExample {}

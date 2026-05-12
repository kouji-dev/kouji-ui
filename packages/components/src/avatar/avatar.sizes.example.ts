import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-sizes-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
    `,
  ],
  template: `
    <kj-avatar size="xs" content="XS" />
    <kj-avatar size="sm" content="SM" />
    <kj-avatar size="md" content="MD" />
    <kj-avatar size="lg" content="LG" />
    <kj-avatar size="xl" content="XL" />
  `,
})
export class KjAvatarSizesExample {}

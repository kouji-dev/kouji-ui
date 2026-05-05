import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-sizes-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: flex; gap: 0.75rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="xs" fallback="XS" />
    <kj-avatar size="sm" fallback="SM" />
    <kj-avatar size="md" fallback="MD" />
    <kj-avatar size="lg" fallback="LG" />
    <kj-avatar size="xl" fallback="XL" />
  `,
})
export class KjAvatarSizesExample {}

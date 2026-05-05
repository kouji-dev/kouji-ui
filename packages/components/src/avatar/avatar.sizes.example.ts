import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-sizes-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: flex; gap: 0.75rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="xs"><kj-avatar-fallback>XS</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="sm"><kj-avatar-fallback>SM</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="md"><kj-avatar-fallback>MD</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="lg"><kj-avatar-fallback>LG</kj-avatar-fallback></kj-avatar>
    <kj-avatar size="xl"><kj-avatar-fallback>XL</kj-avatar-fallback></kj-avatar>
  `,
})
export class KjAvatarSizesExample {}

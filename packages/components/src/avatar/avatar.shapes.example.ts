import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-shapes-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: flex; gap: 0.75rem; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar shape="circle"><kj-avatar-fallback>C</kj-avatar-fallback></kj-avatar>
    <kj-avatar shape="rounded"><kj-avatar-fallback>R</kj-avatar-fallback></kj-avatar>
  `,
})
export class KjAvatarShapesExample {}

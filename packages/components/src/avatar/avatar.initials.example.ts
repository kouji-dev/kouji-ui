import { Component } from '@angular/core';
import { KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent } from './avatar';

@Component({
  selector: 'kj-avatar-initials-example',
  standalone: true,
  imports: [KjAvatarComponent, KjAvatarImageComponent, KjAvatarFallbackComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar size="lg">
      <kj-avatar-image src="https://example.invalid/missing.png" alt="Missing" />
      <kj-avatar-fallback>NA</kj-avatar-fallback>
    </kj-avatar>
  `,
})
export class KjAvatarInitialsExample {}

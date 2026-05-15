import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-initials-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-avatar size="lg" src="https://example.invalid/missing.png" alt="Missing" content="NA" />
  `,
})
export class KjAvatarInitialsExample {}

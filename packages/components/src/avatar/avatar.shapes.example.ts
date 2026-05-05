import { Component } from '@angular/core';
import { KjAvatarComponent } from './avatar';

@Component({
  selector: 'kj-avatar-shapes-example',
  standalone: true,
  imports: [KjAvatarComponent],
  styles: [`:host { display: flex; gap: 0.75rem; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-avatar shape="circle" content="C" />
    <kj-avatar shape="rounded" content="R" />
  `,
})
export class KjAvatarShapesExample {}

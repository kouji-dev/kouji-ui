import { Component } from '@angular/core';
import { KjButton } from '@kouji-ui/core';

@Component({
  selector: 'kj-button-anchor-example',
  standalone: true,
  imports: [KjButton],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <a kjButton kjVariant="link" href="#profile">View profile</a>
  `,
})
export class KjButtonAnchorExample {}

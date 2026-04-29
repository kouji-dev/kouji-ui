import { Component } from '@angular/core';
import { KjBadgeDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjBadgeDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    [kjBadge] { display: inline-flex; align-items: center; padding: 0.2rem 0.6rem; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; letter-spacing: 0.05em; border: 1px solid; }
    [data-variant="default"] { color: #b8f500; border-color: #b8f500; background: rgba(184,245,0,0.08); }
    [data-variant="secondary"] { color: #888; border-color: #333; background: #111; }
    [data-variant="destructive"] { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.08); }
    [data-variant="outline"] { color: #f0ede6; border-color: #333; background: transparent; }
  `],
  template: `
    <div class="row">
      <span kjBadge [kjBadgeVariant]="'default'">Default</span>
      <span kjBadge [kjBadgeVariant]="'secondary'">Secondary</span>
      <span kjBadge [kjBadgeVariant]="'destructive'">Destructive</span>
      <span kjBadge [kjBadgeVariant]="'outline'">Outline</span>
    </div>
  `,
})
export class BadgeDemoComponent {}

import { Component } from '@angular/core';
import { KjToastDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjToastDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--bg, #0c0c0c); }
    .stack { display: flex; flex-direction: column; gap: 0.75rem; }
    [kjToast] { padding: 0.875rem 1rem; border: 1px solid; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; line-height: 1.4; display: flex; align-items: center; gap: 0.75rem; }
    [data-variant="default"] { background: var(--bg-subtle, #111); border-color: var(--border, #1a1a1a); color: var(--text, #f0ede6); }
    [data-variant="destructive"] { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    [data-variant="success"] { background: var(--accent-dim, rgba(184,245,0,0.08)); border-color: var(--accent, #b8f500); color: var(--accent, #b8f500); }
    [data-variant="warning"] { background: rgba(234,179,8,0.1); border-color: #eab308; color: #eab308; }
  `],
  template: `
    <div class="stack">
      <div kjToast [kjToastVariant]="'default'">Document saved successfully</div>
      <div kjToast [kjToastVariant]="'destructive'">Failed to delete item</div>
      <div kjToast [kjToastVariant]="'success'">Changes published</div>
      <div kjToast [kjToastVariant]="'warning'">Connection unstable</div>
    </div>
  `,
})
export class ToastDemoComponent {}

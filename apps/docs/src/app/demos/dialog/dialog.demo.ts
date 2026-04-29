import { Component } from '@angular/core';
import { KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjDialogDirective, KjDialogTriggerDirective, KjDialogContentDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--bg, #0c0c0c); }
    button[kjDialogTrigger] { padding: 0.5rem 1.25rem; background: var(--accent, #b8f500); color: var(--accent-fg, #0c0c0c); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; border: none; cursor: pointer; }
    .dialog-panel { background: var(--bg-elevated, #0e0e0e); border: 1px solid var(--border, #1a1a1a); padding: 2rem; min-width: 340px; }
    h3 { font-family: 'Syne', sans-serif; color: var(--text, #f0ede6); margin: 0 0 1rem; font-size: 1.25rem; }
    p { color: var(--text-secondary, #666); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; line-height: 1.6; margin-bottom: 1.5rem; }
    .actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-cancel { background: none; border: 1px solid var(--border, #1a1a1a); color: var(--text-secondary, #666); padding: 0.4rem 0.875rem; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; cursor: pointer; }
    .btn-confirm { background: var(--accent, #b8f500); color: var(--accent-fg, #0c0c0c); border: none; padding: 0.4rem 0.875rem; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; cursor: pointer; }
  `],
  template: `
    <div kjDialog #d="kjDialog">
      <button kjDialogTrigger>Open dialog</button>
      <ng-template kjDialogContent>
        <div class="dialog-panel" role="dialog" aria-label="Example dialog" aria-modal="true">
          <h3>Confirm action</h3>
          <p>This is an example dialog. Press Escape or click a button to close it.</p>
          <div class="actions">
            <button class="btn-cancel" (click)="d.hide()">Cancel</button>
            <button class="btn-confirm" (click)="d.hide()">Confirm</button>
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class DialogDemoComponent {}

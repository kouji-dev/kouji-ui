import { Component, inject } from '@angular/core';
import { KjDialog as KjDialogService } from './dialog.service';
import { KjDialogRef } from './dialog.ref';

@Component({
  selector: 'kj-example-dialog-retro-content',
  standalone: true,
  host: { class: 'kj-theme-retro' },
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; background: var(--kj-surface); border: var(--kj-btn-border); padding: 1.5rem; min-width: 20rem; box-shadow: var(--kj-shadow-hard); font-family: var(--kj-font); color: var(--kj-text); }
    h2 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid var(--kj-border); padding-bottom: 0.5rem; color: var(--kj-text); }
    .dialog-body { margin: 0.75rem 0 1.5rem; font-size: 0.8rem; color: var(--kj-text-muted); line-height: 1.6; }
    .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    button {
      padding: 0.3rem 0.875rem; font-family: var(--kj-font); font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: var(--kj-surface); color: var(--kj-text);
      border: var(--kj-btn-border); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    .btn-primary { background: var(--kj-accent); color: var(--kj-accent-on); }
  `],
  template: `
    <h2>Edit Profile</h2>
    <p class="dialog-body">Make changes to your profile settings here.</p>
    <div class="dialog-actions">
      <button (click)="ref.close('cancel')">Cancel</button>
      <button class="btn-primary" (click)="ref.close('save')">Save Changes</button>
    </div>
  `,
})
export class DialogRetroContent {
  readonly ref = inject<KjDialogRef<DialogRetroContent>>(KjDialogRef);
}

@Component({
  selector: 'kj-example-dialog-retro',
  standalone: true,
  styleUrls: ['../styles/docs-themes.css'],
  host: { class: 'kj-theme-retro' },
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; color: var(--kj-text); }
    button {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: var(--kj-surface); color: var(--kj-text);
      border: var(--kj-btn-border); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
  `],
  template: `
    <button (click)="open()">Open Dialog</button>
  `,
})
export class DialogRetroExample {
  private readonly dialog = inject(KjDialogService);
  open() { this.dialog.open(DialogRetroContent); }
}

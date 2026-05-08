import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjToastViewport, KjToast } from './toast';
import { KjToastService } from './toast.service';

@Component({
  selector: 'kj-example-toast-retro',
  standalone: true,
  imports: [KjToastViewport, KjToast, NgTemplateOutlet],
  styleUrls: ['../styles/docs-themes.css'],
  host: { class: 'kj-theme-retro' },
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 260px; position: relative; color: var(--kj-text); }
    .row { display: flex; gap: 0.625rem; flex-wrap: wrap; }
    button {
      padding: 0.35rem 0.875rem; font-family: var(--kj-font); font-size: 0.75rem;
      font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      border: var(--kj-btn-border); border-radius: 0; cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    .btn-ok   { background: #16a34a; color: #fff; }
    .btn-err  { background: #dc2626; color: #fff; }
    .btn-warn { background: #d97706; color: #fff; }
    .btn-info { background: #1d4ed8; color: #fff; border-color: #1d4ed8; box-shadow: 3px 3px 0 #1d4ed8; }
    .btn-info:hover { box-shadow: 4px 4px 0 #1d4ed8; }
    [kjToastViewport] {
      position: absolute; bottom: 1rem; right: 1rem;
      display: flex; flex-direction: column; gap: 0.5rem; width: 18rem;
      list-style: none; padding: 0; margin: 0;
    }
    [kjToast] {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.625rem 0.875rem; font-family: var(--kj-font); font-size: 0.75rem;
      border: var(--kj-btn-border); background: var(--kj-bg); color: var(--kj-text); box-shadow: var(--kj-shadow-md);
      animation: slideIn 0.15s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateX(1rem); } to { opacity: 1; transform: translateX(0); } }
    [data-variant="success"]     { border-color: #16a34a; }
    [data-variant="destructive"] { border-color: #dc2626; }
    [data-variant="warning"]     { border-color: #d97706; }
    [data-variant="default"]     { border-color: #1d4ed8; }
    .close { background: none; border: none; box-shadow: none; cursor: pointer; font-size: 1rem; padding: 0 0 0 0.5rem; transition: none; font-family: inherit; }
    .close:hover { transform: none; }
  `],
  template: `
    <div class="row">
      <button class="btn-ok"   (click)="toast.show('File saved!', { variant: 'success' })">OK</button>
      <button class="btn-err"  (click)="toast.show('Access denied!', { variant: 'destructive' })">ERR</button>
      <button class="btn-warn" (click)="toast.show('Low disk space.', { variant: 'warning' })">WARN</button>
      <button class="btn-info" (click)="toast.show('Update available.')">INFO</button>
    </div>
    <ol kjToastViewport [kjToastDefaultTemplate]="defaultTpl" #vp="kjToastViewport" aria-label="Notifications">
      @for (r of vp.renderable(); track r.id) {
        <li><ng-container *ngTemplateOutlet="r.template; context: r.context" /></li>
      }
    </ol>

    <ng-template #defaultTpl let-ctx>
      <div kjToast [kjToastVariant]="ctx.variant" [kjToastId]="ctx.id">
        <span>{{ ctx.message }}</span>
        <button class="close" (click)="ctx.dismiss()" aria-label="Dismiss">×</button>
      </div>
    </ng-template>
  `,
})
export class ToastRetroExample {
  readonly toast = inject(KjToastService);
}

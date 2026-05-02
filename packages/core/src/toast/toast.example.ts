import { Component, inject } from '@angular/core';
import { KjToastViewport, KjToast, KjToastClose } from './toast';
import { KjToastService } from './toast.service';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-toast-basic',
  standalone: true,
  imports: [KjToastViewport, KjToast, KjToastClose, KjButton],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 260px; position: relative; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    button[kjButton] { padding: 0.4rem 1rem; border: none; cursor: pointer; font-family: inherit; font-size: 0.8125rem; }
    [data-variant="success"] { background: #4ade80; color: #0c0c0c; }
    [data-variant="destructive"] { background: #ef4444; color: #fff; }
    [data-variant="warning"] { background: #fb923c; color: #0c0c0c; }
    [data-variant="default"] { background: #b8f500; color: #0c0c0c; }
    [kjToastViewport] {
      position: absolute; bottom: 1rem; right: 1rem;
      display: flex; flex-direction: column; gap: 0.5rem; width: 18rem;
    }
    [kjToast] {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 1rem; font-size: 0.8125rem;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateX(1rem); } to { opacity: 1; transform: translateX(0); } }
    [data-variant="success"]      { background: #052e16; color: #4ade80; border-left: 3px solid #4ade80; }
    [data-variant="destructive"]  { background: #2c0a0a; color: #f87171; border-left: 3px solid #ef4444; }
    [data-variant="warning"]      { background: #2c1a04; color: #fb923c; border-left: 3px solid #fb923c; }
    [data-variant="default"]      { background: #1a1a1a; color: #f0ede6; border-left: 3px solid #b8f500; }
    .close { background: none; border: none; cursor: pointer; opacity: 0.6; font-size: 1rem; color: inherit; padding: 0 0 0 0.5rem; }
    .close:hover { opacity: 1; }
  `],
  template: `
    <div class="row">
      <button kjButton [attr.data-variant]="'success'"     (click)="toast.success('Changes saved successfully!')">Success</button>
      <button kjButton [attr.data-variant]="'destructive'" (click)="toast.error('Something went wrong!')">Error</button>
      <button kjButton [attr.data-variant]="'warning'"     (click)="toast.warning('Session expires in 5 minutes.')">Warning</button>
      <button kjButton [attr.data-variant]="'default'"     (click)="toast.info('New update available.')">Info</button>
    </div>
    <div kjToastViewport #vp="kjToastViewport">
      @for (t of vp.toasts(); track t.id) {
        <div kjToast [kjToastVariant]="t.variant">
          <span>{{ t.message }}</span>
          <button class="close" [kjToastClose]="t.id" [attr.aria-label]="'Dismiss'">×</button>
        </div>
      }
    </div>
  `,
})
export class ToastBasicExample {
  readonly toast = inject(KjToastService);
}

import { Component, inject } from '@angular/core';
import { KjToastViewport, KjToast, KjToastClose } from './toast';
import { KjToastService } from './toast.service';

@Component({
  selector: 'kj-example-toast-finance',
  standalone: true,
  imports: [KjToastViewport, KjToast, KjToastClose],
  styles: [`
    :host { display: block; padding: 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; min-height: 260px; position: relative; }
    .row { display: flex; gap: 0.625rem; flex-wrap: wrap; }
    button {
      padding: 0.4rem 1rem; font-family: inherit; font-size: 0.8125rem; font-weight: 500;
      border-radius: 6px; border: 1px solid transparent; cursor: pointer; transition: background 0.12s; line-height: 1.5;
    }
    .btn-success { background: #22c55e; color: #fff; border-color: #22c55e; }
    .btn-success:hover { background: #16a34a; }
    .btn-error   { background: #ef4444; color: #fff; border-color: #ef4444; }
    .btn-error:hover { background: #dc2626; }
    .btn-warning { background: #f59e0b; color: #fff; border-color: #f59e0b; }
    .btn-warning:hover { background: #d97706; }
    .btn-info    { background: #3b82f6; color: #fff; border-color: #3b82f6; }
    .btn-info:hover { background: #2563eb; }
    [kjToastViewport] {
      position: absolute; bottom: 1rem; right: 1rem;
      display: flex; flex-direction: column; gap: 0.5rem; width: 18rem;
    }
    [kjToast] {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 1rem; font-size: 0.8125rem; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1); animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateX(1rem); } to { opacity: 1; transform: translateX(0); } }
    [data-variant="success"]     { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    [data-variant="destructive"] { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    [data-variant="warning"]     { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    [data-variant="default"]     { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .close { background: none; border: none; cursor: pointer; font-size: 1rem; color: inherit; padding: 0 0 0 0.5rem; opacity: 0.5; }
    .close:hover { opacity: 1; }
  `],
  template: `
    <div class="row">
      <button class="btn-success" (click)="toast.success('Transaction completed.')">Success</button>
      <button class="btn-error"   (click)="toast.error('Payment declined.')">Error</button>
      <button class="btn-warning" (click)="toast.warning('Session expiring soon.')">Warning</button>
      <button class="btn-info"    (click)="toast.info('Statement ready to download.')">Info</button>
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
export class ToastFinanceExample {
  readonly toast = inject(KjToastService);
}

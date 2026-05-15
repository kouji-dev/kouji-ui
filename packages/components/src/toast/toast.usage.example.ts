import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { KjToastService } from '@kouji-ui/core';
import type { KjToastTemplateContext } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjToastViewportComponent, KjToastComponent, KjToastCloseComponent } from './toast';

/**
 * A walkthrough of the most common toast usages — enqueue with a variant,
 * project an action button inside the body, and dismiss via the close icon.
 * Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-toast-usage-example',
  standalone: true,
  imports: [KjButtonComponent, KjToastViewportComponent, KjToastComponent, KjToastCloseComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); min-height: 10rem; }
    .row { display: flex; gap: var(--kj-space-sm); flex-wrap: wrap; }
  `],
  template: `
    <div class="row">
      <kj-button (click)="show('default', 'Saved')">Default</kj-button>
      <kj-button kjVariant="destructive" (click)="show('destructive', 'Save failed')">Error</kj-button>
      <kj-button (click)="show('success', 'Uploaded — view file')">With action</kj-button>
    </div>
    <kj-toast-viewport />

    <ng-template #tpl let-ctx>
      <kj-toast [variant]="ctx.variant" [id]="ctx.id">
        <span>{{ ctx.title }}</span>
        <kj-toast-close [toastId]="ctx.id">×</kj-toast-close>
      </kj-toast>
    </ng-template>
  `,
})
export class KjToastUsageExample {
  private readonly svc = inject(KjToastService);
  readonly tpl = viewChild.required<TemplateRef<KjToastTemplateContext>>('tpl');

  show(variant: 'default' | 'success' | 'destructive' | 'warning', title: string): void {
    this.svc.show(this.tpl(), { title, variant });
  }
}

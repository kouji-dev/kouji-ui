import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { KjToastService, type KjToastVariant } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjToastViewportComponent } from './toast';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Service-launched toast surfaces a
 * trigger button; the variant + message are wired into the click handler.
 */
const variant = signal<KjToastVariant>('default');
const message = signal('Saved your changes.');

@Component({
  selector: 'kj-toast-playground',
  standalone: true,
  imports: [KjButtonComponent, KjToastViewportComponent],
  styles: [`:host { display: block; min-height: 6rem; }`],
  template: `
    <kj-button (click)="show()">Show toast</kj-button>
    <kj-toast-viewport />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjToastPlaygroundDemo {
  private readonly toast = inject(KjToastService);
  protected readonly variant = variant;
  protected readonly message = message;

  protected show(): void {
    this.toast.show(this.message(), { variant: this.variant() });
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjToastPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    message: message as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'success', 'warning', 'destructive', 'info'],
    },
    { kind: 'text', name: 'message', label: 'message' },
  ],
  snippet: (values) => {
    const s = values as { variant: string; message: string };
    return `<kj-button (click)="show()">Show toast</kj-button>
<kj-toast-viewport />

// In your component:
private readonly toast = inject(KjToastService);
show(): void {
  this.toast.show('${s.message}', { variant: '${s.variant}' });
}`;
  },
};

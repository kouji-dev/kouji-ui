import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KJ_BUTTON_DEFAULTS, provideKjButton } from '@kouji-ui/core';
import { KjButtonComponent } from '../button';

@Component({
  selector: 'kj-button-configured-example',
  standalone: true,
  imports: [KjButtonComponent],
  providers: [
    provideKjButton({
      variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand', 'warning'],
      defaults: { variant: 'brand', size: 'md' },
    }),
  ],
  styles: [
    `
      :host {
        display: block;
        display: flex;
        gap: var(--kj-space-md);
      }
    `,
    `
      .kj-button[data-variant='brand'] {
        --kj-button-bg: var(--kj-bg-primary);
        --kj-button-fg: var(--kj-fg-on-primary);
      }
    `,
    `
      .kj-button[data-variant='warning'] {
        --kj-button-bg: var(--kj-bg-warning);
        --kj-button-fg: var(--kj-fg-on-warning);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button>Default (now 'brand')</kj-button>
    <kj-button kjVariant="warning">Warning</kj-button>
    <kj-button kjVariant="default">Original default</kj-button>
  `,
})
export class KjButtonConfiguredExample {}

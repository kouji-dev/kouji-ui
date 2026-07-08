import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjSkipLinkComponent } from './skip-link';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. `label` is the projected visible
 * text and `target` is the `id` of the landmark focus jumps to on activation.
 */
const label = signal('Skip to main content');
const target = signal('playground-main');

@Component({
  selector: 'kj-skip-link-playground',
  standalone: true,
  imports: [KjSkipLinkComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .frame {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
        padding: var(--kj-space-lg);
        border: 1px solid var(--kj-bg-field);
        border-radius: var(--kj-radius-box, 0.5rem);
        /* Contain the fixed-positioned skip link within this demo frame. */
        transform: translateZ(0);
        overflow: hidden;
      }
      nav {
        display: flex;
        gap: var(--kj-space-md);
      }
      main {
        padding: var(--kj-space-md);
        border-radius: var(--kj-radius-field, 0.25rem);
        background: var(--kj-bg-surface);
      }
      main:focus-visible {
        outline: 3px solid var(--kj-fg-primary);
        outline-offset: 2px;
      }
    `,
  ],
  template: `
    <div class="frame">
      <kj-skip-link [kjTarget]="target()">{{ label() }}</kj-skip-link>
      <nav aria-label="Demo navigation">
        <a href="#one">Nav one</a>
        <a href="#two">Nav two</a>
      </nav>
      <main [id]="target()">
        <p>Main content — focus lands here after activating the skip link.</p>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSkipLinkPlaygroundDemo {
  protected readonly label = label;
  protected readonly target = target;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjSkipLinkPlaygroundDemo,
  state: {
    label: label as unknown as ReturnType<typeof signal>,
    target: target as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'label', label: 'label' },
    { kind: 'text', name: 'target', label: 'kjTarget' },
  ],
  snippet: (values) => {
    const s = values as { label: string; target: string };
    return `<kj-skip-link kjTarget="${s.target}">${s.label}</kj-skip-link>`;
  },
};

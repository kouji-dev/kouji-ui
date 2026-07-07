import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjSkipLinkComponent } from '../skip-link';

/**
 * Self-contained skip-link demo. Tab into the frame to reveal the link in the
 * top-left, then press Enter — focus jumps past the mock nav to the region
 * labelled "Main content". Mirrors how the link behaves in the app shell.
 */
@Component({
  selector: 'kj-skip-link-example',
  standalone: true,
  imports: [KjSkipLinkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      <kj-skip-link kjTarget="example-main">Skip to main content</kj-skip-link>
      <nav aria-label="Demo navigation">
        <a href="#one">Nav one</a>
        <a href="#two">Nav two</a>
        <a href="#three">Nav three</a>
      </nav>
      <main id="example-main">
        <p>Main content — focus lands here after activating the skip link.</p>
      </main>
    </div>
  `,
})
export class KjSkipLinkExample {}

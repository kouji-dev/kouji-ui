import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjLinkComponent } from '../link';

@Component({
  selector: 'kj-link-in-prose-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [
    `
      :host {
        display: block;
      }
      p {
        max-width: 60ch;
        line-height: 1.6;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <p>
      kouji-ui ships a small, opinionated set of components. Read the
      <kj-link kjHref="/docs" kjUnderline="always">documentation</kj-link>
      to get started, browse the
      <kj-link
        kjHref="https://github.com/kouji-dev/kouji-ui"
        kjTarget="_blank"
        kjUnderline="always"
      >
        source on GitHub </kj-link
      >, or try the <kj-link kjHref="/playground" kjUnderline="always">live playground</kj-link>.
      Inline links sit naturally inside the text flow without breaking the baseline.
    </p>
  `,
})
export class KjLinkInProseExample {}

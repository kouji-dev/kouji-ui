import { Component } from '@angular/core';
import { KjCode } from '@kouji-ui/core';

/**
 * Inline code example using the `kjCode` directive.
 *
 * Reflects `data-tone="code"` on a `<code>` host so the kouji type system
 * applies the inline code styling (mono font, subtle background, padding)
 * outside a `kj-prose` container, where it would otherwise apply
 * automatically.
 */
@Component({
  selector: 'kj-typography-code-example',
  standalone: true,
  imports: [KjCode],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <p>
      Run <code kjCode>npm install &#64;kouji-ui/core</code> to install the headless directives,
      then import the prose stylesheet from
      <code kjCode>&#64;kouji-ui/core/typography/prose.css</code>.
    </p>
  `,
})
export class KjTypographyCodeExample {}

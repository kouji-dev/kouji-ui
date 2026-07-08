import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjEditorComponent } from '../editor';
import { KjButtonComponent } from '../../button/button';
import { KjButtonGroupComponent } from '../../button-group/button-group';

const SNIPPETS: Record<string, string> = {
  typescript: `export const greet = (name: string) => \`Hello, \${name}!\`;`,
  html: `<section class="hero">\n  <h1>Kouji UI</h1>\n</section>`,
  css: `.hero {\n  display: grid;\n  place-items: center;\n}`,
  json: `{\n  "name": "kouji-ui",\n  "themes": 13\n}`,
};

/**
 * Switching `kjLanguage` re-tokenises the buffer — pick a language to see the
 * syntax highlighting update live. The picker is a `kj-button-group` of
 * `kj-button`s; the active language is the filled (`default`) button.
 */
@Component({
  selector: 'kj-editor-languages-example',
  standalone: true,
  imports: [KjEditorComponent, KjButtonComponent, KjButtonGroupComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .langs {
        margin-bottom: var(--kj-space-md);
      }
      .host {
        height: 260px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button-group class="langs" kjAriaLabel="Language">
      @for (l of languages; track l) {
        <kj-button
          kjSize="sm"
          [kjVariant]="lang() === l ? 'default' : 'outline'"
          [attr.aria-pressed]="lang() === l"
          (click)="pick(l)"
          >{{ l }}</kj-button
        >
      }
    </kj-button-group>
    <div class="host">
      <kj-editor [kjValue]="code()" [kjLanguage]="lang()" kjAriaLabel="Code sample" />
    </div>
  `,
})
export class KjEditorLanguagesExample {
  readonly languages = ['typescript', 'html', 'css', 'json'];
  readonly lang = signal('typescript');
  readonly code = signal(SNIPPETS['typescript']);

  pick(l: string): void {
    this.lang.set(l);
    this.code.set(SNIPPETS[l]);
  }
}

import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjEditorComponent } from '../editor';

const SNIPPETS: Record<string, string> = {
  typescript: `export const greet = (name: string) => \`Hello, \${name}!\`;`,
  html: `<section class="hero">\n  <h1>Kouji UI</h1>\n</section>`,
  css: `.hero {\n  display: grid;\n  place-items: center;\n}`,
  json: `{\n  "name": "kouji-ui",\n  "themes": 13\n}`,
};

/**
 * Switching `kjLanguage` re-tokenises the buffer — pick a language to see the
 * syntax highlighting update live.
 */
@Component({
  selector: 'kj-editor-languages-example',
  standalone: true,
  imports: [KjEditorComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .langs {
        display: flex;
        gap: var(--kj-space-sm);
        margin-bottom: var(--kj-space-md);
        flex-wrap: wrap;
      }
      button {
        min-height: 44px;
        padding: 0 var(--kj-space-md);
        cursor: pointer;
      }
      button[aria-pressed='true'] {
        font-weight: 600;
      }
      .host {
        height: 260px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="langs" role="group" aria-label="Language">
      @for (l of languages; track l) {
        <button type="button" [attr.aria-pressed]="lang() === l" (click)="pick(l)">{{ l }}</button>
      }
    </div>
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

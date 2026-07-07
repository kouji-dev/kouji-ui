import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjEditorComponent } from '../editor';

/**
 * Default editor — a TypeScript buffer two-way bound to a signal, with the
 * toolbar and status bar shown.
 */
@Component({
  selector: 'kj-editor-example',
  standalone: true,
  imports: [KjEditorComponent],
  styles: [
    `
      :host {
        display: block;
        height: 320px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-editor
    [(kjValue)]="code"
    kjLanguage="typescript"
    kjAriaLabel="TypeScript editor"
  />`,
})
export class KjEditorExample {
  readonly code = signal(
    [
      'interface Point {',
      '  x: number;',
      '  y: number;',
      '}',
      '',
      'const distance = (a: Point, b: Point): number =>',
      '  Math.hypot(b.x - a.x, b.y - a.y);',
    ].join('\n'),
  );
}

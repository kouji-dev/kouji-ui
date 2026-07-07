import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjRichTextEditorComponent } from '../rich-text-editor';

/**
 * Default rich-text editor with the full formatting toolbar, a placeholder,
 * and two-way content binding.
 */
@Component({
  selector: 'kj-rich-text-editor-example',
  standalone: true,
  imports: [KjRichTextEditorComponent],
  template: `
    <kj-rich-text-editor
      kjLabel="Message body"
      kjPlaceholder="Write something — try **bold**, # heading, or - a list…"
      [kjValue]="initial"
      (valueChange)="html.set($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorExample {
  protected readonly initial =
    '<p>Start typing, or select text and use the toolbar for <strong>bold</strong>, <em>italic</em>, and lists.</p>';
  protected readonly html = signal(this.initial);
}

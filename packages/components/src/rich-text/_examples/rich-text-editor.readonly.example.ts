import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjRichTextEditorComponent } from '../rich-text-editor';

/** Read-only rendering of stored rich-text content, with the toolbar hidden. */
@Component({
  selector: 'kj-rich-text-editor-readonly-example',
  standalone: true,
  imports: [KjRichTextEditorComponent],
  template: `
    <kj-rich-text-editor
      kjLabel="Release notes"
      [kjReadonly]="true"
      [kjShowToolbar]="false"
      [kjValue]="content"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorReadonlyExample {
  protected readonly content =
    '<h2>Release notes</h2>' +
    '<p>This build ships the new <strong>rich-text editor</strong>.</p>' +
    '<ul><li>Bold, italic, underline, strikethrough</li><li>Headings and lists</li><li>Links and code blocks</li></ul>';
}

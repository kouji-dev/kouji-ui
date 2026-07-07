import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { KjRichTextFeature } from '@kouji-ui/core';
import { KjRichTextEditorComponent } from '../rich-text-editor';
import { bold, italic, link } from '../features/index';

/**
 * A minimal editor enabling only bold, italic and link. The toolbar renders just
 * those controls, and only their packages (`@lexical/link`) load — `@lexical/list`,
 * `@lexical/code`, `@lexical/history`, `@lexical/markdown` are never downloaded.
 */
@Component({
  selector: 'kj-rich-text-editor-minimal-example',
  standalone: true,
  imports: [KjRichTextEditorComponent],
  template: `
    <kj-rich-text-editor
      kjLabel="Comment"
      kjToolbarLabel="Basic formatting"
      kjPlaceholder="Bold, italic and links only…"
      [kjFeatures]="features"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorMinimalExample {
  protected readonly features: KjRichTextFeature[] = [bold(), italic(), link()];
}

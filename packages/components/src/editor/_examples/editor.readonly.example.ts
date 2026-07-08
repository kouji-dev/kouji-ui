import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjEditorComponent } from '../editor';

/**
 * Read-only viewer — `kjReadonly` disables editing, the minimap is enabled and
 * the toolbar is hidden so it reads as a code sample rather than an input.
 */
@Component({
  selector: 'kj-editor-readonly-example',
  standalone: true,
  imports: [KjEditorComponent],
  styles: [
    `
      :host {
        display: block;
        height: 300px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-editor
    [kjValue]="code()"
    kjLanguage="json"
    [kjReadonly]="true"
    [kjMinimap]="true"
    [kjShowToolbar]="false"
    kjAriaLabel="package.json (read-only)"
  />`,
})
export class KjEditorReadonlyExample {
  readonly code = signal(
    JSON.stringify(
      { name: '@kouji-ui/components', private: false, sideEffects: false, themes: 13 },
      null,
      2,
    ),
  );
}

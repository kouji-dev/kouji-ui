import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjEditorComponent } from '../editor';
import type { KjEditorWordWrap } from '@kouji-ui/core';

/**
 * Live options — toggle readonly, minimap, word wrap, line numbers and font
 * size and watch the editor reconfigure without a reload.
 */
@Component({
  selector: 'kj-editor-options-example',
  standalone: true,
  imports: [KjEditorComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: var(--kj-space-md);
        margin-bottom: var(--kj-space-md);
        align-items: center;
      }
      label {
        display: inline-flex;
        align-items: center;
        gap: var(--kj-space-xs);
        min-height: 44px;
      }
      .host {
        height: 280px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="controls">
      <label
        ><input
          type="checkbox"
          [checked]="readonly()"
          (change)="readonly.set($any($event.target).checked)"
        />
        Readonly</label
      >
      <label
        ><input
          type="checkbox"
          [checked]="minimap()"
          (change)="minimap.set($any($event.target).checked)"
        />
        Minimap</label
      >
      <label
        ><input
          type="checkbox"
          [checked]="wrap() === 'on'"
          (change)="wrap.set($any($event.target).checked ? 'on' : 'off')"
        />
        Word wrap</label
      >
      <label
        >Font
        <input
          type="range"
          min="11"
          max="20"
          [value]="fontSize()"
          (input)="fontSize.set(+$any($event.target).value)"
        />
        {{ fontSize() }}px
      </label>
    </div>
    <div class="host">
      <kj-editor
        [(kjValue)]="code"
        kjLanguage="typescript"
        [kjReadonly]="readonly()"
        [kjMinimap]="minimap()"
        [kjWordWrap]="wrap()"
        [kjFontSize]="fontSize()"
        kjAriaLabel="Configurable editor"
      />
    </div>
  `,
})
export class KjEditorOptionsExample {
  readonly readonly = signal(false);
  readonly minimap = signal(false);
  readonly wrap = signal<KjEditorWordWrap>('off');
  readonly fontSize = signal(13);
  readonly code = signal(
    'const items = Array.from({ length: 20 }, (_, i) => i * i);\nconsole.log(items.filter((n) => n % 2 === 0));',
  );
}

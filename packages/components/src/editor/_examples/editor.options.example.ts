import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjEditorComponent } from '../editor';
import { KjToggleComponent } from '../../toggle/toggle';
import { KjSliderComponent } from '../../slider/slider';
import type { KjEditorWordWrap } from '@kouji-ui/core';

/**
 * Live options — toggle readonly, minimap, word wrap and font size (via
 * `kj-toggle` / `kj-slider`) and watch the editor reconfigure without a reload.
 */
@Component({
  selector: 'kj-editor-options-example',
  standalone: true,
  imports: [KjEditorComponent, KjToggleComponent, KjSliderComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: var(--kj-space-lg);
        margin-bottom: var(--kj-space-md);
        align-items: center;
      }
      .opt {
        display: inline-flex;
        align-items: center;
        gap: var(--kj-space-sm);
      }
      .opt--slider {
        min-width: 13rem;
      }
      .host {
        height: 280px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="controls">
      <span class="opt">
        <kj-toggle [(pressed)]="readonly" ariaLabel="Readonly"></kj-toggle>
        <span>Readonly</span>
      </span>
      <span class="opt">
        <kj-toggle [(pressed)]="minimap" ariaLabel="Minimap"></kj-toggle>
        <span>Minimap</span>
      </span>
      <span class="opt">
        <kj-toggle
          [pressed]="wrap() === 'on'"
          (pressedChange)="wrap.set($event ? 'on' : 'off')"
          ariaLabel="Word wrap"
        ></kj-toggle>
        <span>Word wrap</span>
      </span>
      <span class="opt opt--slider">
        <span>Font</span>
        <kj-slider [(kjValue)]="fontSize" [kjMin]="11" [kjMax]="20" kjAriaLabel="Font size" />
        <span>{{ fontSize() }}px</span>
      </span>
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

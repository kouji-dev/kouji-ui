import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';
import { KjKbdComponent } from '../kbd/kbd';

/**
 * Menubar items with trailing keyboard-shortcut hints. The `<kj-kbd>`
 * sibling sits inline alongside the label and stays right-aligned via the
 * menubar item's flex layout.
 */
@Component({
  selector: 'kj-menubar-with-shortcuts-example',
  standalone: true,
  imports: [KjMenubarComponent, KjMenubarItemComponent, KjKbdComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item>
        File <kj-kbd>Alt+F</kj-kbd>
      </kj-menubar-item>
      <kj-menubar-item>
        Edit <kj-kbd>Alt+E</kj-kbd>
      </kj-menubar-item>
      <kj-menubar-item>
        View <kj-kbd>Alt+V</kj-kbd>
      </kj-menubar-item>
      <kj-menubar-item>
        Help <kj-kbd>F1</kj-kbd>
      </kj-menubar-item>
    </kj-menubar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarWithShortcutsExample {}

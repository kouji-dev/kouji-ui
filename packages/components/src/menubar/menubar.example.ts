import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';

/**
 * Default menubar — the canonical File / Edit / View arrangement.
 */
@Component({
  selector: 'kj-menubar-example',
  standalone: true,
  imports: [KjMenubarComponent, KjMenubarItemComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item>File</kj-menubar-item>
      <kj-menubar-item>Edit</kj-menubar-item>
      <kj-menubar-item>View</kj-menubar-item>
      <kj-menubar-item>Help</kj-menubar-item>
    </kj-menubar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarExample {}

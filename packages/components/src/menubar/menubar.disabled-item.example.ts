import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';

/**
 * Menubar with a disabled top-level item. `[kjDisabled]="true"` drops the
 * item from the keyboard cycle, dims it, and prevents activation.
 */
@Component({
  selector: 'kj-menubar-disabled-item-example',
  standalone: true,
  imports: [KjMenubarComponent, KjMenubarItemComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item>File</kj-menubar-item>
      <kj-menubar-item>Edit</kj-menubar-item>
      <kj-menubar-item [kjDisabled]="true">View</kj-menubar-item>
      <kj-menubar-item>Help</kj-menubar-item>
    </kj-menubar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarDisabledItemExample {}

import { Component } from '@angular/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';

/**
 * A walkthrough of the most common menubar usages — a single bar with action
 * items, one disabled item, and an explicit `kjAriaLabel`. Use this as the
 * copy-paste starting point for an application-level menubar.
 *
 * TODO(overlay-migration): extend with submenu triggers once the dropdown-menu
 * compound exposes its `[kjFor]` content panel via the new overlay primitives.
 */
@Component({
  selector: 'kj-menubar-usage-example',
  standalone: true,
  imports: [KjMenubarComponent, KjMenubarItemComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item>File</kj-menubar-item>
      <kj-menubar-item>Edit</kj-menubar-item>
      <kj-menubar-item>View</kj-menubar-item>
      <kj-menubar-item [kjDisabled]="true">Help</kj-menubar-item>
    </kj-menubar>
  `,
})
export class KjMenubarUsageExample {}

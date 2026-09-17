import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjDropdownMenu, KjDropdownMenuItem, KjDropdownMenuSeparator } from '@kouji-ui/core';
import { KjMenubarComponent, KjMenubarItemComponent } from './menubar';

/**
 * A walkthrough of the most common menubar usages — bar items that disclose a
 * dropdown-menu panel, one disabled item, and an explicit `kjAriaLabel`. Use
 * this as the copy-paste starting point for an application-level menubar.
 *
 * Each item points `[kjDropdownMenuTriggerFor]` at an `<ng-template>` holding a
 * `[kjDropdownMenu]` panel. Activating the item portals that panel under it;
 * opening another item closes the first, Escape closes the open one, and focus
 * returns to the bar item either way.
 */
@Component({
  selector: 'kj-menubar-usage-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenu,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="editMenu">Edit</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="viewMenu">View</kj-menubar-item>
      <kj-menubar-item [kjDisabled]="true">Help</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem>New</button>
        <button kjDropdownMenuItem>Open…</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem>Save</button>
      </div>
    </ng-template>

    <ng-template #editMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem>Undo</button>
        <button kjDropdownMenuItem>Redo</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem>Copy</button>
        <button kjDropdownMenuItem>Paste</button>
      </div>
    </ng-template>

    <ng-template #viewMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem>Zoom in</button>
        <button kjDropdownMenuItem>Zoom out</button>
        <button kjDropdownMenuItem>Reset zoom</button>
      </div>
    </ng-template>
  `,
})
export class KjMenubarUsageExample {}

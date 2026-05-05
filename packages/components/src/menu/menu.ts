import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjMenu, KjMenuTrigger, KjMenuContent, KjMenuItem } from '@kouji-ui/core';

/**
 * Menu root.
 *
 * @doc-example Default
 *   @doc-file menu.default.example.ts
 * @doc-example With sub-items
 *   @doc-file menu.sub-items.example.ts
 * @doc-example Disabled item
 *   @doc-file menu.disabled.example.ts
 * @doc-example With shortcuts
 *   @doc-file menu.shortcuts.example.ts
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-menu',
  standalone: true,
  hostDirectives: [KjMenu],
  template: `<ng-content />`,
  styleUrl: './menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-menu' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuComponent {}

@Component({
  selector: 'kj-menu-trigger',
  standalone: true,
  imports: [KjMenuTrigger],
  template: `<button type="button" kjMenuTrigger class="kj-menu-trigger"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuTriggerComponent {}

@Component({
  selector: 'kj-menu-content',
  standalone: true,
  imports: [KjMenuContent],
  template: `<div kjMenuContent class="kj-menu-content"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuContentComponent {}

/** Menu item. `KjMenuItem` does not expose `kjDisabled` via hostDirectives, so disabling uses only `[disabled]` + `aria-disabled` (handled by the browser). */
@Component({
  selector: 'kj-menu-item',
  standalone: true,
  imports: [KjMenuItem],
  template: `<button type="button" kjMenuItem class="kj-menu-item" [disabled]="disabled() || null"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenuItemComponent {
  readonly disabled = input(false);
}

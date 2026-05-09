import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  KjPopoverTrigger,
  KjPopoverContent,
  KjPopoverArrow,
  KjPopoverClose,
  KjPopoverTitle,
} from '@kouji-ui/core';

export {
  KjPopoverTrigger,
  KjPopoverContent,
  KjPopoverArrow,
  KjPopoverClose,
  KjPopoverTitle,
} from '@kouji-ui/core';

/**
 * Click-triggered popover. Compose `[kjPopoverTrigger]` + `<kj-popover-content [kjFor]="t">`
 * with optional `[kjPopoverTitle]` heading and `[kjPopoverClose]` button. The
 * wrapper itself only projects content — its purpose is to host the docs tags.
 *
 * @doc-name Popover
 * @doc-is-main
 * @doc-example Default
 *   @doc-file popover.example.ts
 * @doc-example Sides
 *   @doc-file popover.sides.example.ts
 * @doc-example Modal
 *   @doc-file popover.modal.example.ts
 * @doc-example Cancellable
 *   @doc-file popover.cancellable.example.ts
 * @doc-example With form
 *   @doc-file popover.with-form.example.ts
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-popover',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverArrow, KjPopoverClose, KjPopoverTitle],
  template: `<ng-content />`,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverComponent {}

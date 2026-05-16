import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ColumnDef, RoadmapItem } from './roadmap-data';
import { RoadmapCard } from './roadmap-card';

@Component({
  selector: 'kj-roadmap-column',
  standalone: true,
  imports: [RoadmapCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-status]': 'col().id',
  },
  template: `
    <div class="head">
      <div class="title">
        <span class="label">{{ col().label }}</span>
        <span class="count">
          {{ items().length }}
          @if (items().length !== total()) {
            <span class="count-total"> / {{ total() }}</span>
          }
        </span>
      </div>
      <span class="sub">{{ col().sub }}</span>
    </div>

    @if (items().length === 0) {
      <div class="empty">nothing here right now</div>
    } @else {
      @for (item of items(); track item.id) {
        <kj-roadmap-card
          [item]="item"
          [open]="expanded().has(item.id)"
          (toggle)="toggleExpand.emit(item.id)"
        />
      }
    }
  `,
  styles: `
    /* Spacing rule: --kj-base-space-* tokens only.
       Token table: xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32 / 3xl 48. */
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--kj-base-space-md);
    }

    .head {
      display: flex;
      flex-direction: column;
      gap: var(--kj-base-space-xs);
      padding: var(--kj-base-space-md) var(--kj-base-space-xs);
      border-bottom: 2px solid var(--kj-border-default);
      margin-bottom: var(--kj-base-space-xs);
      /* Sticks right below the page's .rm-chrome (stats + toolbar). The
         offset is published as --rm-chrome-h by RoadmapPage's afterNextRender
         + ResizeObserver, so the head adapts when the toolbar wraps. */
      position: sticky;
      top: var(--rm-chrome-h, 8.5rem);
      background-color: var(--kj-bg-body);
      z-index: 10;
    }
    .title {
      display: flex;
      align-items: baseline;
      gap: var(--kj-base-space-sm);
    }
    .label {
      font-family: var(--kj-font-display);
      font-weight: var(--kj-display-weight);
      font-style: var(--kj-display-italic);
      font-size: 1.375rem;
      letter-spacing: var(--kj-letter-spacing);
      color: var(--kj-fg-default);
    }
    .count {
      font-family: var(--kj-font-mono);
      font-size: 0.6875rem;
      color: var(--kj-fg-muted);
      font-variant-numeric: tabular-nums;
      margin-left: auto;
      padding: var(--kj-base-space-xs) var(--kj-base-space-sm);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      background-color: var(--kj-bg-surface);
    }
    .count-total { opacity: 0.5; }
    .sub {
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      color: var(--kj-fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    /* Per-status color accents on the head. */
    :host([data-status="wip"]) .label    { color: var(--kj-fg-primary); }
    :host([data-status="wip"]) .head     { border-bottom-color: var(--kj-bg-primary); }
    :host([data-status="shipped"]) .label { color: var(--kj-fg-accent); }
    :host([data-status="shipped"]) .head  { border-bottom-color: var(--kj-bg-accent); }

    .empty {
      padding: var(--kj-base-space-2xl) var(--kj-base-space-lg);
      text-align: center;
      font-family: var(--kj-font-mono);
      font-size: 0.6875rem;
      color: var(--kj-fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      background-color: var(--kj-bg-surface);
      border: 1px dashed var(--kj-border-default);
      border-radius: var(--kj-radius-field);
    }
  `,
})
export class RoadmapColumn {
  readonly col = input.required<ColumnDef>();
  readonly items = input.required<readonly RoadmapItem[]>();
  readonly total = input.required<number>();
  readonly expanded = input.required<ReadonlySet<string>>();
  readonly toggleExpand = output<string>();
}

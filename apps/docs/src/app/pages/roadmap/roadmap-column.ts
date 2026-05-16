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
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .head {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 4px;
      border-bottom: 2px solid var(--kj-border-default);
      margin-bottom: 4px;
      /* Sticks at top: stats(60) + toolbar(60) = 120 in the page scroller. */
      position: sticky;
      top: 120px;
      background-color: var(--kj-bg-body);
      z-index: 10;
    }
    .title {
      display: flex;
      align-items: baseline;
      gap: 8px;
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
      padding: 2px 8px;
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
      padding: 32px 16px;
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

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
    'class': 'rm-column',
    '[attr.data-status]': 'col().id',
  },
  template: `
    <div class="rm-column-head">
      <div class="rm-column-title">
        <span class="rm-column-label">{{ col().label }}</span>
        <span class="rm-column-count">
          {{ items().length }}
          @if (items().length !== total()) {
            <span style="opacity:0.5"> / {{ total() }}</span>
          }
        </span>
      </div>
      <span class="rm-column-sub">{{ col().sub }}</span>
    </div>

    @if (items().length === 0) {
      <div class="rm-empty">nothing here right now</div>
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
})
export class RoadmapColumn {
  readonly col = input.required<ColumnDef>();
  readonly items = input.required<readonly RoadmapItem[]>();
  readonly total = input.required<number>();
  readonly expanded = input.required<ReadonlySet<string>>();
  readonly toggleExpand = output<string>();
}

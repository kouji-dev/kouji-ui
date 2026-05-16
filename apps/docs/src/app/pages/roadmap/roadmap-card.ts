import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RoadmapItem } from './roadmap-data';

@Component({
  selector: 'kj-roadmap-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'rm-card',
    'role': 'button',
    'tabindex': '0',
    '[class.open]': 'open()',
    '[attr.aria-expanded]': 'open()',
    '(click)': 'toggle.emit()',
    '(keydown.enter)': 'onKey($event)',
    '(keydown.space)': 'onKey($event)',
  },
  template: `
    <div class="rm-card-meta">
      <span class="rm-card-version">{{ item().version }}</span>
      <span class="sep">·</span>
      <span>{{ item().date }}</span>
    </div>

    <h3 class="rm-card-title">
      @if (item().candidate) {
        <span class="rm-candidate" title="candidate for upcoming version">candidate</span>
      }
      {{ item().title }}
    </h3>
    <p class="rm-card-desc">{{ item().description }}</p>

    @if (progressPct() !== null) {
      <div
        class="rm-progress"
        role="progressbar"
        [attr.aria-valuenow]="progressPct()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="'Progress ' + progressPct() + '%'"
      >
        <div class="rm-progress-fill" [style.width.%]="progressPct()"></div>
      </div>
    }

    @if (item().candor) {
      <span class="rm-candor">{{ item().candor }}</span>
    }

    <div class="rm-card-foot">
      <span class="rm-cat" [attr.data-cat]="item().category">{{ item().category }}</span>
      <span class="rm-issues">
        <span title="open issues">{{ item().issues }}↯</span>
        @if (item().prs > 0) {
          <span title="open pull requests">{{ item().prs }}⤴</span>
        }
      </span>
    </div>

    <div class="rm-card-details">
      <div>
        <p class="rm-card-long">{{ item().longDesc }}</p>
        <div class="rm-card-link-row">
          <a class="rm-card-link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
            {{ item().issues }} issues ↗
          </a>
          @if (item().prs > 0) {
            <a class="rm-card-link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
              {{ item().prs }} PRs ↗
            </a>
          }
          <a class="rm-card-link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
            rfc thread ↗
          </a>
        </div>
      </div>
    </div>
  `,
})
export class RoadmapCard {
  readonly item = input.required<RoadmapItem>();
  readonly open = input.required<boolean>();
  readonly toggle = output<void>();

  protected readonly progressPct = computed<number | null>(() => {
    const p = this.item().progress;
    return p == null ? null : Math.round(p * 100);
  });

  protected onKey(event: Event): void {
    event.preventDefault();
    this.toggle.emit();
  }
}

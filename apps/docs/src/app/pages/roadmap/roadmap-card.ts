import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  KjBadgeComponent,
  KjProgressBarComponent,
} from '@kouji-ui/components';
import { RoadmapItem } from './roadmap-data';

@Component({
  selector: 'kj-roadmap-card',
  standalone: true,
  imports: [KjBadgeComponent, KjProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'button',
    'tabindex': '0',
    '[class.open]': 'open()',
    '[class.candidate]': 'item().candidate',
    '[attr.aria-expanded]': 'open()',
    '(click)': 'toggle.emit()',
    '(keydown.enter)': 'onKey($event)',
    '(keydown.space)': 'onKey($event)',
  },
  template: `
    <div class="meta">
      <span class="version">{{ item().version }}</span>
      <span class="sep">·</span>
      <span>{{ item().date }}</span>
    </div>

    <h3 class="title">
      @if (item().candidate) {
        <kj-badge kjVariant="outline" class="candidate-badge" title="candidate for upcoming version">
          candidate
        </kj-badge>
      }
      {{ item().title }}
    </h3>
    <p class="desc">{{ item().description }}</p>

    @if (progressPct() !== null) {
      <kj-progress-bar
        class="progress"
        [kjValue]="progressPct() ?? 0"
        [kjAriaLabel]="'Progress ' + progressPct() + '%'"
      />
    }

    @if (item().candor) {
      <span class="candor">{{ item().candor }}</span>
    }

    <div class="foot">
      <span class="cat" [attr.data-cat]="item().category">{{ item().category }}</span>
    </div>

    <div class="details">
      <div>
        <p class="long">{{ item().longDesc }}</p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--kj-base-space-sm);
      background-color: var(--kj-bg-surface);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      padding: var(--kj-base-space-md) var(--kj-base-space-lg);
      cursor: pointer;
      box-shadow: var(--kj-shadow-md);
      transition: transform .15s cubic-bezier(.34,1.56,.64,1), border-color .15s ease;
    }
    :host(:hover) { border-color: var(--kj-bg-primary); transform: translateY(-2px); }
    :host(.open)  { border-color: var(--kj-bg-primary); }
    :host(:focus-visible) {
      outline: 2px solid var(--kj-border-focus);
      outline-offset: 2px;
    }
    :host(.candidate) { border-left: 3px solid var(--kj-bg-accent); }

    .meta {
      display: flex;
      align-items: center;
      gap: var(--kj-base-space-sm);
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      color: var(--kj-fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .version { color: var(--kj-fg-default); font-weight: 700; }
    .meta .sep { opacity: 0.4; }

    .title {
      font-family: var(--kj-font-sans);
      font-weight: 700;
      font-size: var(--kj-text-sm);
      letter-spacing: -0.01em;
      color: var(--kj-fg-default);
      line-height: 1.3;
      margin: 0;
      display: flex;
      align-items: center;
      gap: var(--kj-base-space-sm);
      flex-wrap: wrap;
    }
    .desc {
      font-family: var(--kj-font-sans);
      font-size: var(--kj-text-xs);
      line-height: 1.45;
      color: var(--kj-fg-muted);
      margin: 0;
    }

    /* Tighter / louder candidate badge variant */
    .candidate-badge {
      background-color: var(--kj-bg-accent);
      color: var(--kj-fg-on-primary);
      border-color: var(--kj-bg-accent);
    }

    .foot {
      display: flex;
      align-items: center;
      gap: var(--kj-base-space-sm);
      margin-top: var(--kj-base-space-xs);
    }
    /* Category badge keeps the colored dot prefix — kj-tag/badge don't ship a
       slot for that so we render a small custom pill. */
    /* Category pill — sized to match kj-tag's "sm" density (12px font,
       sm/md padding) so it visually pairs with the toolbar's filter chips. */
    .cat {
      display: inline-flex;
      align-items: center;
      gap: var(--kj-base-space-xs);
      padding: var(--kj-base-space-xs) var(--kj-base-space-md);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      font-family: var(--kj-font-mono);
      font-size: var(--kj-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--kj-fg-default);
      background-color: var(--kj-bg-elevated);
    }
    .cat::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--kj-bg-primary);
    }
    .cat[data-cat="component"]::before { background-color: var(--kj-bg-primary); }
    .cat[data-cat="theme"]::before     { background-color: var(--kj-bg-accent); }
    .cat[data-cat="a11y"]::before      { background-color: #00b06b; }
    .cat[data-cat="perf"]::before      { background-color: #88c0d0; }
    .cat[data-cat="docs"]::before      { background-color: #d4a017; }

    .issues {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: var(--kj-base-space-sm);
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      color: var(--kj-fg-muted);
    }
    .issues span { font-variant-numeric: tabular-nums; }

    .progress { width: 100%; margin-top: var(--kj-base-space-xs); }

    .candor {
      display: block;
      margin-top: var(--kj-base-space-xs);
      padding: var(--kj-base-space-sm) var(--kj-base-space-md);
      background-color: var(--kj-bg-elevated);
      border-left: 2px solid var(--kj-bg-accent);
      font-family: var(--kj-font-sans);
      font-size: 0.6875rem;
      font-style: italic;
      color: var(--kj-fg-muted);
      line-height: 1.4;
    }
    .candor::before {
      content: "✱ ";
      color: var(--kj-fg-accent);
      font-style: normal;
      margin-right: var(--kj-base-space-xs);
    }

    .details {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows .25s cubic-bezier(.4, 0, .2, 1);
    }
    :host(.open) .details { grid-template-rows: 1fr; }
    .details > div { overflow: hidden; }
    .long {
      font-family: var(--kj-font-sans);
      font-size: var(--kj-text-xs);
      line-height: 1.5;
      color: var(--kj-fg-default);
      margin: var(--kj-base-space-sm) 0 var(--kj-base-space-xs);
      padding-top: var(--kj-base-space-sm);
      border-top: 1px solid var(--kj-border-default);
    }
    .link-row {
      display: flex;
      gap: var(--kj-base-space-md);
      flex-wrap: wrap;
      margin-top: var(--kj-base-space-sm);
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      text-transform: lowercase;
    }
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

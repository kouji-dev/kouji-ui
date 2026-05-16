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
        <span class="candidate-badge" title="candidate for upcoming version">candidate</span>
      }
      {{ item().title }}
    </h3>
    <p class="desc">{{ item().description }}</p>

    @if (progressPct() !== null) {
      <div
        class="progress"
        role="progressbar"
        [attr.aria-valuenow]="progressPct()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="'Progress ' + progressPct() + '%'"
      >
        <div class="progress-fill" [style.width.%]="progressPct()"></div>
      </div>
    }

    @if (item().candor) {
      <span class="candor">{{ item().candor }}</span>
    }

    <div class="foot">
      <span class="cat" [attr.data-cat]="item().category">{{ item().category }}</span>
      <span class="issues">
        <span title="open issues">{{ item().issues }}↯</span>
        @if (item().prs > 0) {
          <span title="open pull requests">{{ item().prs }}⤴</span>
        }
      </span>
    </div>

    <div class="details">
      <div>
        <p class="long">{{ item().longDesc }}</p>
        <div class="link-row">
          <a class="link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
            {{ item().issues }} issues ↗
          </a>
          @if (item().prs > 0) {
            <a class="link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
              {{ item().prs }} PRs ↗
            </a>
          }
          <a class="link" href="#" (click)="$event.preventDefault(); $event.stopPropagation()">
            rfc thread ↗
          </a>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background-color: var(--kj-bg-surface);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      padding: 14px 16px;
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
      gap: 6px;
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
    }
    .desc {
      font-family: var(--kj-font-sans);
      font-size: var(--kj-text-xs);
      line-height: 1.45;
      color: var(--kj-fg-muted);
      margin: 0;
    }

    .candidate-badge {
      display: inline-block;
      margin-right: 6px;
      padding: 1px 6px;
      background-color: var(--kj-bg-accent);
      color: var(--kj-fg-on-primary);
      font-family: var(--kj-font-mono);
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      border-radius: 2px;
      vertical-align: 2px;
    }

    .foot {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }
    .cat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      font-family: var(--kj-font-mono);
      font-size: 0.5625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--kj-fg-default);
      background-color: var(--kj-bg-elevated);
    }
    .cat::before {
      content: "";
      width: 5px;
      height: 5px;
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
      gap: 8px;
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      color: var(--kj-fg-muted);
    }
    .issues span { font-variant-numeric: tabular-nums; }

    .progress {
      width: 100%;
      height: 4px;
      background-color: var(--kj-bg-elevated);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background-color: var(--kj-bg-primary);
      transition: width .35s ease;
    }

    .candor {
      display: block;
      margin-top: 2px;
      padding: 8px 10px;
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
      margin-right: 2px;
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
      margin: 8px 0 4px;
      padding-top: 8px;
      border-top: 1px solid var(--kj-border-default);
    }
    .link-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .link {
      appearance: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background-color: var(--kj-bg-body);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field);
      color: var(--kj-fg-default);
      font-family: var(--kj-font-mono);
      font-size: 0.625rem;
      text-transform: lowercase;
      text-decoration: none;
      cursor: pointer;
    }
    .link:hover { border-color: var(--kj-bg-primary); color: var(--kj-fg-primary); }
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

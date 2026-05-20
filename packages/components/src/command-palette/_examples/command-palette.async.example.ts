import { Component, effect, signal } from '@angular/core';
import { KjButtonComponent } from '../../button/button';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
  KjCommandPaletteItemTemplate,
} from '../command-palette';

interface SearchResult {
  id: string;
  label: string;
}

const ALL_RESULTS: SearchResult[] = [
  { id: 'ng-docs', label: 'Angular Documentation' },
  { id: 'ng-signals', label: 'Angular Signals Guide' },
  { id: 'ng-forms', label: 'Angular Forms' },
  { id: 'ng-routing', label: 'Angular Routing' },
  { id: 'ng-di', label: 'Angular Dependency Injection' },
];

/**
 * Async-search pattern using `[kjItems]` + `<ng-template kjCommandPaletteItemTemplate>`.
 * `kjShouldFilter="false"` delegates filtering to the consumer; results
 * update after a simulated 300ms delay.
 */
@Component({
  selector: 'kj-command-palette-async-example',
  standalone: true,
  imports: [
    KjCommandPaletteComponent,
    KjCommandItemComponent,
    KjCommandPaletteItemTemplate,
    KjButtonComponent,
  ],
  styles: [`:host { display: flex; flex-direction: column; gap: var(--kj-space-md); align-items: flex-start; min-height: 16rem; }
  .activated { font-family: var(--kj-font-mono); font-size: 0.75rem; color: var(--kj-fg-muted); }`],
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">Search Angular docs…</kj-button>

    @if (lastActivated()) {
      <p class="activated">Activated: <strong>{{ lastActivated() }}</strong></p>
    }

    <kj-command-palette
      [(kjOpen)]="open"
      [(kjQuery)]="query"
      [kjShouldFilter]="false"
      [kjLoading]="loading()"
      [kjItems]="results()"
      kjPlaceholder="Search Angular docs…"
      (kjActivate)="lastActivated.set($any($event).value)"
    >
      <ng-template kjCommandPaletteItemTemplate let-result>
        <kj-command-item [kjValue]="result.id">{{ result.label }}</kj-command-item>
      </ng-template>
    </kj-command-palette>
  `,
})
export class KjCommandPaletteAsyncExample {
  readonly open = signal(false);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly results = signal<SearchResult[]>(ALL_RESULTS);
  readonly lastActivated = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const q = this.query();
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.loading.set(true);
      this.results.set([]);
      this.searchTimer = setTimeout(() => {
        const filtered = ALL_RESULTS.filter(r =>
          r.label.toLowerCase().includes(q.toLowerCase())
        );
        this.results.set(filtered);
        this.loading.set(false);
      }, 300);
    });
  }
}

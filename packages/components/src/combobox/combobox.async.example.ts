import { Component, signal, effect } from '@angular/core';
import {
  KjComboboxComponent,
  KjComboboxOptionComponent,
  KjComboboxLoadingComponent,
  KjComboboxEmptyComponent,
} from './combobox';

const ALL_USERS = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Brian Kernighan' },
  { id: 4, name: 'Dennis Ritchie' },
  { id: 5, name: 'Donald Knuth' },
  { id: 6, name: 'Edsger Dijkstra' },
  { id: 7, name: 'Grace Hopper' },
  { id: 8, name: 'Ken Thompson' },
  { id: 9, name: 'Linus Torvalds' },
  { id: 10, name: 'Margaret Hamilton' },
];

/**
 * Async / consumer-driven search example — debounced fetch with loading
 * and empty states. Shows the pattern of `[shouldFilter]="false"` plus a
 * `(queryChange)` handler that performs the filter / fetch.
 */
@Component({
  selector: 'kj-combobox-async-example',
  standalone: true,
  imports: [
    KjComboboxComponent,
    KjComboboxOptionComponent,
    KjComboboxLoadingComponent,
    KjComboboxEmptyComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-combobox
      [(value)]="user"
      [(query)]="query"
      [shouldFilter]="false"
      [loading]="loading()"
      placeholder="Search users…">
      @for (u of results(); track u.id) {
        <kj-combobox-option [value]="u.name">{{ u.name }}</kj-combobox-option>
      }
      <kj-combobox-loading>Searching…</kj-combobox-loading>
      <kj-combobox-empty>No users found.</kj-combobox-empty>
    </kj-combobox>
  `,
})
export class KjComboboxAsyncExample {
  readonly user = signal<string | null>(null);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly results = signal<typeof ALL_USERS>([]);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const q = this.query();
      if (this.timer) clearTimeout(this.timer);
      if (!q) {
        this.results.set([]);
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.timer = setTimeout(() => {
        const needle = q.toLowerCase();
        this.results.set(ALL_USERS.filter(u => u.name.toLowerCase().includes(needle)));
        this.loading.set(false);
      }, 250);
    });
  }
}

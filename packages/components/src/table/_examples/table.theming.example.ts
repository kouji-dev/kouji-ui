import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

const ROWS: User[] = [
  { id: '1', name: 'Alice', email: 'alice@x.io', role: 'Admin'  },
  { id: '2', name: 'Bob',   email: 'bob@x.io',   role: 'Editor' },
  { id: '3', name: 'Carol', email: 'carol@x.io', role: 'Viewer' },
  { id: '4', name: 'Dan',   email: 'dan@x.io',   role: 'Viewer' },
];

/**
 * The same table stacked three times under `bordered`, `striped`, and `clean`
 * variants to compare how the theme tokens render each style. The variant
 * value is reflected on the host as `[attr.data-variant]`.
 *
 */
@Component({
  selector: 'kj-table-theming-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`
    :host { display: block; }
    section { margin-bottom: 1rem; }
    h4 {
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--kj-base-color-text-subtle, #666);
    }
  `],
  template: `
    @for (v of variants; track v) {
      <section>
        <h4>{{ v }}</h4>
        <kj-table
          [kjData]="data()"
          [kjColumns]="cols"
          [kjVariant]="v"
        />
      </section>
    }
  `,
})
export class KjTableThemingExample {
  protected readonly variants = ['bordered', 'striped', 'clean'] as const;
  protected readonly data = signal<User[]>(ROWS);

  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name',  header: 'Name'  }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ accessorKey: 'role',  header: 'Role'  }),
  ];
}

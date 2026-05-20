import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjButtonGroupComponent } from '../../button-group/button-group';
import { KjButtonComponent } from '../../button/button';

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
];

type Density = 'compact' | 'standard' | 'comfortable';

/**
 * Density toggle: a `<kj-button-group>` of three `<kj-button kjPressed>`
 * options writes the current density into a signal which the host table
 * binds via `[kjDensity]`. Using styled Kj* primitives keeps the pressed
 * state consistent with the rest of the theme (focus ring, tokens, AAA
 * contrast) — no native `<button>` chrome to hand-roll.
 */
@Component({
  selector: 'kj-table-density-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjButtonGroupComponent, KjButtonComponent],
  styles: [`
    :host { display: block; }
    kj-button-group { margin-bottom: var(--kj-space-md, 0.75rem); }
  `],
  template: `
    <kj-button-group kjAriaLabel="Row density">
      @for (d of densities; track d) {
        <kj-button
          kjVariant="outline"
          kjSize="sm"
          [kjPressed]="density() === d"
          (click)="density.set(d)"
        >{{ d }}</kj-button>
      }
    </kj-button-group>

    <kj-table
      [kjData]="data()"
      [kjColumns]="cols"
      [kjDensity]="density()"
    />
  `,
})
export class KjTableDensityExample {
  protected readonly densities: readonly Density[] = ['compact', 'standard', 'comfortable'];
  protected readonly density = signal<Density>('standard');
  protected readonly data = signal<User[]>(ROWS);

  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name',  header: 'Name'  }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ accessorKey: 'role',  header: 'Role'  }),
  ];
}

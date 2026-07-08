import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from './table';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

/**
 * Playground state — module-scope signals. Tunes the visual density, the
 * variant token, and the page size on a small static `<kj-table>` so the
 * host API can be previewed without wiring a data source.
 */
const density = signal<'compact' | 'standard' | 'comfortable'>('standard');
const variant = signal<'bordered' | 'striped' | 'clean'>('bordered');
const pageSize = signal<number | 'all'>('all');

@Component({
  selector: 'kj-table-playground',
  standalone: true,
  imports: [KjTableComponent],
  template: `
    <kj-table
      [kjData]="rows"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      [kjDensity]="density()"
      [kjVariant]="variant()"
      [kjPageSize]="pageSize()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTablePlaygroundDemo {
  protected readonly density = density;
  protected readonly variant = variant;
  protected readonly pageSize = pageSize;

  protected readonly rows: User[] = [
    { id: '1', name: 'Alice Chen',  email: 'alice@example.com', role: 'admin'  },
    { id: '2', name: 'Bob Diaz',    email: 'bob@example.com',   role: 'editor' },
    { id: '3', name: 'Carol Evans', email: 'carol@example.com', role: 'viewer' },
    { id: '4', name: 'Dan Fischer', email: 'dan@example.com',   role: 'editor' },
    { id: '5', name: 'Eve Garcia',  email: 'eve@example.com',   role: 'admin'  },
    { id: '6', name: 'Frank Hunt',  email: 'frank@example.com', role: 'viewer' },
  ];

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name',  accessorKey: 'name',  header: 'Name'  }),
    kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ id: 'role',  accessorKey: 'role',  header: 'Role'  }),
  ];

  protected readonly getRowId = (row: User): string => row.id;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTablePlaygroundDemo,
  state: {
    density: density as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    pageSize: pageSize as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'density',
      label: 'density',
      options: ['compact', 'standard', 'comfortable'],
    },
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['bordered', 'striped', 'clean'],
    },
    { kind: 'chips', name: 'pageSize', label: 'page size', options: [3, 6, 'all'] },
  ],
  snippet: (values) => {
    const s = values as { density: string; variant: string; pageSize: number | string };
    return `<kj-table\n  [kjData]="rows"\n  [kjColumns]="cols"\n  kjDensity="${s.density}"\n  kjVariant="${s.variant}"\n  [kjPageSize]="${typeof s.pageSize === 'number' ? s.pageSize : `'${s.pageSize}'`}"\n/>`;
  },
};

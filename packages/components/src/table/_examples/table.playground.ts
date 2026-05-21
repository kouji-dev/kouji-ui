import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

const PLAYGROUND_ROWS: User[] = [
  { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin' },
  { id: '2', name: 'Bob Diaz', email: 'bob@example.com', role: 'editor' },
  { id: '3', name: 'Carol Evans', email: 'carol@example.com', role: 'viewer' },
  { id: '4', name: 'Dan Fischer', email: 'dan@example.com', role: 'editor' },
  { id: '5', name: 'Eve Garcia', email: 'eve@example.com', role: 'admin' },
  { id: '6', name: 'Finn Hayes', email: 'finn@example.com', role: 'viewer' },
];

const PLAYGROUND_COLS: KjColumnDef<User>[] = [
  kjColumn<User>({ id: 'name', accessorKey: 'name', header: 'Name' }),
  kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
  kjColumn<User>({ id: 'role', accessorKey: 'role', header: 'Role' }),
];

/**
 * Playground state — module-scope signals. The demo component reads them via
 * its template; the snippet fn reads them via the engine-supplied `values`
 * arg; the engine writes them via {@link PLAYGROUND.state}.
 */
const density = signal<'compact' | 'standard' | 'comfortable'>('standard');
const variant = signal<'bordered' | 'striped' | 'clean'>('bordered');
const loading = signal(false);
const enableFilters = signal(false);
const enableResize = signal(false);
const enableRowPinning = signal(false);
const virtual = signal<'true' | 'false' | 'auto'>('auto');
const selectionMode = signal<'none' | 'single' | 'multi'>('none');

function virtualValue(v: 'true' | 'false' | 'auto'): boolean | 'auto' {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return 'auto';
}

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
      [kjLoading]="loading()"
      [kjEnableFilters]="enableFilters()"
      [kjEnableResize]="enableResize()"
      [kjEnableRowPinning]="enableRowPinning()"
      [kjVirtual]="virtualResolved()"
      [kjSelectionMode]="selectionMode()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTablePlayground {
  protected readonly rows = PLAYGROUND_ROWS;
  protected readonly cols = PLAYGROUND_COLS;
  protected readonly getRowId = (row: User): string => row.id;

  protected readonly density = density;
  protected readonly variant = variant;
  protected readonly loading = loading;
  protected readonly enableFilters = enableFilters;
  protected readonly enableResize = enableResize;
  protected readonly enableRowPinning = enableRowPinning;
  protected readonly selectionMode = selectionMode;

  protected readonly virtualResolved = (): boolean | 'auto' => virtualValue(virtual());
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTablePlayground,
  state: {
    density: density as unknown as WritableSignal<unknown>,
    variant: variant as unknown as WritableSignal<unknown>,
    loading: loading as unknown as WritableSignal<unknown>,
    enableFilters: enableFilters as unknown as WritableSignal<unknown>,
    enableResize: enableResize as unknown as WritableSignal<unknown>,
    enableRowPinning: enableRowPinning as unknown as WritableSignal<unknown>,
    virtual: virtual as unknown as WritableSignal<unknown>,
    selectionMode: selectionMode as unknown as WritableSignal<unknown>,
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
    {
      kind: 'chips',
      name: 'virtual',
      label: 'virtual',
      options: ['true', 'false', 'auto'],
    },
    {
      kind: 'chips',
      name: 'selectionMode',
      label: 'selection mode',
      options: ['none', 'single', 'multi'],
    },
    { kind: 'toggle', name: 'loading', label: 'loading' },
    { kind: 'toggle', name: 'enableFilters', label: 'filters' },
    { kind: 'toggle', name: 'enableResize', label: 'resize' },
    { kind: 'toggle', name: 'enableRowPinning', label: 'row pinning' },
  ],
  snippet: (values) => {
    const s = values as {
      density: string;
      variant: string;
      loading: boolean;
      enableFilters: boolean;
      enableResize: boolean;
      enableRowPinning: boolean;
      virtual: string;
      selectionMode: string;
    };
    const attrs: string[] = [
      `kjDensity="${s.density}"`,
      `kjVariant="${s.variant}"`,
      `kjSelectionMode="${s.selectionMode}"`,
    ];
    if (s.virtual !== 'auto') {
      attrs.push(`[kjVirtual]="${s.virtual}"`);
    } else {
      attrs.push(`kjVirtual="auto"`);
    }
    if (s.loading) attrs.push('[kjLoading]="true"');
    if (s.enableFilters) attrs.push('[kjEnableFilters]="true"');
    if (s.enableResize) attrs.push('[kjEnableResize]="true"');
    if (s.enableRowPinning) attrs.push('[kjEnableRowPinning]="true"');
    return `<kj-table\n  [kjData]="rows()"\n  [kjColumns]="cols"\n  ${attrs.join('\n  ')}\n/>`;
  },
};

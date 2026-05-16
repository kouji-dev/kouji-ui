import { describe, expect, it } from 'vitest';
import { kjColumn, kjColumnGroup } from './column-helpers';
import type { KjColumnDef } from './table.types';

interface User { id: string; name: string; email: string; age: number; }

describe('kjColumn', () => {
  it('returns a ColumnDef compatible with TanStack', () => {
    const col = kjColumn<User>({ accessorKey: 'name', header: 'Name' });
    expect(col.accessorKey).toBe('name');
    expect(col.header).toBe('Name');
  });

  it('hoists kj* knobs into meta.kj', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      kjType: 'text',
      kjEditable: true,
      kjPin: 'left',
    });
    expect((col.meta as any)?.kj).toEqual({
      type: 'text',
      editable: true,
      pin: 'left',
    });
    // top-level kj* fields are stripped — TanStack sees only its native fields.
    expect((col as any).kjType).toBeUndefined();
    expect((col as any).kjEditable).toBeUndefined();
  });

  it('preserves existing meta', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      meta: { foo: 'bar' } as any,
      kjEditable: true,
    });
    expect((col.meta as any).foo).toBe('bar');
    expect((col.meta as any).kj.editable).toBe(true);
  });

  it('omits meta.kj when no kj* knobs are passed', () => {
    const col = kjColumn<User>({ accessorKey: 'name' });
    expect((col.meta as any)?.kj).toBeUndefined();
  });
});

describe('kjColumnGroup', () => {
  it('returns a group column def with nested columns', () => {
    const grp = kjColumnGroup<User>({
      header: 'Identity',
      columns: [
        kjColumn<User>({ accessorKey: 'name' }),
        kjColumn<User>({ accessorKey: 'email' }),
      ],
    });
    expect(grp.header).toBe('Identity');
    expect((grp as any).columns).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import { kjColumn, kjColumnGroup } from './column-helpers';

interface User { id: string; name: string; email: string; age: number; }
type AnyRec = Record<string, unknown>;

/**
 * TanStack's `ColumnDef` is a discriminated union whose members carry no index
 * signature, so a field the helper writes (`accessorKey`, `filterFn`, the
 * stripped `kj*` knobs) is not readable off the static type. The helpers under
 * test produce plain objects, so the spec reads them structurally.
 */
const rec = (v: unknown): AnyRec | undefined => v as AnyRec | undefined;

describe('kjColumn', () => {
  it('returns a ColumnDef compatible with TanStack', () => {
    const col = kjColumn<User>({ accessorKey: 'name', header: 'Name' });
    expect(rec(col)?.['accessorKey']).toBe('name');
    expect(col.header).toBe('Name');
  });

  it('hoists kj* knobs into meta.kj', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      kjType: 'text',
      kjEditable: true,
      kjPin: 'left',
    });
    expect(rec(col.meta)?.['kj']).toEqual({
      type: 'text',
      editable: true,
      pin: 'left',
    });
    // top-level kj* fields are stripped — TanStack sees only its native fields.
    expect(rec(col)?.['kjType']).toBeUndefined();
    expect(rec(col)?.['kjEditable']).toBeUndefined();
  });

  it('preserves existing meta', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      meta: { foo: 'bar' } as AnyRec,
      kjEditable: true,
    });
    expect(rec(col.meta)?.['foo']).toBe('bar');
    expect(rec(rec(col.meta)?.['kj'])?.['editable']).toBe(true);
  });

  it('omits meta.kj when no kj* knobs are passed', () => {
    const col = kjColumn<User>({ accessorKey: 'name' });
    expect(rec(col.meta)?.['kj']).toBeUndefined();
  });

  it('auto-wires filterFn from kjType so the built-in filter UIs round-trip', () => {
    const text   = kjColumn<User>({ accessorKey: 'name',  kjType: 'text'   });
    const number = kjColumn<User>({ accessorKey: 'age',   kjType: 'number' });
    const sel    = kjColumn<User>({ accessorKey: 'email', kjType: 'select' });
    expect(typeof rec(text)?.['filterFn']).toBe('function');
    expect(typeof rec(number)?.['filterFn']).toBe('function');
    expect(typeof rec(sel)?.['filterFn']).toBe('function');
  });

  it('respects a user-supplied filterFn over the auto-wired default', () => {
    const custom = () => true;
    const col = kjColumn<User>({ accessorKey: 'age', kjType: 'number', filterFn: custom });
    expect(rec(col)?.['filterFn']).toBe(custom);
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
    expect(rec(grp)?.['columns']).toHaveLength(2);
  });
});

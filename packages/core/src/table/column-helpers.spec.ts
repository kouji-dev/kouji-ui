import { describe, expect, it } from 'vitest';
import { kjColumn, kjColumnGroup } from './column-helpers';

interface User { id: string; name: string; email: string; age: number; }
type AnyRec = Record<string, unknown>;

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
    expect((col.meta as AnyRec)?.kj).toEqual({
      type: 'text',
      editable: true,
      pin: 'left',
    });
    // top-level kj* fields are stripped — TanStack sees only its native fields.
    expect((col as AnyRec).kjType).toBeUndefined();
    expect((col as AnyRec).kjEditable).toBeUndefined();
  });

  it('preserves existing meta', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      meta: { foo: 'bar' } as AnyRec,
      kjEditable: true,
    });
    expect((col.meta as AnyRec).foo).toBe('bar');
    expect(((col.meta as AnyRec).kj as AnyRec).editable).toBe(true);
  });

  it('omits meta.kj when no kj* knobs are passed', () => {
    const col = kjColumn<User>({ accessorKey: 'name' });
    expect((col.meta as AnyRec)?.kj).toBeUndefined();
  });

  it('auto-wires filterFn from kjType so the built-in filter UIs round-trip', () => {
    const text   = kjColumn<User>({ accessorKey: 'name',  kjType: 'text'   });
    const number = kjColumn<User>({ accessorKey: 'age',   kjType: 'number' });
    const sel    = kjColumn<User>({ accessorKey: 'email', kjType: 'select' });
    expect(typeof (text as AnyRec).filterFn).toBe('function');
    expect(typeof (number as AnyRec).filterFn).toBe('function');
    expect(typeof (sel as AnyRec).filterFn).toBe('function');
  });

  it('respects a user-supplied filterFn over the auto-wired default', () => {
    const custom = () => true;
    const col = kjColumn<User>({ accessorKey: 'age', kjType: 'number', filterFn: custom });
    expect((col as AnyRec).filterFn).toBe(custom);
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
    expect((grp as AnyRec).columns).toHaveLength(2);
  });
});

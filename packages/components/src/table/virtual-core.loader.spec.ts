import { describe, expect, it } from 'vitest';
import { loadVirtualCore, resolveVirtualCore, type KjVirtualCore } from './virtual-core.loader';

describe('virtual-core loader (optional peer)', () => {
  it('names the missing peer and the install command when the import fails', async () => {
    const cause = new Error("Cannot find module '@tanstack/virtual-core'");
    const failing = resolveVirtualCore(() => Promise.reject(cause));
    await expect(failing).rejects.toThrow(/optional peer dependency of @kouji-ui\/components/);
    await expect(failing).rejects.toThrow(/pnpm add @tanstack\/virtual-core/);
    await expect(failing).rejects.toMatchObject({ cause });
  });

  it('passes a successful import through untouched', async () => {
    const fake = { Virtualizer: class {} } as unknown as KjVirtualCore;
    await expect(resolveVirtualCore(() => Promise.resolve(fake))).resolves.toBe(fake);
  });

  it('imports the installed peer once and memoises it', async () => {
    const first = loadVirtualCore();
    expect(loadVirtualCore()).toBe(first);
    const core = await first;
    expect(typeof core.Virtualizer).toBe('function');
    expect(typeof core.observeElementRect).toBe('function');
  });
});

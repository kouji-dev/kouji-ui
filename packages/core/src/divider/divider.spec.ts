import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjDivider } from './divider';

expect.extend(toHaveNoViolations);

/**
 * Flush microtasks + the rAF that backs afterNextRender so the directive has
 * a chance to inspect host child nodes and update its with-content / isHr
 * signals.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('KjDivider', () => {
  describe('decorative (default)', () => {
    it('on <hr> host: aria-hidden="true" and no role', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      const host = container.querySelector('hr')!;
      expect(host).toHaveAttribute('aria-hidden', 'true');
      expect(host).not.toHaveAttribute('role');
    });

    it('on <div> host: aria-hidden="true" and no role', async () => {
      const { container } = await render(`<div kjDivider></div>`, { imports: [KjDivider] });
      await flushAfterNextRender();
      const host = container.querySelector('div')!;
      expect(host).toHaveAttribute('aria-hidden', 'true');
      expect(host).not.toHaveAttribute('role');
    });

    it('omits aria-orientation in decorative mode (even when vertical)', async () => {
      const { container } = await render(
        `<hr kjDivider [kjOrientation]="'vertical'" />`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('hr')!;
      expect(host).not.toHaveAttribute('aria-orientation');
    });
  });

  describe('structural mode', () => {
    it('on <div> host: role="separator" and no aria-hidden', async () => {
      const { container } = await render(
        `<div kjDivider [kjStructural]="true"></div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('div')!;
      expect(host).toHaveAttribute('role', 'separator');
      expect(host).not.toHaveAttribute('aria-hidden');
    });

    it('on <hr> host: relies on implicit role (no explicit role attr) and no aria-hidden', async () => {
      const { container } = await render(
        `<hr kjDivider [kjStructural]="true" />`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('hr')!;
      // <hr> has implicit role="separator" per HTML AAM; the directive must
      // NOT set role explicitly (would be redundant noise).
      expect(host).not.toHaveAttribute('role');
      expect(host).not.toHaveAttribute('aria-hidden');
    });

    it('vertical + structural: aria-orientation="vertical"', async () => {
      const { container } = await render(
        `<div kjDivider [kjStructural]="true" [kjOrientation]="'vertical'"></div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('div')!;
      expect(host).toHaveAttribute('aria-orientation', 'vertical');
      expect(host).toHaveAttribute('role', 'separator');
    });

    it('horizontal + structural: omits aria-orientation (spec default)', async () => {
      const { container } = await render(
        `<div kjDivider [kjStructural]="true" [kjOrientation]="'horizontal'"></div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('div')!;
      expect(host).not.toHaveAttribute('aria-orientation');
    });
  });

  describe('orientation reflection', () => {
    it('reflects data-orientation="horizontal" by default', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      expect(container.querySelector('hr')).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('reflects data-orientation="vertical" when kjOrientation="vertical"', async () => {
      const { container } = await render(
        `<hr kjDivider [kjOrientation]="'vertical'" />`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('hr')).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  describe('with-content auto-detection', () => {
    it('rule-only on <hr>: data-with-content="false"', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      expect(container.querySelector('hr')).toHaveAttribute('data-with-content', 'false');
    });

    it('empty <div>: data-with-content="false"', async () => {
      const { container } = await render(`<div kjDivider></div>`, { imports: [KjDivider] });
      await flushAfterNextRender();
      expect(container.querySelector('div')).toHaveAttribute('data-with-content', 'false');
    });

    it('<div> with text content: data-with-content="true"', async () => {
      const { container } = await render(
        `<div kjDivider>OR</div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('div')).toHaveAttribute('data-with-content', 'true');
    });

    it('<div> with element content: data-with-content="true"', async () => {
      const { container } = await render(
        `<div kjDivider><span>OR</span></div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('div[kjDivider]')).toHaveAttribute(
        'data-with-content',
        'true',
      );
    });

    it('<div> with whitespace-only content: data-with-content="false"', async () => {
      const { container } = await render(
        `<div kjDivider>   </div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('div')).toHaveAttribute('data-with-content', 'false');
    });
  });

  describe('align reflection', () => {
    it('defaults to data-align="center"', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      expect(container.querySelector('hr')).toHaveAttribute('data-align', 'center');
    });

    it('reflects kjAlign to data-align', async () => {
      const { container } = await render(
        `<div kjDivider [kjAlign]="'start'">Today</div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('div')).toHaveAttribute('data-align', 'start');
    });
  });

  describe('variant + size composition', () => {
    it('reflects default data-variant from KjVariant preset', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      // KjVariant default factory: { default: 'default' }
      expect(container.querySelector('hr')).toHaveAttribute('data-variant', 'default');
    });

    it('reflects default data-size from KjSize preset', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      // KjSize default factory: { default: 'md' }
      expect(container.querySelector('hr')).toHaveAttribute('data-size', 'md');
    });

    it('forwards kjVariant input (composed via hostDirectives)', async () => {
      const { container } = await render(
        `<hr kjDivider [kjVariant]="'dashed'" />`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('hr')).toHaveAttribute('data-variant', 'dashed');
    });

    it('forwards kjSize input (composed via hostDirectives)', async () => {
      const { container } = await render(
        `<hr kjDivider [kjSize]="'lg'" />`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('hr')).toHaveAttribute('data-size', 'lg');
    });
  });

  describe('a11y audits', () => {
    it('decorative <hr> divider passes axe', async () => {
      const { container } = await render(`<hr kjDivider />`, { imports: [KjDivider] });
      await flushAfterNextRender();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('structural with-content <div> divider passes axe', async () => {
      const { container } = await render(
        `<div kjDivider [kjStructural]="true">OR</div>`,
        { imports: [KjDivider] },
      );
      await flushAfterNextRender();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

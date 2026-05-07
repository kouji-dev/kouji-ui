import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjSkeleton } from './skeleton';

expect.extend(toHaveNoViolations);

describe('KjSkeleton', () => {
  describe('aria-hidden enforcement (load-bearing contract)', () => {
    it('sets aria-hidden="true" on the host', async () => {
      const { container } = await render(`<div kjSkeleton></div>`, {
        imports: [KjSkeleton],
      });
      expect(container.querySelector('div')).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets aria-hidden="true" on a <span> host', async () => {
      const { container } = await render(`<span kjSkeleton></span>`, {
        imports: [KjSkeleton],
      });
      expect(container.querySelector('span')).toHaveAttribute('aria-hidden', 'true');
    });

    it('host binding wins over a consumer-supplied [attr.aria-hidden]="false"', async () => {
      // The directive's host binding `[attr.aria-hidden]="\"true\""` is a
      // static expression evaluated by the directive, and Angular's binding
      // semantics give the directive's host binding precedence over a
      // template attribute literal on the same element. The consumer cannot
      // turn the skeleton into something AT will read by writing
      // `aria-hidden="false"` on the tag — this is the entire reason a
      // directive exists rather than a CSS class. (Per analysis: not
      // user-overridable.)
      const { container } = await render(
        `<div kjSkeleton aria-hidden="false"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(container.querySelector('div')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('shape reflection', () => {
    it('defaults to data-shape="rectangle"', async () => {
      const { container } = await render(`<div kjSkeleton></div>`, {
        imports: [KjSkeleton],
      });
      expect(container.querySelector('div')).toHaveAttribute('data-shape', 'rectangle');
    });

    it('reflects kjSkeletonShape="circle" to data-shape', async () => {
      const { container } = await render(
        `<div kjSkeleton [kjSkeletonShape]="'circle'"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(container.querySelector('div')).toHaveAttribute('data-shape', 'circle');
    });

    it('reflects kjSkeletonShape="text" to data-shape', async () => {
      const { container } = await render(
        `<div kjSkeleton [kjSkeletonShape]="'text'"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(container.querySelector('div')).toHaveAttribute('data-shape', 'text');
    });

    it('reflects kjSkeletonShape="text-block" to data-shape', async () => {
      const { container } = await render(
        `<div kjSkeleton [kjSkeletonShape]="'text-block'"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(container.querySelector('div')).toHaveAttribute('data-shape', 'text-block');
    });
  });

  describe('animation reflection', () => {
    it('defaults to data-animation="shimmer"', async () => {
      const { container } = await render(`<div kjSkeleton></div>`, {
        imports: [KjSkeleton],
      });
      expect(container.querySelector('div')).toHaveAttribute('data-animation', 'shimmer');
    });

    it('reflects kjSkeletonAnimation="pulse" to data-animation', async () => {
      const { container } = await render(
        `<div kjSkeleton [kjSkeletonAnimation]="'pulse'"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(container.querySelector('div')).toHaveAttribute('data-animation', 'pulse');
    });

    it('reflects kjSkeletonAnimation="none" to data-animation', async () => {
      const { container } = await render(
        `<div kjSkeleton [kjSkeletonAnimation]="'none'"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(container.querySelector('div')).toHaveAttribute('data-animation', 'none');
    });
  });

  describe('a11y audits', () => {
    it('a default skeleton passes axe', async () => {
      const { container } = await render(`<div kjSkeleton></div>`, {
        imports: [KjSkeleton],
      });
      expect(await axe(container)).toHaveNoViolations();
    });

    it('a circle skeleton with explicit dimensions passes axe', async () => {
      const { container } = await render(
        `<div kjSkeleton [kjSkeletonShape]="'circle'" style="width: 40px; height: 40px"></div>`,
        { imports: [KjSkeleton] },
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

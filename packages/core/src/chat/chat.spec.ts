import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjChat } from './chat';
import { KjChatAvatar } from './chat-avatar';
import { KjChatBubble } from './chat-bubble';
import { KjChatFooter } from './chat-footer';
import { KjChatHeader } from './chat-header';
import { KjChatLog } from './chat-log';
import { provideKjChatBubble } from './config';

expect.extend(toHaveNoViolations);

const imports = [
  KjChatLog,
  KjChat,
  KjChatAvatar,
  KjChatHeader,
  KjChatBubble,
  KjChatFooter,
];

describe('KjChatLog', () => {
  it('hosts role=log + aria-live=polite by default', async () => {
    const { container } = await render(
      `<div kjChatLog data-testid="log"></div>`,
      { imports },
    );
    const log = container.querySelector('[data-testid="log"]')!;
    expect(log).toHaveAttribute('role', 'log');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log).toHaveAttribute('aria-relevant', 'additions');
    expect(log).toHaveAttribute('aria-atomic', 'false');
  });

  it('reflects kjChatLogLive=off', async () => {
    const { container } = await render(
      `<div kjChatLog kjChatLogLive="off" data-testid="log"></div>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="log"]')).toHaveAttribute(
      'aria-live',
      'off',
    );
  });

  it('reflects kjChatLogLabel as aria-label', async () => {
    const { container } = await render(
      `<div kjChatLog kjChatLogLabel="Conversation with Alice" data-testid="log"></div>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="log"]')).toHaveAttribute(
      'aria-label',
      'Conversation with Alice',
    );
  });
});

describe('KjChat', () => {
  it('default role is article', async () => {
    const { container } = await render(
      `<div kjChat data-testid="row"></div>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="row"]')).toHaveAttribute(
      'role',
      'article',
    );
  });

  it('kjRole=listitem reflects on host', async () => {
    const { container } = await render(
      `<div kjChat kjRole="listitem" data-testid="row"></div>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="row"]')).toHaveAttribute(
      'role',
      'listitem',
    );
  });

  it('kjRole=null drops the role attribute', async () => {
    const { container } = await render(
      `<div kjChat [kjRole]="null" data-testid="row"></div>`,
      { imports },
    );
    expect(
      container.querySelector('[data-testid="row"]'),
    ).not.toHaveAttribute('role');
  });

  it('kjSide reflects to data-side', async () => {
    const { container } = await render(
      `<div kjChat kjSide="end" data-testid="row"></div>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="row"]')).toHaveAttribute(
      'data-side',
      'end',
    );
  });

  it('auto-grouping marks the second same-author row with data-grouped', async () => {
    const { container, fixture } = await render(
      `<div kjChatLog>
         <div kjChat kjChatAuthor="alice" data-testid="r1"></div>
         <div kjChat kjChatAuthor="alice" data-testid="r2"></div>
         <div kjChat kjChatAuthor="bob"   data-testid="r3"></div>
       </div>`,
      { imports },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      container.querySelector('[data-testid="r1"]'),
    ).not.toHaveAttribute('data-grouped');
    expect(container.querySelector('[data-testid="r2"]')).toHaveAttribute(
      'data-grouped',
      '',
    );
    expect(
      container.querySelector('[data-testid="r3"]'),
    ).not.toHaveAttribute('data-grouped');
  });

  it('explicit kjChatGrouped overrides auto-grouping', async () => {
    const { container, fixture } = await render(
      `<div kjChatLog>
         <div kjChat kjChatAuthor="alice" data-testid="r1"></div>
         <div kjChat kjChatAuthor="bob" [kjChatGrouped]="true" data-testid="r2"></div>
       </div>`,
      { imports },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(container.querySelector('[data-testid="r2"]')).toHaveAttribute(
      'data-grouped',
      '',
    );
  });

  it('header/footer ids wire aria-labelledby and aria-describedby on the row', async () => {
    const { container } = await render(
      `<div kjChat data-testid="row">
         <header kjChatHeader data-testid="h">Alice 12:46</header>
         <p kjChatBubble>Hi</p>
         <footer kjChatFooter data-testid="f">Sent</footer>
       </div>`,
      { imports },
    );
    const row = container.querySelector('[data-testid="row"]')!;
    const header = container.querySelector('[data-testid="h"]')!;
    const footer = container.querySelector('[data-testid="f"]')!;
    expect(header.id).toMatch(/^kj-chat-header-\d+$/);
    expect(footer.id).toMatch(/^kj-chat-footer-\d+$/);
    expect(row.getAttribute('aria-labelledby')).toBe(header.id);
    expect(row.getAttribute('aria-describedby')).toBe(footer.id);
  });
});

describe('KjChatAvatar', () => {
  it('forces aria-hidden=true', async () => {
    const { container } = await render(
      `<span kjChatAvatar data-testid="av"></span>`,
      { imports },
    );
    const av = container.querySelector('[data-testid="av"]')!;
    expect(av).toHaveAttribute('aria-hidden', 'true');
    expect(av).toHaveAttribute('role', 'presentation');
  });
});

describe('KjChatHeader / KjChatFooter', () => {
  it('mint unique ids for two adjacent headers / footers', async () => {
    const { container } = await render(
      `<div kjChatLog>
         <div kjChat>
           <header kjChatHeader data-testid="h1">A</header>
           <footer kjChatFooter data-testid="f1">x</footer>
         </div>
         <div kjChat>
           <header kjChatHeader data-testid="h2">B</header>
           <footer kjChatFooter data-testid="f2">y</footer>
         </div>
       </div>`,
      { imports },
    );
    const h1 = container.querySelector('[data-testid="h1"]')!.id;
    const h2 = container.querySelector('[data-testid="h2"]')!.id;
    const f1 = container.querySelector('[data-testid="f1"]')!.id;
    const f2 = container.querySelector('[data-testid="f2"]')!.id;
    expect(h1).not.toEqual(h2);
    expect(f1).not.toEqual(f2);
    expect(h1).toMatch(/^kj-chat-header-/);
    expect(f1).toMatch(/^kj-chat-footer-/);
  });

  it('footer reflects kjState as data-state and aria-label', async () => {
    const { container } = await render(
      `<footer kjChatFooter kjState="read" data-testid="f">Read 12:46</footer>`,
      { imports },
    );
    const f = container.querySelector('[data-testid="f"]')!;
    expect(f).toHaveAttribute('data-state', 'read');
    expect(f).toHaveAttribute('aria-label', 'Read');
  });

  it('footer omits data-state and aria-label when kjState is unset', async () => {
    const { container } = await render(
      `<footer kjChatFooter data-testid="f">Sent 12:46</footer>`,
      { imports },
    );
    const f = container.querySelector('[data-testid="f"]')!;
    expect(f).not.toHaveAttribute('data-state');
    expect(f).not.toHaveAttribute('aria-label');
  });
});

describe('KjChatBubble', () => {
  it('composes KjVariant -> data-variant default', async () => {
    const { container } = await render(
      `<p kjChatBubble data-testid="b">Hi</p>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="b"]')).toHaveAttribute(
      'data-variant',
      'default',
    );
  });

  it('composes KjSize -> data-size default', async () => {
    const { container } = await render(
      `<p kjChatBubble data-testid="b">Hi</p>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="b"]')).toHaveAttribute(
      'data-size',
      'md',
    );
  });

  it('forwards kjVariant + kjSize through hostDirectives', async () => {
    const { container } = await render(
      `<p kjChatBubble kjVariant="primary" kjSize="lg" data-testid="b">Hi</p>`,
      { imports },
    );
    const b = container.querySelector('[data-testid="b"]')!;
    expect(b).toHaveAttribute('data-variant', 'primary');
    expect(b).toHaveAttribute('data-size', 'lg');
  });

  it('renders data-tail when not grouped and no-tail not set', async () => {
    const { container } = await render(
      `<div kjChat>
         <p kjChatBubble data-testid="b">Hi</p>
       </div>`,
      { imports },
    );
    expect(container.querySelector('[data-testid="b"]')).toHaveAttribute(
      'data-tail',
      '',
    );
  });

  it('omits data-tail when kjChatBubbleNoTail=true', async () => {
    const { container } = await render(
      `<div kjChat>
         <p kjChatBubble [kjChatBubbleNoTail]="true" data-testid="b">Hi</p>
       </div>`,
      { imports },
    );
    expect(
      container.querySelector('[data-testid="b"]'),
    ).not.toHaveAttribute('data-tail');
  });

  it('omits data-tail when the parent row is auto-grouped', async () => {
    const { container, fixture } = await render(
      `<div kjChatLog>
         <div kjChat kjChatAuthor="alice">
           <p kjChatBubble data-testid="b1">A</p>
         </div>
         <div kjChat kjChatAuthor="alice">
           <p kjChatBubble data-testid="b2">B</p>
         </div>
       </div>`,
      { imports },
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(container.querySelector('[data-testid="b1"]')).toHaveAttribute(
      'data-tail',
      '',
    );
    expect(
      container.querySelector('[data-testid="b2"]'),
    ).not.toHaveAttribute('data-tail');
  });

  it('respects provideKjChatBubble preset overrides', async () => {
    const { container } = await render(
      `<p kjChatBubble data-testid="b">x</p>`,
      {
        imports,
        providers: [
          provideKjChatBubble({
            variants: ['default', 'primary', 'brand'],
            defaults: { variant: 'brand', size: 'md' },
          }),
        ],
      },
    );
    expect(container.querySelector('[data-testid="b"]')).toHaveAttribute(
      'data-variant',
      'brand',
    );
  });
});

describe('a11y', () => {
  it('passes axe audit on a populated chat log', async () => {
    const { container } = await render(
      `<div kjChatLog kjChatLogLabel="Test conversation">
         <div kjChat kjSide="start" kjChatAuthor="alice">
           <span kjChatAvatar></span>
           <header kjChatHeader>Alice 12:46</header>
           <p kjChatBubble>Hi there</p>
           <footer kjChatFooter kjState="read">Read 12:46</footer>
         </div>
         <div kjChat kjSide="end" kjChatAuthor="me">
           <p kjChatBubble kjVariant="primary">Hello back</p>
           <footer kjChatFooter kjState="delivered">Delivered</footer>
         </div>
       </div>`,
      { imports },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

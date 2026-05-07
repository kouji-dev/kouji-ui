import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import {
  KjChatAvatarComponent,
  KjChatBubbleComponent,
  KjChatComponent,
  KjChatFooterComponent,
  KjChatHeaderComponent,
  KjChatLogComponent,
} from './chat';

const imports = [
  KjChatLogComponent,
  KjChatComponent,
  KjChatAvatarComponent,
  KjChatHeaderComponent,
  KjChatBubbleComponent,
  KjChatFooterComponent,
];

/**
 * Allow Angular's signal-driven `effect`s and `afterNextRender` group
 * computation to settle before the assertions read host attributes.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('KjChatLogComponent', () => {
  it('renders an inner [kjChatLog] with role=log + aria-live=polite', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-log></kj-chat-log>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const log = container.querySelector('.kj-chat-log') as HTMLElement;
    expect(log).toBeTruthy();
    expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(log.getAttribute('aria-relevant')).toBe('additions');
    expect(log.getAttribute('aria-atomic')).toBe('false');
  });

  it('forwards kjChatLogLabel to the directive (aria-label)', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-log kjChatLogLabel="Conversation with Alice"></kj-chat-log>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat-log')?.getAttribute('aria-label')).toBe(
      'Conversation with Alice',
    );
  });

  it('forwards kjChatLogLive=off to the directive', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-log kjChatLogLive="off"></kj-chat-log>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat-log')?.getAttribute('aria-live')).toBe('off');
  });

  it('renders projected children unchanged', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-chat-log>
          <kj-chat data-testid="r1"><kj-chat-bubble>A</kj-chat-bubble></kj-chat>
          <kj-chat data-testid="r2"><kj-chat-bubble>B</kj-chat-bubble></kj-chat>
        </kj-chat-log>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelectorAll('kj-chat')).toHaveLength(2);
    expect(container.querySelectorAll('.kj-chat-bubble')).toHaveLength(2);
  });
});

describe('KjChatComponent', () => {
  it('default role is article on the inner host', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat></kj-chat>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat')?.getAttribute('role')).toBe('article');
  });

  it('reflects kjSide to data-side', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat kjSide="end"></kj-chat>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat')?.getAttribute('data-side')).toBe('end');
  });

  it('default side is start', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat></kj-chat>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat')?.getAttribute('data-side')).toBe('start');
  });

  it('wires aria-labelledby and aria-describedby from projected header / footer', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-chat>
          <kj-chat-header>Alice 12:46</kj-chat-header>
          <kj-chat-bubble>Hi</kj-chat-bubble>
          <kj-chat-footer>Sent</kj-chat-footer>
        </kj-chat>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const row = container.querySelector('.kj-chat')!;
    const header = container.querySelector('.kj-chat-header') as HTMLElement;
    const footer = container.querySelector('.kj-chat-footer') as HTMLElement;
    expect(header.id).toMatch(/^kj-chat-header-\d+$/);
    expect(footer.id).toMatch(/^kj-chat-footer-\d+$/);
    expect(row.getAttribute('aria-labelledby')).toBe(header.id);
    expect(row.getAttribute('aria-describedby')).toBe(footer.id);
  });
});

describe('KjChatAvatarComponent', () => {
  it('forces aria-hidden=true and role=presentation on the slot', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-avatar></kj-chat-avatar>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const av = container.querySelector('.kj-chat-avatar')!;
    expect(av.getAttribute('aria-hidden')).toBe('true');
    expect(av.getAttribute('role')).toBe('presentation');
  });

  it('renders projected content', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-chat-avatar>
          <span class="probe">probe</span>
        </kj-chat-avatar>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat-avatar .probe')?.textContent).toBe('probe');
  });
});

describe('KjChatBubbleComponent', () => {
  it('default variant + size land on the inner host', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-bubble>Hi</kj-chat-bubble>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const b = container.querySelector('.kj-chat-bubble')!;
    expect(b.getAttribute('data-variant')).toBe('default');
    expect(b.getAttribute('data-size')).toBe('md');
  });

  it('forwards kjVariant + kjSize through the typed wrapper inputs', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-bubble kjVariant="primary" kjSize="lg">Hi</kj-chat-bubble>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const b = container.querySelector('.kj-chat-bubble')!;
    expect(b.getAttribute('data-variant')).toBe('primary');
    expect(b.getAttribute('data-size')).toBe('lg');
  });

  it('renders data-tail inside a row by default', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-chat>
          <kj-chat-bubble>Hi</kj-chat-bubble>
        </kj-chat>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat-bubble')?.hasAttribute('data-tail')).toBe(true);
  });

  it('omits data-tail when kjChatBubbleNoTail is true', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-chat>
          <kj-chat-bubble [kjChatBubbleNoTail]="true">Hi</kj-chat-bubble>
        </kj-chat>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    expect(container.querySelector('.kj-chat-bubble')?.hasAttribute('data-tail')).toBe(false);
  });
});

describe('KjChatFooterComponent', () => {
  it('reflects kjState as data-state and aria-label', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-footer kjState="read">Read</kj-chat-footer>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const f = container.querySelector('.kj-chat-footer')!;
    expect(f.getAttribute('data-state')).toBe('read');
    expect(f.getAttribute('aria-label')).toBe('Read');
  });

  it('omits data-state when kjState is unset', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-chat-footer>Sent 12:46</kj-chat-footer>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const f = container.querySelector('.kj-chat-footer')!;
    expect(f.hasAttribute('data-state')).toBe(false);
    expect(f.hasAttribute('aria-label')).toBe(false);
  });
});

describe('KjChatHeaderComponent', () => {
  it('mints unique ids for two adjacent headers', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-chat-log>
          <kj-chat>
            <kj-chat-header data-testid="h1">A</kj-chat-header>
            <kj-chat-bubble>x</kj-chat-bubble>
          </kj-chat>
          <kj-chat>
            <kj-chat-header data-testid="h2">B</kj-chat-header>
            <kj-chat-bubble>y</kj-chat-bubble>
          </kj-chat>
        </kj-chat-log>
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const headers = container.querySelectorAll('.kj-chat-header');
    expect(headers.length).toBe(2);
    const h1 = (headers[0] as HTMLElement).id;
    const h2 = (headers[1] as HTMLElement).id;
    expect(h1).not.toEqual(h2);
    expect(h1).toMatch(/^kj-chat-header-/);
  });
});

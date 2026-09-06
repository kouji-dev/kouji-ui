import { Component, inject, input } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjChatStore, provideKjChat, type KjChatItemInput } from '@kouji-ui/core';
import { KjChatThread } from './chat-thread';
import { KjPromptInput } from './prompt-input';
import { renderMarkdown } from './markdown';

expect.extend(toHaveNoViolations);

@Component({
  standalone: true,
  imports: [KjChatThread, KjPromptInput],
  providers: [KjChatStore],
  template: `
    <kj-chat-thread [store]="store" kjLabel="Test conversation" />
    <kj-prompt-input
      [kjStreaming]="store.isStreaming()"
      [kjSlashCommands]="commands"
      (kjSend)="sent = $event"
      (kjStop)="stopped = true"
    />
  `,
})
class Host {
  readonly store = inject(KjChatStore);
  sent = '';
  stopped = false;
  commands = [
    { name: '/summarize', label: 'Summarize', description: 'Condense' },
    { name: '/image', label: 'Image', description: 'Picture' },
  ];
}

@Component({
  standalone: true,
  template: `<p data-testid="chart">chart: {{ item().data }}</p>`,
})
class ChartRenderer {
  readonly item = input.required<KjChatItemInput<string>>();
}

@Component({
  standalone: true,
  template: `<p data-testid="fallback">unknown: {{ item().type }}</p>`,
})
class FallbackRenderer {
  readonly item = input.required<KjChatItemInput>();
}

@Component({
  standalone: true,
  imports: [KjChatThread],
  providers: [KjChatStore],
  template: `<kj-chat-thread [store]="store" kjLabel="Registry conversation" />`,
})
class RegistryHost {
  readonly store = inject(KjChatStore);
}

describe('chat item registry', () => {
  it('draws a registered type with its component', async () => {
    const { fixture } = await render(RegistryHost, {
      providers: [provideKjChat({ renderers: { chart: ChartRenderer } })],
    });
    fixture.componentInstance.store.addItem({ type: 'chart', data: 'revenue', content: 'A chart' });
    fixture.detectChanges();

    expect(screen.getByTestId('chart')).toHaveTextContent('chart: revenue');
  });

  it('leaves ordinary messages to the built-in renderer', async () => {
    const { fixture } = await render(RegistryHost, {
      providers: [provideKjChat({ renderers: { chart: ChartRenderer } })],
    });
    fixture.componentInstance.store.sendUser('just text');
    fixture.detectChanges();

    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByText('just text')).toBeTruthy();
  });

  it('sends an unregistered type to the fallback', async () => {
    const { fixture } = await render(RegistryHost, {
      providers: [
        provideKjChat({ renderers: { chart: ChartRenderer }, fallback: FallbackRenderer }),
      ],
    });
    fixture.componentInstance.store.addItem({ type: 'diff', content: 'a diff' });
    fixture.detectChanges();

    expect(screen.getByTestId('fallback')).toHaveTextContent('unknown: diff');
  });

  it('renders an unknown type plainly when no fallback is registered', async () => {
    // A transcript that silently drops a turn is worse than one that renders
    // it as text.
    const { fixture } = await render(RegistryHost, {
      providers: [provideKjChat({ renderers: {} })],
    });
    fixture.componentInstance.store.addItem({ type: 'diff', content: 'a diff' });
    fixture.detectChanges();

    expect(screen.getByText('a diff')).toBeTruthy();
  });
});

describe('renderMarkdown', () => {
  it('splits fenced code blocks from prose', () => {
    const blocks = renderMarkdown('Hi there.\n\n```ts\nconst x = 1;\n```\nDone.');
    expect(blocks.map((b) => b.kind)).toEqual(['prose', 'code', 'prose']);
    const code = blocks[1];
    expect(code.kind === 'code' && code.lang).toBe('ts');
    expect(code.kind === 'code' && code.code).toBe('const x = 1;');
  });

  it('renders the block markdown a model actually emits', () => {
    // The hand-rolled parser this replaced handled only bold/italic/code spans
    // and links, so lists, headings and tables reached the bubble as literal
    // asterisks, hashes and pipes.
    const [block] = renderMarkdown('## Primes\n\n- two\n- three\n\n1. first\n2. second');
    expect(block.kind).toBe('prose');
    const html = block.kind === 'prose' ? block.html : '';
    expect(html).toContain('<h2');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('<ol>');
  });

  it('renders GFM tables and strikethrough', () => {
    const [block] = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |\n\n~~gone~~');
    const html = block.kind === 'prose' ? block.html : '';
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<del>gone</del>');
  });

  it('keeps inline emphasis and code spans working', () => {
    const [block] = renderMarkdown('Three primes are **2, 3, and 5** via `nextPrime()`.');
    const html = block.kind === 'prose' ? block.html : '';
    expect(html).toContain('<strong>2, 3, and 5</strong>');
    expect(html).toContain('<code>nextPrime()</code>');
    expect(html).not.toContain('**');
  });

  it('escapes inline HTML without dropping the surrounding sentence', () => {
    const [block] = renderMarkdown('Use <img src=x onerror=alert(1)> carefully.');
    const html = block.kind === 'prose' ? block.html : '';
    expect(html).not.toContain('<img');
    expect(html).toContain('carefully.');
  });

  it('escapes HTML in prose (no XSS)', () => {
    const blocks = renderMarkdown('<img src=x onerror=alert(1)>');
    const prose = blocks[0];
    expect(prose.kind).toBe('prose');
    expect(prose.kind === 'prose' && prose.html).not.toContain('<img');
    expect(prose.kind === 'prose' && prose.html).toContain('&lt;img');
  });

  it('renders bold and inline code', () => {
    const blocks = renderMarkdown('a **b** and `c`');
    const html = blocks[0].kind === 'prose' ? blocks[0].html : '';
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<code');
  });
});

describe('KjChatThread', () => {
  it('renders messages from the store with a log landmark', async () => {
    const { fixture } = await render(Host);
    const store = fixture.componentInstance.store;
    store.sendUser('Hello');
    store.beginAssistant();
    store.pushChunk('Hi! How can I help?');
    store.endAssistant();
    fixture.detectChanges();

    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText(/How can I help/)).toBeInTheDocument();
  });

  it('shows a typing indicator while streaming with no content', async () => {
    const { fixture } = await render(Host);
    fixture.componentInstance.store.beginAssistant();
    fixture.detectChanges();
    expect(screen.getByLabelText('Assistant is typing')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { fixture, container } = await render(Host);
    const store = fixture.componentInstance.store;
    store.sendUser('Q');
    store.beginAssistant();
    store.pushChunk('A');
    store.endAssistant();
    fixture.detectChanges();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('KjPromptInput', () => {
  it('sends on Enter and clears', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(Host);
    const box = screen.getByRole('textbox');
    await user.type(box, 'hello world');
    await user.keyboard('{Enter}');
    expect(fixture.componentInstance.sent).toBe('hello world');
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(Host);
    const box = screen.getByRole('textbox');
    await user.type(box, 'line');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(fixture.componentInstance.sent).toBe('');
  });

  it('opens a filtered slash listbox on "/"', async () => {
    const user = userEvent.setup();
    await render(Host);
    const box = screen.getByRole('textbox');
    await user.type(box, '/sum');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('/summarize')).toBeInTheDocument();
    expect(screen.queryByText('/image')).not.toBeInTheDocument();
  });

  it('emits stop when streaming and Stop is clicked', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(Host);
    fixture.componentInstance.store.beginAssistant();
    fixture.detectChanges();
    await user.click(screen.getByLabelText('Stop generating'));
    expect(fixture.componentInstance.stopped).toBe(true);
  });
});

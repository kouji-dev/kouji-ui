import { Component, inject } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjChatStore } from '@kouji-ui/core';
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

describe('renderMarkdown', () => {
  it('splits fenced code blocks from prose', () => {
    const blocks = renderMarkdown('Hi there.\n\n```ts\nconst x = 1;\n```\nDone.');
    expect(blocks.map((b) => b.kind)).toEqual(['prose', 'code', 'prose']);
    const code = blocks[1];
    expect(code.kind === 'code' && code.lang).toBe('ts');
    expect(code.kind === 'code' && code.code).toBe('const x = 1;');
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

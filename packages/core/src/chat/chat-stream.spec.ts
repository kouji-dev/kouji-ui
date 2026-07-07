import { describe, expect, it } from 'vitest';
import { KjChatStore } from './chat-stream';

function makeStore(): KjChatStore {
  return new KjChatStore();
}

describe('KjChatStore', () => {
  it('starts idle with no messages', () => {
    const s = makeStore();
    expect(s.status()).toBe('idle');
    expect(s.messages()).toEqual([]);
    expect(s.isStreaming()).toBe(false);
  });

  it('appends a user message', () => {
    const s = makeStore();
    const id = s.sendUser('hello');
    expect(s.messages()).toHaveLength(1);
    expect(s.messages()[0]).toMatchObject({ id, role: 'user', content: 'hello' });
  });

  it('begins an assistant message and transitions to streaming', () => {
    const s = makeStore();
    const id = s.beginAssistant();
    expect(s.status()).toBe('streaming');
    expect(s.isStreaming()).toBe(true);
    expect(s.streamingId()).toBe(id);
    expect(s.messages()[0]).toMatchObject({ role: 'assistant', streaming: true, content: '' });
  });

  it('appends chunks to the in-flight assistant message', () => {
    const s = makeStore();
    s.beginAssistant();
    s.pushChunk('Hel');
    s.pushChunk('lo');
    s.pushChunk(' world');
    expect(s.messages()[0].content).toBe('Hello world');
  });

  it('pushChunk is a no-op when nothing is streaming', () => {
    const s = makeStore();
    s.pushChunk('orphan');
    expect(s.messages()).toEqual([]);
  });

  it('endAssistant completes streaming and returns to idle', () => {
    const s = makeStore();
    s.beginAssistant();
    s.pushChunk('done');
    s.endAssistant();
    expect(s.status()).toBe('idle');
    expect(s.streamingId()).toBeNull();
    expect(s.messages()[0]).toMatchObject({ streaming: false, content: 'done' });
  });

  it('fail sets error status and records error on the message, keeping partial content', () => {
    const s = makeStore();
    s.beginAssistant();
    s.pushChunk('partial');
    s.fail('network error');
    expect(s.status()).toBe('error');
    expect(s.error()).toBe('network error');
    expect(s.messages()[0]).toMatchObject({
      streaming: false,
      content: 'partial',
      error: 'network error',
    });
  });

  it('stop freezes partial content and returns to idle', () => {
    const s = makeStore();
    s.beginAssistant();
    s.pushChunk('half');
    s.stop();
    expect(s.status()).toBe('idle');
    expect(s.streamingId()).toBeNull();
    expect(s.messages()[0]).toMatchObject({ streaming: false, content: 'half' });
  });

  it('tracks tool calls on the in-flight message', () => {
    const s = makeStore();
    s.beginAssistant();
    s.addToolCall({ id: 't1', name: 'search', status: 'running' });
    s.updateToolCall('t1', { status: 'done', result: { hits: 3 } });
    expect(s.messages()[0].toolCalls).toEqual([
      { id: 't1', name: 'search', status: 'done', result: { hits: 3 } },
    ]);
  });

  it('attaches citations to the in-flight message', () => {
    const s = makeStore();
    s.beginAssistant();
    s.addCitations([{ id: 'c1', title: 'RFC 1', url: 'https://x' }]);
    expect(s.messages()[0].citations).toEqual([{ id: 'c1', title: 'RFC 1', url: 'https://x' }]);
  });

  it('supports a full multi-turn flow', () => {
    const s = makeStore();
    s.sendUser('q1');
    s.beginAssistant();
    s.pushChunk('a1');
    s.endAssistant();
    s.sendUser('q2');
    s.beginAssistant();
    s.pushChunk('a2');
    s.endAssistant();
    expect(s.messages().map((m) => `${m.role}:${m.content}`)).toEqual([
      'user:q1',
      'assistant:a1',
      'user:q2',
      'assistant:a2',
    ]);
    expect(s.status()).toBe('idle');
  });

  it('reset clears the thread', () => {
    const s = makeStore();
    s.sendUser('x');
    s.beginAssistant();
    s.reset();
    expect(s.messages()).toEqual([]);
    expect(s.status()).toBe('idle');
    expect(s.streamingId()).toBeNull();
  });
});

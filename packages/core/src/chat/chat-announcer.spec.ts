import { describe, expect, it } from 'vitest';
import { KjChatAnnouncer, coalesceAnnouncement } from './chat-announcer';

describe('coalesceAnnouncement', () => {
  it('holds a partial sentence (announces nothing)', () => {
    const r = coalesceAnnouncement('How ar');
    expect(r.toAnnounce).toBe('');
    expect(r.remainder).toBe('How ar');
  });

  it('flushes up to the last sentence boundary, keeping the partial remainder', () => {
    const r = coalesceAnnouncement('Hello there. How ar');
    expect(r.toAnnounce).toBe('Hello there.');
    expect(r.remainder).toBe(' How ar');
  });

  it('treats ? ! and newline as boundaries and flushes to the last one', () => {
    const r = coalesceAnnouncement('One. Two? Three! Fou');
    expect(r.toAnnounce).toBe('One. Two? Three!');
    expect(r.remainder).toBe(' Fou');
  });

  it('does not char-by-char: a single growing word stays buffered under maxChars', () => {
    const word = 'Streaming';
    let remainder = '';
    for (let i = 1; i <= word.length; i++) {
      const r = coalesceAnnouncement(word.slice(0, i));
      expect(r.toAnnounce).toBe('');
      remainder = r.remainder;
    }
    expect(remainder).toBe('Streaming');
  });

  it('flushes at a word boundary when over maxChars with no sentence end', () => {
    const long = 'word '.repeat(50).trim(); // 249 chars, no sentence end
    const r = coalesceAnnouncement(long, { maxChars: 40 });
    expect(r.toAnnounce.length).toBeLessThanOrEqual(long.length);
    expect(r.toAnnounce.endsWith('word')).toBe(true);
    expect(r.remainder).toBe('word');
  });

  it('flushes a single over-long token whole rather than holding it forever', () => {
    const token = 'x'.repeat(200);
    const r = coalesceAnnouncement(token, { maxChars: 40 });
    expect(r.toAnnounce).toBe(token);
    expect(r.remainder).toBe('');
  });
});

describe('KjChatAnnouncer', () => {
  it('emits only completed sentences as tokens arrive', () => {
    const a = new KjChatAnnouncer();
    a.push('Hello ');
    expect(a.message()).toBe(''); // no boundary yet
    a.push('there. How');
    expect(a.message().replace('​', '')).toBe('Hello there.');
  });

  it('flush releases the trailing partial sentence', () => {
    const a = new KjChatAnnouncer();
    a.push('Final words without period');
    expect(a.message()).toBe('');
    a.flush();
    expect(a.message().replace('​', '')).toBe('Final words without period');
  });

  it('re-announces identical consecutive sentences via toggle', () => {
    const a = new KjChatAnnouncer();
    a.push('Done. ');
    const first = a.message();
    a.push('Done. ');
    const second = a.message();
    expect(first).not.toBe(second); // toggled so AT registers the change
    expect(first.replace('​', '')).toBe('Done.');
    expect(second.replace('​', '')).toBe('Done.');
  });

  it('announce() pushes a discrete status line immediately', () => {
    const a = new KjChatAnnouncer();
    a.announce('Response stopped');
    expect(a.message().replace('​', '')).toBe('Response stopped');
  });

  it('clear resets buffer and message', () => {
    const a = new KjChatAnnouncer();
    a.push('Partial');
    a.clear();
    expect(a.message()).toBe('');
    a.flush();
    expect(a.message()).toBe(''); // nothing buffered
  });
});

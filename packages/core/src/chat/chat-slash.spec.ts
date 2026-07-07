import { describe, expect, it } from 'vitest';
import { matchSlashCommands, parseSlash, type KjSlashCommand } from './chat-slash';

const COMMANDS: KjSlashCommand[] = [
  { name: '/summarize', label: 'Summarize', description: 'Condense the thread' },
  { name: '/translate', label: 'Translate', description: 'Change language' },
  { name: '/image', label: 'Generate image', description: 'Create a picture' },
];

describe('parseSlash', () => {
  it('is inactive for non-slash text', () => {
    expect(parseSlash('hello')).toEqual({ active: false, query: '' });
  });

  it('is active for a bare slash', () => {
    expect(parseSlash('/')).toEqual({ active: true, query: '' });
  });

  it('is active while typing the command name', () => {
    expect(parseSlash('/sum')).toEqual({ active: true, query: 'sum' });
  });

  it('deactivates once whitespace completes the token', () => {
    expect(parseSlash('/summarize now')).toEqual({ active: false, query: '' });
  });
});

describe('matchSlashCommands', () => {
  it('returns all commands for an empty query', () => {
    expect(matchSlashCommands('', COMMANDS)).toHaveLength(3);
  });

  it('matches on name substring', () => {
    const r = matchSlashCommands('trans', COMMANDS);
    expect(r.map((c) => c.name)).toEqual(['/translate']);
  });

  it('matches on label / description, case-insensitively', () => {
    const r = matchSlashCommands('picture', COMMANDS);
    expect(r.map((c) => c.name)).toEqual(['/image']);
  });

  it('returns nothing when no command matches', () => {
    expect(matchSlashCommands('zzz', COMMANDS)).toEqual([]);
  });
});

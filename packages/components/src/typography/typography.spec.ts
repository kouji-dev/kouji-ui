import { TestBed } from '@angular/core/testing';
import { describe, expect, test } from 'vitest';
import {
  KjTypographyExample,
  KjTypographyLeadExample,
  KjTypographyMutedExample,
  KjTypographyCodeExample,
  KjTypographyBlockquoteExample,
  KjTypographyTruncateExample,
} from './_examples';

/**
 * Smoke tests for the Typography live-preview examples. The component-side
 * surface is just re-exports + examples (no wrapper component to unit-test);
 * we verify the examples render and the directive host attributes land where
 * theme CSS expects them.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('Typography examples', () => {
  test('prose container example renders with the kj-prose class', () => {
    const fixture = TestBed.createComponent(KjTypographyExample);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('article.kj-prose');
    expect(article).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toMatch(/Roadmap/i);
    expect(fixture.nativeElement.querySelector('blockquote')).not.toBeNull();
  });

  test('lead example reflects data-tone="lead" on the <p> host', () => {
    const fixture = TestBed.createComponent(KjTypographyLeadExample);
    fixture.detectChanges();
    const lead = fixture.nativeElement.querySelector('p[data-tone="lead"]');
    expect(lead).not.toBeNull();
  });

  test('muted example reflects data-tone="muted" on each <span> host', () => {
    const fixture = TestBed.createComponent(KjTypographyMutedExample);
    fixture.detectChanges();
    const mutedNodes = fixture.nativeElement.querySelectorAll('span[data-tone="muted"]');
    expect(mutedNodes.length).toBe(2);
  });

  test('code example reflects data-tone="code" on each <code> host', () => {
    const fixture = TestBed.createComponent(KjTypographyCodeExample);
    fixture.detectChanges();
    const codeNodes = fixture.nativeElement.querySelectorAll('code[data-tone="code"]');
    expect(codeNodes.length).toBe(2);
  });

  test('blockquote example reflects data-tone="blockquote" on the host', () => {
    const fixture = TestBed.createComponent(KjTypographyBlockquoteExample);
    fixture.detectChanges();
    const bq = fixture.nativeElement.querySelector('blockquote[data-tone="blockquote"]');
    expect(bq).not.toBeNull();
  });

  test('truncate example reflects data-truncate="2" and injects [title]', async () => {
    const fixture = TestBed.createComponent(KjTypographyTruncateExample);
    fixture.detectChanges();
    await flushAfterNextRender();
    const clamped = fixture.nativeElement.querySelector('p[data-truncate="2"]');
    expect(clamped).not.toBeNull();
    expect(clamped?.getAttribute('title')).toMatch(/Atlas/);
  });
});

import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { ThemeDraftService } from './theme-draft.service';
import { DraftThemeSchema } from '../lib/theme/import-schema';
import type { DraftTheme } from '../lib/theme/types';

const HASH_PREFIX = 't=';
const VERSION = 2;

function b64UrlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlDecode(str: string): Uint8Array | null {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

/** Encodes the live draft to a URL hash and decodes hashes back to drafts.
 * Uses `deflate-raw` + base64url when `CompressionStream` is available;
 * falls back to plain base64url JSON otherwise. */
@Injectable({ providedIn: 'root' })
export class ThemeUrlService {
  private readonly draftService = inject(ThemeDraftService);
  private readonly destroyRef = inject(DestroyRef);
  private timer: number | null = null;
  private suppress = false;
  private started = false;

  /** Begin two-way sync between the URL hash and the draft. Idempotent. */
  startSync(): void {
    if (this.started) return;
    this.started = true;

    if (typeof location !== 'undefined' && location.hash) {
      const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
      this.decode(hash).then(d => {
        if (d) {
          this.suppress = true;
          this.draftService.load(d);
          this.suppress = false;
        }
      });
    }

    effect(() => {
      const draft = this.draftService.draft();
      if (this.suppress) return;
      if (typeof window === 'undefined') return;
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = window.setTimeout(async () => {
        const hash = await this.encode(draft);
        history.replaceState(null, '', `${location.pathname}${location.search}#${hash}`);
      }, 250);
    });

    this.destroyRef.onDestroy(() => {
      if (this.timer !== null && typeof window !== 'undefined') window.clearTimeout(this.timer);
    });
  }

  async encode(draft: DraftTheme): Promise<string> {
    const json = JSON.stringify({ v: VERSION, d: draft });
    const bytes = new TextEncoder().encode(json);
    let payload: Uint8Array = bytes;
    try {
      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('deflate-raw');
        const writer = cs.writable.getWriter();
        writer.write(bytes); writer.close();
        payload = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      }
    } catch {
      payload = bytes;
    }
    return HASH_PREFIX + b64UrlEncode(payload);
  }

  async decode(hash: string): Promise<DraftTheme | null> {
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const bytes = b64UrlDecode(hash.slice(HASH_PREFIX.length));
    if (!bytes) return null;
    let json: string | null = null;
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const wp = writer.write(new Uint8Array(bytes)).catch(() => {});
        const cp = writer.close().catch(() => {});
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        await wp; await cp;
        let len = 0; for (const c of chunks) len += c.length;
        const merged = new Uint8Array(len);
        let off = 0; for (const c of chunks) { merged.set(c, off); off += c.length; }
        json = new TextDecoder().decode(merged);
      } catch { json = null; }
    }
    if (json === null) {
      try { json = new TextDecoder().decode(bytes); } catch { return null; }
    }
    let env: { v: number; d: unknown };
    try { env = JSON.parse(json); } catch { return null; }
    if (env.v !== VERSION) return null;
    const parsed = DraftThemeSchema.safeParse(env.d);
    return parsed.success ? (parsed.data as DraftTheme) : null;
  }

  /** Returns the full URL with the current hash (for "Copy link"). */
  copyShareLink(): string {
    return typeof location !== 'undefined' ? location.href : '';
  }
}

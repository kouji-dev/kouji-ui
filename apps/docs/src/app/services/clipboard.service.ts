import { Injectable } from '@angular/core';

/** Shared clipboard utility for copying code snippets in the docs. */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  /** Copies text to the clipboard. Returns true on success. */
  async copy(text: string): Promise<boolean> {
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
    // Fallback for environments without Clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

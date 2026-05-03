import { Injectable, inject } from '@angular/core';
import { ThemeService } from './theme.service';

let _promise: Promise<any> | null = null;

@Injectable({ providedIn: 'root' })
export class MonacoService {
  private readonly themeService = inject(ThemeService);

  /** Loads Monaco from CDN lazily on first call; reuses the same instance after. */
  getMonaco(): Promise<any> {
    if (!_promise) {
      _promise = import('@monaco-editor/loader').then(m => m.default.init()).then((monaco) => {
        // DEV: expose monaco for DevTools introspection.
        // Examples to paste in the console:
        //   monaco.editor.tokenize(':root { --kj-bg: #fff; }', 'css')
        //   monaco.editor.setTheme('vs-dark'); monaco.editor.setTheme('vs')   // toggle
        (window as any).monaco = monaco;
        return monaco;
      });
    }
    return _promise.then((monaco) => {
      // Use Monaco's bundled themes directly — full playground-quality syntax coloring.
      // Surface customization (backgrounds, gutter, scrollbar) is done in CSS.
      monaco.editor.setTheme(this.themeService.theme() === 'dark' ? 'vs-dark' : 'vs');
      return monaco;
    });
  }
}

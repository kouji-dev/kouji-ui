import { Component, signal } from '@angular/core';
import { KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjSelectDirective, KjSelectTriggerDirective, KjSelectContentDirective, KjOptionDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--bg, #0c0c0c); position: relative; }
    .wrap { position: relative; width: 240px; }
    button[kjSelectTrigger] { width: 100%; background: var(--bg-subtle, #111); border: 1px solid var(--border, #1a1a1a); color: var(--text, #f0ede6); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding: 0.625rem 0.875rem; cursor: pointer; text-align: left; display: flex; justify-content: space-between; }
    button[kjSelectTrigger]::after { content: '▾'; color: var(--text-muted, #333); }
    [kjSelectContent] { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-elevated, #0e0e0e); border: 1px solid var(--border, #1a1a1a); z-index: 10; }
    [hidden] { display: none; }
    [kjOption] { padding: 0.625rem 0.875rem; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--text-secondary, #666); cursor: pointer; transition: background 0.1s; }
    [kjOption]:hover { background: var(--bg-hover, #141414); color: var(--text, #f0ede6); }
    [kjOption][aria-selected="true"] { color: var(--accent, #b8f500); background: var(--accent-dim, rgba(184,245,0,0.08)); }
    p { margin-top: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--text-muted, #333); }
  `],
  template: `
    <div class="wrap">
      <div kjSelect [(kjSelectValue)]="selected">
        <button kjSelectTrigger aria-haspopup="listbox">{{ selected() || 'Select a fruit' }}</button>
        <div kjSelectContent role="listbox">
          <div kjOption [kjOptionValue]="'Apple'" role="option">Apple</div>
          <div kjOption [kjOptionValue]="'Banana'" role="option">Banana</div>
          <div kjOption [kjOptionValue]="'Cherry'" role="option">Cherry</div>
          <div kjOption [kjOptionValue]="'Mango'" role="option">Mango</div>
        </div>
      </div>
      <p>Selected: {{ selected() || 'none' }}</p>
    </div>
  `,
})
export class SelectDemoComponent {
  selected = signal<string>('');
}

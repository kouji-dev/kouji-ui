import { Component } from '@angular/core';
import { KjButtonDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-button-retro',
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host {
      display: block;
      padding: 1.5rem;
      background: #0d0208;
      background-image: repeating-linear-gradient(
        0deg, transparent, transparent 2px,
        rgba(0,255,136,0.03) 2px, rgba(0,255,136,0.03) 4px
      );
      font-family: 'Courier New', monospace;
      position: relative;
    }
    .row { display: flex; gap: 0.875rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] {
      padding: 0.375rem 0.875rem;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      border: 1px solid;
      cursor: pointer;
      border-radius: 0;
      transition: box-shadow 0.15s, background 0.15s;
      position: relative;
    }
    [data-variant="default"] {
      background: transparent;
      color: #00ff88;
      border-color: #00ff88;
      box-shadow: 0 0 4px #00ff88, inset 0 0 4px rgba(0,255,136,0.1);
    }
    [data-variant="default"]:hover {
      background: rgba(0,255,136,0.15);
      box-shadow: 0 0 10px #00ff88, 0 0 20px rgba(0,255,136,0.3), inset 0 0 6px rgba(0,255,136,0.2);
    }
    [data-variant="destructive"] {
      background: transparent;
      color: #ff0055;
      border-color: #ff0055;
      box-shadow: 0 0 4px #ff0055, inset 0 0 4px rgba(255,0,85,0.1);
    }
    [data-variant="destructive"]:hover {
      background: rgba(255,0,85,0.15);
      box-shadow: 0 0 10px #ff0055, 0 0 20px rgba(255,0,85,0.3);
    }
    [data-variant="outline"] {
      background: transparent;
      color: #00ffff;
      border-color: #00ffff;
      box-shadow: 0 0 4px #00ffff, inset 0 0 4px rgba(0,255,255,0.1);
    }
    [data-variant="ghost"] {
      background: transparent;
      color: #ff00ff;
      border-color: transparent;
      opacity: 0.6;
    }
    [aria-disabled="true"] {
      opacity: 0.25;
      cursor: not-allowed;
      box-shadow: none;
    }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">▶ START</button>
      <button kjButton [kjVariant]="'destructive'">✕ ABORT</button>
      <button kjButton [kjVariant]="'outline'">◈ SELECT</button>
      <button kjButton [kjVariant]="'ghost'">~ PAUSE</button>
      <button kjButton [kjDisabled]="true">⊘ LOCKED</button>
    </div>
  `,
})
export class ButtonDemoRetroComponent {}

import { Component } from '@angular/core';
import { KjMenu, KjMenuTrigger, KjMenuContent, KjMenuItem } from './menu';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-menu-basic',
  standalone: true,
  imports: [KjMenu, KjMenuTrigger, KjMenuContent, KjMenuItem, KjButton],
  styles: [`
    :host { display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem 10rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 220px; }
    .anchor { position: relative; display: inline-block; }
    button[kjButton] { padding: 0.5rem 1.25rem; border: 1px solid #444; background: transparent; color: #f0ede6; cursor: pointer; font-family: inherit; font-size: 0.875rem; }
    button[kjButton]:hover { border-color: #b8f500; color: #b8f500; }
    [kjMenuContent] {
      position: absolute; top: calc(100% + 4px); left: 0; z-index: 20;
      background: #1a1a1a; border: 1px solid #333; padding: 0.25rem 0; min-width: 10rem;
      display: flex; flex-direction: column;
    }
    [kjMenuContent][hidden] { display: none; }
    [kjMenuItem] {
      background: transparent; border: none; color: #f0ede6; font-family: inherit;
      font-size: 0.875rem; padding: 0.5rem 1rem; text-align: left; cursor: pointer; width: 100%;
    }
    [kjMenuItem]:hover, [kjMenuItem]:focus { background: #252525; color: #b8f500; outline: none; }
    [kjMenuItem][disabled] { color: #555; cursor: not-allowed; }
  `],
  template: `
    <div class="anchor" kjMenu>
      <button kjButton kjMenuTrigger>Actions</button>
      <div kjMenuContent>
        <button kjMenuItem>Edit</button>
        <button kjMenuItem>Duplicate</button>
        <button kjMenuItem>Archive</button>
        <button kjMenuItem disabled>Delete</button>
      </div>
    </div>
  `,
})
export class MenuBasicExample {}

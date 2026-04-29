import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="min-height:100dvh;background:#0c0c0c;color:#f0ede6;font-family:'JetBrains Mono',monospace;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.5rem;">
      <span style="color:#b8f500;font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;border:1px solid #b8f500;padding:0.25rem 0.75rem;">Coming soon</span>
      <h1 style="font-family:'Syne',sans-serif;font-size:3rem;font-weight:800;letter-spacing:-0.04em;margin:0">Documentation</h1>
      <p style="color:#555;font-size:0.875rem;">Component pages powered by ts-morph + ISR are in progress.</p>
      <a routerLink="/" style="color:#666;font-size:0.8rem;text-decoration:none;border-bottom:1px solid #333;padding-bottom:2px;">← Back home</a>
    </div>
  `,
})
export class DocsComponent {}

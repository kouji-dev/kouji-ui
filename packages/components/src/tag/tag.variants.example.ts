import { Component } from '@angular/core';
import { KjTagComponent } from './tag';

@Component({
  selector: 'kj-tag-variants-example',
  standalone: true,
  imports: [KjTagComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    `,
  ],
  template: `
    <kj-tag kjVariant="default">Default</kj-tag>
    <kj-tag kjVariant="secondary">Secondary</kj-tag>
    <kj-tag kjVariant="success">Success</kj-tag>
    <kj-tag kjVariant="warning">Warning</kj-tag>
    <kj-tag kjVariant="destructive">Destructive</kj-tag>
    <kj-tag kjVariant="info">Info</kj-tag>
    <kj-tag kjVariant="outline">Outline</kj-tag>
    <kj-tag kjVariant="ghost">Ghost</kj-tag>
  `,
})
export class KjTagVariantsExample {}

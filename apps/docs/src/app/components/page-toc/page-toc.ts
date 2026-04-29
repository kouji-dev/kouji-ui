import { Component, input } from '@angular/core';
import { PageTocDirective } from './page-toc.directive';

@Component({
  selector: 'kj-page-toc',
  standalone: true,
  imports: [],
  templateUrl: './page-toc.html',
  styleUrl: './page-toc.css',
})
export class PageTocComponent {
  /** Pass the directive reference directly. */
  toc = input.required<PageTocDirective>();

  protected scroll(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

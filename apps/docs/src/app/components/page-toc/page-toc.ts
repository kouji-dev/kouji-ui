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
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Update URL and active highlight immediately on click
    history.pushState(null, '', `#${id}`);
    this.toc().activeId.set(id);
  }
}

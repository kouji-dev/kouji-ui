import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [RouterLink, DocsSidebarComponent, PageTocDirective, PageTocComponent],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStartedComponent {}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [RouterLink, DocsSidebarComponent],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStartedComponent {}

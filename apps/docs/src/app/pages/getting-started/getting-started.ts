import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStartedComponent {}

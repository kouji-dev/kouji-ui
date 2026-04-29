import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterOutlet, LogoComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {}

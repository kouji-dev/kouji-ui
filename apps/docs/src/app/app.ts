import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingScreenComponent } from './components/loading-screen/loading-screen';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent],
  template: `
    @if (loading.isLoading()) {
      <kj-loading-screen />
    }
    <div [class.content-hidden]="loading.isLoading()">
      <router-outlet />
    </div>
  `,
  styles: [`
    .content-hidden { visibility: hidden; }
  `],
})
export class App implements OnInit {
  protected readonly loading = inject(LoadingService);

  ngOnInit(): void {
    // Hide loading screen after a short delay to let the animation play
    // In production, this would be after critical data is loaded
    setTimeout(() => this.loading.hide(), 1600);
  }
}

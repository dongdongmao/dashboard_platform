import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DashboardComponent],
  template: `
    <div class="app-container">
      <app-dashboard />
      <router-outlet />
    </div>
  `,
  styleUrl: './app.scss'
})
export class App {}

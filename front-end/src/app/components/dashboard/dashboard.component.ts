import { Component, OnInit, signal, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DashboardService, DashboardViewModel } from '../../services/dashboard.service';
import { RiskVisualizationComponent } from '../risk-visualization/risk-visualization.component';
import { TradingVisualizationComponent } from '../trading-visualization/trading-visualization.component';
import { LedgerVisualizationComponent } from '../ledger-visualization/ledger-visualization.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RiskVisualizationComponent,
    TradingVisualizationComponent,
    LedgerVisualizationComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  dashboardData = signal<DashboardViewModel | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    // In SSR, data should already be preloaded via APP_INITIALIZER and stored in TransferState
    // The service will return it synchronously from TransferState
    // If not available, it will fetch from API (client-side fallback)
    this.loadDashboardData();
  }

  retry(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        // Only set data if it's not empty (has actual content)
        if (data && data.health && data.health.status !== 'UNKNOWN') {
          this.dashboardData.set(data);
          this.loading.set(false);
        } else {
          // Data is empty or invalid, treat as error
          console.warn('Received empty or invalid dashboard data');
          this.error.set('Failed to load dashboard data. Please try again later.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load dashboard data:', err);
        this.error.set('Failed to load dashboard data. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}

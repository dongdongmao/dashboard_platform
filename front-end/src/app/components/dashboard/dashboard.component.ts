import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
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
        this.dashboardData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard data:', err);
        this.error.set('Failed to load dashboard data. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}

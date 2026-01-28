import { Component, Input, PLATFORM_ID, inject, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, isPlatformServer, CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { RiskAccount, RiskMetric } from '../../services/dashboard.service';
import { BarChartComponent, BarChartData, BarChartConfig } from '../shared/bar-chart/bar-chart.component';

@Component({
  selector: 'app-risk-visualization',
  standalone: true,
  imports: [BarChartComponent, CommonModule],
  template: `
    <app-bar-chart [data]="chartData" [config]="chartConfig"></app-bar-chart>
    <div *ngIf="riskMetrics.length > 0" class="metrics-container">
      <div *ngFor="let metric of riskMetrics" class="metric-card" 
           [style.background-color]="metric.status === 'WARNING' ? '#ffebee' : '#e8f5e9'"
           [style.border-color]="metric.status === 'WARNING' ? '#f44336' : '#4caf50'">
        <div class="metric-type">{{ metric.metricType }}</div>
        <div class="metric-value">{{ formatValue(metric.value) }}</div>
        <div class="metric-status" [style.color]="metric.status === 'WARNING' ? '#f44336' : '#4caf50'">
          {{ metric.status }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .metrics-container {
      margin-top: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .metric-card {
      padding: 10px;
      border-radius: 4px;
      border: 2px solid;
      min-width: 120px;
      max-width: 100%;
      box-sizing: border-box;
      flex: 1 1 auto;
    }
    .metric-type {
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .metric-value {
      font-size: 1.25rem;
      margin-top: 5px;
      white-space: nowrap;
    }
    .metric-status {
      font-size: 0.75rem;
      margin-top: 5px;
      white-space: nowrap;
    }
  `]
})
export class RiskVisualizationComponent implements OnInit, OnChanges {
  @Input() riskAccounts: RiskAccount[] = [];
  @Input() riskMetrics: RiskMetric[] = [];

  chartData: BarChartData[] = [];
  chartConfig: BarChartConfig = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private isServer = isPlatformServer(this.platformId);

  ngOnInit(): void {
    console.log('[RiskVisualization] ngOnInit:', {
      isServer: this.isServer,
      riskAccountsLength: this.riskAccounts?.length
    });
    // Process data immediately for both SSR and browser
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[RiskVisualization] ngOnChanges:', {
      isServer: this.isServer,
      riskAccountsChanged: !!changes['riskAccounts'],
      riskAccountsLength: this.riskAccounts?.length
    });
    // Process data for both SSR and browser - same logic
    if (changes['riskAccounts'] || changes['riskMetrics']) {
      this.updateChart();
      // Trigger change detection to ensure child component updates
      this.cdr.detectChanges();
    }
  }

  formatValue(value: number): string {
    return `$${(value / 1000).toFixed(0)}k`;
  }

  private updateChart(): void {
    console.log('[RiskVisualization] updateChart:', {
      riskAccountsLength: this.riskAccounts?.length
    });
    
    if (!this.riskAccounts || !this.riskAccounts.length) {
      this.chartData = [];
      this.chartConfig = {};
      return;
    }

    const sortedAccounts = [...this.riskAccounts].sort((a, b) => b.exposure - a.exposure).slice(0, 10);
    
    this.chartData = sortedAccounts.map(account => ({
      label: account.accountId,
      value: account.exposure
    }));

    this.chartConfig = {
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 80, left: 70 },
      showZeroLine: false,
      showValueLabels: false,
      yAxisFormatter: (d: number) => `$${(d / 1000).toFixed(0)}k`,
      xAxisLabel: 'Account ID',
      yAxisLabel: 'Exposure ($)',
      padding: 0.1
    };
    
    console.log('[RiskVisualization] chartData updated:', {
      chartDataLength: this.chartData.length
    });
  }
}

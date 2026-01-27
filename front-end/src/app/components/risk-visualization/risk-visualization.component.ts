import { Component, Input, PLATFORM_ID, inject, AfterViewInit, OnChanges, SimpleChanges, Renderer2, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
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
export class RiskVisualizationComponent implements AfterViewInit, OnChanges {
  @Input() riskAccounts: RiskAccount[] = [];
  @Input() riskMetrics: RiskMetric[] = [];

  chartData: BarChartData[] = [];
  chartConfig: BarChartConfig = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.updateChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isBrowser) {
      if (changes['riskAccounts'] || changes['riskMetrics']) {
        setTimeout(() => {
          this.updateChart();
          // Force change detection to ensure BarChartComponent receives the update
          this.cdr.detectChanges();
        }, 0);
      }
    }
  }

  formatValue(value: number): string {
    return `$${(value / 1000).toFixed(0)}k`;
  }

  private updateChart(): void {
    console.log('RiskVisualizationComponent updateChart:', {
      riskAccountsLength: this.riskAccounts?.length,
      riskAccounts: this.riskAccounts
    });
    
    if (!this.riskAccounts || !this.riskAccounts.length) {
      this.chartData = [];
      this.chartConfig = {};
      console.log('RiskVisualizationComponent: No risk accounts, clearing chart data');
      return;
    }

    const sortedAccounts = [...this.riskAccounts].sort((a, b) => b.exposure - a.exposure).slice(0, 10);
    
    this.chartData = sortedAccounts.map(account => ({
      label: account.accountId,
      value: account.exposure
    }));

    this.chartConfig = {
      height: 400,
      margin: { top: 20, right: 30, bottom: 80, left: 80 }, // Increased bottom margin for rotated labels
      showZeroLine: false,
      showValueLabels: false,
      yAxisFormatter: (d) => `$${(d / 1000).toFixed(0)}k`,
      xAxisLabel: 'Account ID',
      yAxisLabel: 'Exposure ($)',
      padding: 0.2
    };
    
    console.log('RiskVisualizationComponent: Updated chartData:', {
      chartDataLength: this.chartData.length,
      chartData: this.chartData
    });
  }
}

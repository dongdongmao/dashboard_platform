import { Component, Input, AfterViewInit, PLATFORM_ID, inject, OnChanges, SimpleChanges, Renderer2, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { AccountBalance, Transaction } from '../../services/dashboard.service';
import { BarChartComponent, BarChartData, BarChartConfig } from '../shared/bar-chart/bar-chart.component';

@Component({
  selector: 'app-ledger-visualization',
  standalone: true,
  imports: [BarChartComponent, CommonModule],
  template: `
    <app-bar-chart [data]="barChartData" [config]="barChartConfig"></app-bar-chart>
    <div *ngIf="transactions.length > 0" class="tx-container">
      <div *ngFor="let item of txData" class="tx-card">
        <div class="tx-type">{{ item.type }}</div>
        <div class="tx-count">{{ item.count }}</div>
      </div>
    </div>
  `,
  styles: [`
    .tx-container {
      margin-top: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .tx-card {
      padding: 10px;
      background-color: #e3f2fd;
      border-radius: 4px;
      border: 1px solid #2196f3;
      min-width: 100px;
      max-width: 100%;
      box-sizing: border-box;
      flex: 1 1 auto;
    }
    .tx-type {
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .tx-count {
      font-size: 1.25rem;
      margin-top: 5px;
      white-space: nowrap;
    }
  `]
})
export class LedgerVisualizationComponent implements AfterViewInit, OnChanges {
  @Input() balances: AccountBalance[] = [];
  @Input() transactions: Transaction[] = [];

  barChartData: BarChartData[] = [];
  barChartConfig: BarChartConfig = {};
  txData: Array<{ type: string; count: number }> = [];

  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.updateCharts();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isBrowser) {
      if (changes['balances'] || changes['transactions']) {
        setTimeout(() => {
          this.updateCharts();
          // Force change detection to ensure BarChartComponent receives the update
          this.cdr.detectChanges();
        }, 0);
      }
    }
  }

  private updateCharts(): void {
    this.updateBarChart();
    this.updateTransactionData();
  }

  private updateBarChart(): void {
    console.log('LedgerVisualizationComponent updateBarChart:', {
      balancesLength: this.balances?.length,
      balances: this.balances
    });
    
    if (!this.balances || !this.balances.length) {
      this.barChartData = [];
      this.barChartConfig = {};
      console.log('LedgerVisualizationComponent: No balances, clearing chart data');
      return;
    }

    const balancesByCurrency = d3.group(this.balances, d => d.currency);
    const currencyData = Array.from(balancesByCurrency, ([currency, balances]) => ({
      currency,
      totalCash: d3.sum(balances, d => d.cashBalance) || 0,
      totalMarginUsed: d3.sum(balances, d => d.marginUsed) || 0,
      totalAvailable: d3.sum(balances, d => d.availableMargin) || 0,
      accountCount: balances.length
    })).sort((a, b) => Math.abs(b.totalCash) - Math.abs(a.totalCash));

    this.barChartData = currencyData.map(data => ({
      label: data.currency,
      value: data.totalCash
    }));

    this.barChartConfig = {
      height: 400,
      margin: { top: 20, right: 30, bottom: 60, left: 80 },
      showZeroLine: true,
      showValueLabels: true,
      valueLabelFormatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      yAxisFormatter: (d) => `$${(d / 1000).toFixed(0)}k`,
      xAxisLabel: 'Currency',
      yAxisLabel: 'Cash Balance ($)',
      padding: 0.2
    };
    
    console.log('LedgerVisualizationComponent: Updated barChartData:', {
      barChartDataLength: this.barChartData.length,
      barChartData: this.barChartData
    });
  }

  private updateTransactionData(): void {
    if (!this.transactions.length) {
      this.txData = [];
      return;
    }

    const txTypeCount = d3.rollup(
      this.transactions,
      v => v.length,
      d => d.transactionType
    );

    this.txData = Array.from(txTypeCount, ([type, count]) => ({
      type,
      count: count || 0
    }));
  }
}

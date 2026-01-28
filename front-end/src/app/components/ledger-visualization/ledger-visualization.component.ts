import { Component, Input, PLATFORM_ID, inject, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, isPlatformServer, CommonModule } from '@angular/common';
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
export class LedgerVisualizationComponent implements OnInit, OnChanges {
  @Input() balances: AccountBalance[] = [];
  @Input() transactions: Transaction[] = [];

  barChartData: BarChartData[] = [];
  barChartConfig: BarChartConfig = {};
  txData: Array<{ type: string; count: number }> = [];

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private isServer = isPlatformServer(this.platformId);

  ngOnInit(): void {
    console.log('[LedgerVisualization] ngOnInit:', {
      isServer: this.isServer,
      balancesLength: this.balances?.length
    });
    // Process data immediately for both SSR and browser
    this.updateCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[LedgerVisualization] ngOnChanges:', {
      isServer: this.isServer,
      balancesChanged: !!changes['balances'],
      balancesLength: this.balances?.length
    });
    // Process data for both SSR and browser - same logic
    if (changes['balances'] || changes['transactions']) {
      this.updateCharts();
      this.cdr.detectChanges();
    }
  }

  private updateCharts(): void {
    this.updateBarChart();
    this.updateTransactionData();
  }

  private updateBarChart(): void {
    console.log('[LedgerVisualization] updateBarChart:', {
      balancesLength: this.balances?.length
    });
    
    if (!this.balances || !this.balances.length) {
      this.barChartData = [];
      this.barChartConfig = {};
      return;
    }

    const balancesByCurrency = d3.group(this.balances, (d: AccountBalance) => d.currency);
    const currencyData = Array.from(balancesByCurrency, ([currency, balances]) => ({
      currency,
      totalCash: d3.sum(balances, (d: AccountBalance) => d.cashBalance) || 0,
      totalMarginUsed: d3.sum(balances, (d: AccountBalance) => d.marginUsed) || 0,
      totalAvailable: d3.sum(balances, (d: AccountBalance) => d.availableMargin) || 0,
      accountCount: balances.length
    })).sort((a, b) => Math.abs(b.totalCash) - Math.abs(a.totalCash));

    this.barChartData = currencyData.map(data => ({
      label: data.currency,
      value: data.totalCash
    }));

    this.barChartConfig = {
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 80, left: 70 },
      showZeroLine: true,
      showValueLabels: true,
      valueLabelFormatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      yAxisFormatter: (d: number) => `$${(d / 1000).toFixed(0)}k`,
      xAxisLabel: 'Currency',
      yAxisLabel: 'Cash Balance ($)',
      padding: 0.1
    };
    
    console.log('[LedgerVisualization] barChartData updated:', {
      barChartDataLength: this.barChartData.length
    });
  }

  private updateTransactionData(): void {
    if (!this.transactions.length) {
      this.txData = [];
      return;
    }

    const txTypeCount = d3.rollup(
      this.transactions,
      (v: Transaction[]) => v.length,
      (d: Transaction) => d.transactionType
    );

    this.txData = Array.from(txTypeCount, ([type, count]) => ({
      type,
      count: count || 0
    }));
  }
}

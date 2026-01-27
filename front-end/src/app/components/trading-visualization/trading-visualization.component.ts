import { Component, Input, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, inject, OnChanges, SimpleChanges, Renderer2, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { TradingOrder, TradingFill } from '../../services/dashboard.service';
import { BarChartComponent, BarChartData, BarChartConfig } from '../shared/bar-chart/bar-chart.component';

@Component({
  selector: 'app-trading-visualization',
  standalone: true,
  imports: [BarChartComponent, CommonModule],
  template: `
    <app-bar-chart [data]="barChartData" [config]="barChartConfig"></app-bar-chart>
    <div *ngIf="orders.length > 0" class="pie-container">
      <svg #pieSvg [attr.width]="pieWidth" [attr.height]="pieHeight"></svg>
    </div>
  `,
  styles: [`
    .pie-container {
      margin-top: 20px;
      width: 100%;
      max-width: 100%;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
      overflow: hidden;
    }
    .pie-container svg {
      display: block;
    }
  `]
})
export class TradingVisualizationComponent implements AfterViewInit, OnChanges {
  @ViewChild('pieSvg', { static: false }) pieSvg!: ElementRef<SVGSVGElement>;
  @Input() orders: TradingOrder[] = [];
  @Input() fills: TradingFill[] = [];

  barChartData: BarChartData[] = [];
  barChartConfig: BarChartConfig = {};
  pieWidth = 200;
  pieHeight = 200;

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
      if (changes['orders'] || changes['fills']) {
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
    this.updatePieChart();
  }

  private updateBarChart(): void {
    console.log('TradingVisualizationComponent updateBarChart:', {
      fillsLength: this.fills?.length,
      fills: this.fills
    });
    
    if (!this.fills || !this.fills.length) {
      this.barChartData = [];
      this.barChartConfig = {};
      console.log('TradingVisualizationComponent: No fills, clearing chart data');
      return;
    }

    const fillsBySymbol = d3.group(this.fills, d => d.symbol);
    const symbolData = Array.from(fillsBySymbol, ([symbol, fills]) => ({
      symbol,
      totalPnl: d3.sum(fills, d => d.pnl) || 0,
      fillCount: fills.length,
      avgPrice: d3.mean(fills, d => d.price) || 0
    })).sort((a, b) => b.totalPnl - a.totalPnl);

    this.barChartData = symbolData.map(data => ({
      label: data.symbol,
      value: data.totalPnl
    }));

    this.barChartConfig = {
      height: 400,
      margin: { top: 20, right: 30, bottom: 60, left: 80 },
      showZeroLine: true,
      showValueLabels: false,
      yAxisFormatter: (d) => `$${(d / 1000).toFixed(0)}k`,
      xAxisLabel: 'Symbol',
      yAxisLabel: 'PnL ($)',
      padding: 0.2
    };
    
    console.log('TradingVisualizationComponent: Updated barChartData:', {
      barChartDataLength: this.barChartData.length,
      barChartData: this.barChartData
    });
  }

  private updatePieChart(): void {
    if (!this.orders.length || !this.pieSvg) return;

    const container = this.pieSvg.nativeElement;
    while (container.firstChild) {
      this.renderer.removeChild(container, container.firstChild);
    }

    const orderStatusCount = d3.rollup(
      this.orders,
      v => v.length,
      d => d.status
    );

    const pieData = Array.from(orderStatusCount, ([status, count]) => ({
      status,
      count: count || 0
    }));

    const pieRadius = Math.min(this.pieWidth, this.pieHeight) / 2 - 10;
    const doc = container.ownerDocument;

    const pieG = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    pieG.setAttribute('transform', `translate(${this.pieWidth / 2},${this.pieHeight / 2})`);
    container.appendChild(pieG);

    const pie = d3.pie<typeof pieData[0]>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
      .innerRadius(0)
      .outerRadius(pieRadius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pieArcs = pie(pieData);

    pieArcs.forEach((arcData, i) => {
      const arcGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
      arcGroup.setAttribute('class', 'arc');
      pieG.appendChild(arcGroup);

      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = arc(arcData);
      if (pathData) {
        path.setAttribute('d', pathData);
        path.setAttribute('fill', color(i.toString()));
        arcGroup.appendChild(path);
      }

      const centroid = arc.centroid(arcData);
      const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('transform', `translate(${centroid[0]},${centroid[1]})`);
      text.setAttribute('dy', '.35em');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12px');
      text.textContent = arcData.data.status;
      arcGroup.appendChild(text);
    });
  }
}

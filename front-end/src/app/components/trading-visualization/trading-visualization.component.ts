import { Component, Input, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, inject, OnInit, OnChanges, SimpleChanges, Renderer2, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, isPlatformServer, CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { TradingOrder, TradingFill } from '../../services/dashboard.service';
import { BarChartComponent, BarChartData, BarChartConfig } from '../shared/bar-chart/bar-chart.component';

@Component({
  selector: 'app-trading-visualization',
  standalone: true,
  imports: [BarChartComponent, CommonModule],
  template: `
    <app-bar-chart [data]="barChartData" [config]="barChartConfig"></app-bar-chart>
    <div *ngIf="isBrowser && orders.length > 0" class="pie-container">
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
export class TradingVisualizationComponent implements OnInit, AfterViewInit, OnChanges {
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
  isBrowser = isPlatformBrowser(this.platformId);
  private isServer = isPlatformServer(this.platformId);

  ngOnInit(): void {
    console.log('[TradingVisualization] ngOnInit:', {
      isServer: this.isServer,
      fillsLength: this.fills?.length
    });
    // Process bar chart data immediately for both SSR and browser
    this.updateBarChart();
  }

  ngAfterViewInit(): void {
    console.log('[TradingVisualization] ngAfterViewInit:', {
      isBrowser: this.isBrowser,
      barChartDataLength: this.barChartData?.length
    });
    // Pie chart only renders in browser (requires full DOM)
    if (this.isBrowser) {
      this.updatePieChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[TradingVisualization] ngOnChanges:', {
      isServer: this.isServer,
      fillsChanged: !!changes['fills'],
      fillsLength: this.fills?.length
    });
    // Process bar chart data for both SSR and browser
    if (changes['orders'] || changes['fills']) {
      this.updateBarChart();
      this.cdr.detectChanges();
      
      // Pie chart only in browser
      if (this.isBrowser) {
        this.updatePieChart();
      }
    }
  }

  private updateBarChart(): void {
    console.log('[TradingVisualization] updateBarChart:', {
      fillsLength: this.fills?.length
    });
    
    if (!this.fills || !this.fills.length) {
      this.barChartData = [];
      this.barChartConfig = {};
      return;
    }

    const fillsBySymbol = d3.group(this.fills, (d: TradingFill) => d.symbol);
    const symbolData = Array.from(fillsBySymbol, ([symbol, fills]) => ({
      symbol,
      totalPnl: d3.sum(fills, (d: TradingFill) => d.pnl) || 0,
      fillCount: fills.length,
      avgPrice: d3.mean(fills, (d: TradingFill) => d.price) || 0
    })).sort((a, b) => b.totalPnl - a.totalPnl);

    this.barChartData = symbolData.map(data => ({
      label: data.symbol,
      value: data.totalPnl
    }));

    this.barChartConfig = {
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 80, left: 70 },
      showZeroLine: true,
      showValueLabels: false,
      yAxisFormatter: (d: number) => `$${(d / 1000).toFixed(0)}k`,
      xAxisLabel: 'Symbol',
      yAxisLabel: 'PnL ($)',
      padding: 0.1
    };
    
    console.log('[TradingVisualization] barChartData updated:', {
      barChartDataLength: this.barChartData.length
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
      (v: TradingOrder[]) => v.length,
      (d: TradingOrder) => d.status
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
      .value((d: typeof pieData[0]) => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
      .innerRadius(0)
      .outerRadius(pieRadius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pieArcs = pie(pieData);

    pieArcs.forEach((arcData: d3.PieArcDatum<typeof pieData[0]>, i: number) => {
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

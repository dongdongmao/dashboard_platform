import { Component, Input, PLATFORM_ID, inject, AfterViewInit, ElementRef, ViewChild, OnChanges, OnInit, SimpleChanges, Renderer2, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import * as d3 from 'd3';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
  colorValue?: number;
}

export interface BarChartConfig {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  showZeroLine?: boolean;
  showValueLabels?: boolean;
  valueLabelFormatter?: (value: number) => string;
  yAxisFormatter?: (value: number) => string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colorScheme?: 'sequential' | 'categorical' | 'custom';
  colorInterpolator?: (t: number) => string;
  colorDomain?: [number, number];
  barColors?: (value: number) => string;
  padding?: number;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  template: '<div #chartContainer class="chart-container"></div>',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .chart-container {
      width: 100%;
      min-height: 500px;
      margin-top: 1rem;
      overflow: visible;
      box-sizing: border-box;
    }
    .chart-container svg {
      display: block;
      width: 100%;
      height: 500px;
    }
  `]
})
export class BarChartComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;
  @Input() data: BarChartData[] = [];
  @Input() config: BarChartConfig = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private isServer = isPlatformServer(this.platformId);
  private rendered = false;

  ngOnInit(): void {
    console.log('[BarChart] ngOnInit:', {
      isServer: this.isServer,
      isBrowser: this.isBrowser,
      hasContainer: !!this.chartContainer,
      dataLength: this.data?.length
    });
  }

  ngAfterViewInit(): void {
    console.log('[BarChart] ngAfterViewInit:', {
      isServer: this.isServer,
      isBrowser: this.isBrowser,
      hasContainer: !!this.chartContainer,
      dataLength: this.data?.length,
      rendered: this.rendered
    });
    
    // Render chart if we have data
    if (this.data && this.data.length > 0 && !this.rendered) {
      this.renderChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[BarChart] ngOnChanges:', {
      isServer: this.isServer,
      isBrowser: this.isBrowser,
      dataChanged: !!changes['data'],
      configChanged: !!changes['config'],
      dataLength: this.data?.length,
      rendered: this.rendered
    });
    
    // Re-render when data or config changes
    if ((changes['data'] || changes['config']) && this.chartContainer) {
      // On browser, use setTimeout to ensure DOM is ready
      // On server, render immediately
      if (this.isBrowser) {
        // Skip if this is the first change and we haven't rendered yet
        // ngAfterViewInit will handle initial render
        if (!changes['data']?.firstChange || this.rendered) {
          setTimeout(() => this.renderChart(), 0);
        }
      } else {
        // SSR: Render immediately
        this.renderChart();
      }
    }
  }

  private renderChart(): void {
    if (!this.chartContainer?.nativeElement) {
      console.warn('[BarChart] chartContainer not available');
      return;
    }
    
    if (!this.data || !this.data.length) {
      console.warn('[BarChart] No data to render');
      return;
    }

    console.log('[BarChart] renderChart:', {
      isServer: this.isServer,
      dataLength: this.data.length
    });

    this.rendered = true;
    const container = this.chartContainer.nativeElement;
    
    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Use consistent dimensions for both SSR and browser
    // Smaller viewBox = larger relative font size when scaled
    const defaultConfig: Required<BarChartConfig> = {
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 80, left: 70 },
      showZeroLine: false,
      showValueLabels: false,
      valueLabelFormatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      yAxisFormatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      xAxisLabel: '',
      yAxisLabel: '',
      colorScheme: 'sequential',
      colorInterpolator: d3.interpolateRdYlGn,
      colorDomain: [0, 1],
      barColors: () => '#4caf50',
      padding: 0.1
    };

    const cfg = { ...defaultConfig, ...this.config };
    const margin = cfg.margin;
    
    // Use fixed width for consistent SSR/browser rendering
    // The SVG will scale responsively via viewBox
    const containerWidth = cfg.width;
    const width = containerWidth - margin.left - margin.right;
    const height = cfg.height - margin.top - margin.bottom;

    // Create SVG using native DOM API (works in both SSR and browser)
    const doc = container.ownerDocument;
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', String(cfg.height));
    svg.setAttribute('viewBox', `0 0 ${containerWidth} ${cfg.height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.maxWidth = '100%';
    svg.style.display = 'block';
    container.appendChild(svg);

    const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // X scale
    const xScale = d3.scaleBand()
      .domain(this.data.map(d => d.label))
      .range([0, width])
      .padding(cfg.padding);

    // Y scale
    const yMin = cfg.showZeroLine ? Math.min(0, d3.min(this.data, (d: BarChartData) => d.value) || 0) : (d3.min(this.data, (d: BarChartData) => d.value) || 0);
    const yMax = d3.max(this.data, (d: BarChartData) => d.value) || 0;
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([height, 0]);

    const zeroY = yScale(0);
    const barWidth = xScale.bandwidth();

    // Create bars
    this.data.forEach((item) => {
      const x = xScale(item.label);
      if (x === undefined || x === null) return;
      
      const barX = x;
      const scaledValue = yScale(item.value);
      const scaledZero = yScale(0);
      
      let barY: number;
      let barHeight: number;
      
      if (item.value >= 0) {
        barY = scaledValue;
        barHeight = scaledZero - scaledValue;
      } else {
        barY = scaledZero;
        barHeight = scaledValue - scaledZero;
      }
      
      const clampedBarY = Math.max(0, Math.min(barY, height));
      const maxBarHeight = height - clampedBarY;
      const clampedBarHeight = Math.max(0, Math.min(Math.abs(barHeight), maxBarHeight));

      const bar = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('class', 'bar');
      bar.setAttribute('x', String(barX));
      bar.setAttribute('y', String(clampedBarY));
      bar.setAttribute('width', String(barWidth));
      bar.setAttribute('height', String(clampedBarHeight));
      
      const barColor = item.value >= 0 ? '#4caf50' : '#f44336';
      bar.setAttribute('fill', barColor);
      bar.setAttribute('stroke', '#333');
      bar.setAttribute('stroke-width', '1');
      g.appendChild(bar);

      if (cfg.showValueLabels && clampedBarHeight > 25) {
        const label = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(barX + barWidth / 2));
        label.setAttribute('y', String(clampedBarY + clampedBarHeight / 2));
        label.setAttribute('dy', '.35em');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '11px');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('font-family', 'Arial, sans-serif');
        label.setAttribute('fill', '#fff');
        label.textContent = cfg.valueLabelFormatter(item.value);
        g.appendChild(label);
      }
    });

    // Zero line
    if (cfg.showZeroLine && zeroY >= 0 && zeroY <= height) {
      const zeroLine = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
      zeroLine.setAttribute('x1', '0');
      zeroLine.setAttribute('x2', String(width));
      zeroLine.setAttribute('y1', String(zeroY));
      zeroLine.setAttribute('y2', String(zeroY));
      zeroLine.setAttribute('stroke', '#333');
      zeroLine.setAttribute('stroke-width', '2');
      zeroLine.setAttribute('stroke-dasharray', '5,5');
      g.appendChild(zeroLine);
    }

    // X axis
    const xAxisGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisGroup.setAttribute('transform', `translate(0,${cfg.showZeroLine ? zeroY : height})`);
    g.appendChild(xAxisGroup);
    
    // Determine which labels to show
    const minLabelSpacing = 30;
    const bandSpacing = xScale.step();
    let labelsToShow: string[];
    if (bandSpacing < minLabelSpacing && this.data.length > 10) {
      const skipCount = Math.max(1, Math.ceil(minLabelSpacing / bandSpacing));
      labelsToShow = this.data.filter((_, i) => i % skipCount === 0).map(d => d.label);
      if (labelsToShow.length < 5 && this.data.length >= 5) {
        const step = Math.floor(this.data.length / 5);
        labelsToShow = [];
        for (let i = 0; i < this.data.length; i += step) {
          labelsToShow.push(this.data[i].label);
        }
        if (labelsToShow[labelsToShow.length - 1] !== this.data[this.data.length - 1].label) {
          labelsToShow.push(this.data[this.data.length - 1].label);
        }
      }
    } else {
      labelsToShow = this.data.map(d => d.label);
    }
    
    // X axis line
    const axisLine = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    axisLine.setAttribute('x1', '0');
    axisLine.setAttribute('x2', String(width));
    axisLine.setAttribute('y1', '0');
    axisLine.setAttribute('y2', '0');
    axisLine.setAttribute('stroke', '#333');
    axisLine.setAttribute('stroke-width', '1');
    xAxisGroup.appendChild(axisLine);
    
    // X axis ticks and labels (pure DOM, no d3.select)
    labelsToShow.forEach(label => {
      const bandStart = xScale(label);
      if (bandStart === undefined || bandStart === null) return;
      
      const bandCenter = bandStart + barWidth / 2;
      
      const tick = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', String(bandCenter));
      tick.setAttribute('x2', String(bandCenter));
      tick.setAttribute('y1', '0');
      tick.setAttribute('y2', '8');
      tick.setAttribute('stroke', '#333');
      tick.setAttribute('stroke-width', '1');
      xAxisGroup.appendChild(tick);
      
      const maxLabelLength = 12;
      let displayText = label;
      if (displayText.length > maxLabelLength) {
        displayText = displayText.substring(0, maxLabelLength) + '...';
      }
      
      const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(bandCenter));
      text.setAttribute('y', '15');
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '12px');
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('transform', `rotate(-45 ${bandCenter} 15)`);
      text.textContent = displayText;
      xAxisGroup.appendChild(text);
    });

    // Y axis (pure DOM, no d3.select)
    const yAxisGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(yAxisGroup);
    
    // Y axis line
    const yAxisLine = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxisLine.setAttribute('x1', '0');
    yAxisLine.setAttribute('x2', '0');
    yAxisLine.setAttribute('y1', '0');
    yAxisLine.setAttribute('y2', String(height));
    yAxisLine.setAttribute('stroke', '#333');
    yAxisLine.setAttribute('stroke-width', '1');
    yAxisGroup.appendChild(yAxisLine);
    
    // Y axis ticks - use d3 scale's ticks() method for nice values
    const yTicks = yScale.ticks(Math.max(1, Math.floor(height / 50)));
    yTicks.forEach((tickValue: number) => {
      const tickY = yScale(tickValue);
      
      const tick = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', '-6');
      tick.setAttribute('x2', '0');
      tick.setAttribute('y1', String(tickY));
      tick.setAttribute('y2', String(tickY));
      tick.setAttribute('stroke', '#333');
      tick.setAttribute('stroke-width', '1');
      yAxisGroup.appendChild(tick);
      
      const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '-10');
      text.setAttribute('y', String(tickY));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '12px');
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = cfg.yAxisFormatter ? cfg.yAxisFormatter(tickValue) : String(tickValue);
      yAxisGroup.appendChild(text);
    });

    // Y axis label
    if (cfg.yAxisLabel) {
      const yLabel = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      yLabel.setAttribute('transform', 'rotate(-90)');
      yLabel.setAttribute('y', String(0 - margin.left + 15));
      yLabel.setAttribute('x', String(0 - (height / 2)));
      yLabel.setAttribute('dy', '0');
      yLabel.setAttribute('text-anchor', 'middle');
      yLabel.setAttribute('font-size', '14px');
      yLabel.setAttribute('font-weight', 'bold');
      yLabel.setAttribute('font-family', 'Arial, sans-serif');
      yLabel.textContent = cfg.yAxisLabel;
      g.appendChild(yLabel);
    }

    // X axis label
    if (cfg.xAxisLabel) {
      const xLabel = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      xLabel.setAttribute('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`);
      xLabel.setAttribute('text-anchor', 'middle');
      xLabel.setAttribute('font-size', '14px');
      xLabel.setAttribute('font-weight', 'bold');
      xLabel.setAttribute('font-family', 'Arial, sans-serif');
      xLabel.textContent = cfg.xAxisLabel;
      g.appendChild(xLabel);
    }
  }
}

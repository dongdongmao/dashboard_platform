import { Component, Input, PLATFORM_ID, inject, AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges, Renderer2, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as d3 from 'd3';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
  colorValue?: number; // For color scale
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
    .chart-container {
      width: 100%;
      min-height: 400px;
      margin-top: 1rem;
      overflow: hidden;
      box-sizing: border-box;
    }
    .chart-container svg {
      display: block;
      max-width: 100%;
      height: auto;
    }
  `]
})
export class BarChartComponent implements AfterViewInit, OnChanges {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;
  @Input() data: BarChartData[] = [];
  @Input() config: BarChartConfig = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.isBrowser) {
      console.log('BarChartComponent ngAfterViewInit:', {
        dataLength: this.data?.length,
        data: this.data
      });
      
      // Use requestAnimationFrame to ensure DOM is fully ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Force render even if data might be empty initially
          // Data will come later and trigger ngOnChanges
          this.renderChart();
        }, 0);
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isBrowser) {
      console.log('BarChartComponent ngOnChanges:', {
        viewInitialized: this.viewInitialized,
        dataChanged: !!changes['data'],
        configChanged: !!changes['config'],
        dataLength: this.data?.length,
        data: this.data
      });
      
      if (this.viewInitialized) {
        // Always try to render when data or config changes
        if (changes['data'] || changes['config']) {
          setTimeout(() => this.renderChart(), 0);
        }
      }
      // If view not initialized yet, ngAfterViewInit will handle it
    }
  }

  private renderChart(): void {
    if (!this.chartContainer) {
      console.warn('BarChartComponent: chartContainer not available');
      return;
    }
    
    if (!this.data || !this.data.length) {
      console.warn('BarChartComponent: No data to render', this.data);
      return;
    }

    const container = this.chartContainer.nativeElement;
    while (container.firstChild) {
      this.renderer.removeChild(container, container.firstChild);
    }

    const defaultConfig: Required<BarChartConfig> = {
      width: 800,
      height: 400,
      margin: { top: 20, right: 30, bottom: 60, left: 80 },
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
      padding: 0.2
    };

    const cfg = { ...defaultConfig, ...this.config };
    const margin = cfg.margin;
    const containerWidth = Math.max(container.getBoundingClientRect().width || container.offsetWidth || cfg.width, 400);
    const width = containerWidth - margin.left - margin.right;
    const height = cfg.height - margin.top - margin.bottom;

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
    const yMin = cfg.showZeroLine ? Math.min(0, d3.min(this.data, d => d.value) || 0) : (d3.min(this.data, d => d.value) || 0);
    const yMax = d3.max(this.data, d => d.value) || 0;
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([height, 0]);

    const zeroY = yScale(0);
    const barWidth = xScale.bandwidth();

    // Create bars
    this.data.forEach((item, index) => {
      const x = xScale(item.label);
      if (x === undefined || x === null) return; // Skip if label not in scale
      
      const barX = x;
      const scaledValue = yScale(item.value);
      const scaledZero = yScale(0);
      
      // Calculate bar position and height
      let barY: number;
      let barHeight: number;
      
      if (item.value >= 0) {
        // Positive values: bar goes from value down to zero
        barY = scaledValue;
        barHeight = scaledZero - scaledValue;
      } else {
        // Negative values: bar goes from zero down to value
        barY = scaledZero;
        barHeight = scaledValue - scaledZero;
      }
      
      // Ensure bar doesn't exceed boundaries
      const clampedBarY = Math.max(0, Math.min(barY, height));
      const maxBarHeight = height - clampedBarY;
      const clampedBarHeight = Math.max(0, Math.min(Math.abs(barHeight), maxBarHeight));

      const bar = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('class', 'bar');
      bar.setAttribute('x', String(barX));
      bar.setAttribute('y', String(clampedBarY));
      bar.setAttribute('width', String(barWidth));
      bar.setAttribute('height', String(clampedBarHeight));
      
      // Use value-based color: green for positive, red for negative
      const barColor = item.value >= 0 ? '#4caf50' : '#f44336';
      bar.setAttribute('fill', barColor);
      bar.setAttribute('stroke', '#333');
      bar.setAttribute('stroke-width', '1');
      g.appendChild(bar);

      // Value labels
      if (cfg.showValueLabels && clampedBarHeight > 10) {
        const label = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(barX + barWidth / 2));
        label.setAttribute('y', String(clampedBarY + clampedBarHeight / 2));
        label.setAttribute('dy', '.35em');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10px');
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

    // X axis - for band scale, we need to handle labels differently
    const xAxisGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisGroup.setAttribute('transform', `translate(0,${cfg.showZeroLine ? zeroY : height})`);
    g.appendChild(xAxisGroup);
    
    // Calculate which labels to show based on spacing
    // Only filter labels if bands are very narrow (< 30px) AND we have many items (> 10)
    // This prevents unnecessary filtering for normal cases
    const minLabelSpacing = 30;
    const bandSpacing = xScale.step();
    let labelsToShow: string[];
    if (bandSpacing < minLabelSpacing && this.data.length > 10) {
      const skipCount = Math.max(1, Math.ceil(minLabelSpacing / bandSpacing));
      labelsToShow = this.data.filter((_, i) => i % skipCount === 0).map(d => d.label);
      // Ensure we show at least 5 labels if possible (instead of 3)
      if (labelsToShow.length < 5 && this.data.length >= 5) {
        const step = Math.floor(this.data.length / 5);
        labelsToShow = [];
        for (let i = 0; i < this.data.length; i += step) {
          labelsToShow.push(this.data[i].label);
        }
        // Always include the last label
        if (labelsToShow[labelsToShow.length - 1] !== this.data[this.data.length - 1].label) {
          labelsToShow.push(this.data[this.data.length - 1].label);
        }
      }
    } else {
      labelsToShow = this.data.map(d => d.label);
    }
    
    // Render axis line and ticks first
    const axisLine = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    axisLine.setAttribute('x1', '0');
    axisLine.setAttribute('x2', String(width));
    axisLine.setAttribute('y1', '0');
    axisLine.setAttribute('y2', '0');
    axisLine.setAttribute('stroke', '#333');
    axisLine.setAttribute('stroke-width', '1');
    xAxisGroup.appendChild(axisLine);
    
    // Render tick marks and labels manually for better control
    labelsToShow.forEach(label => {
      const bandCenter = xScale(label);
      if (bandCenter === undefined || bandCenter === null) return;
      
      // Create tick mark
      const tick = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', String(bandCenter));
      tick.setAttribute('x2', String(bandCenter));
      tick.setAttribute('y1', '0');
      tick.setAttribute('y2', '6');
      tick.setAttribute('stroke', '#333');
      tick.setAttribute('stroke-width', '1');
      xAxisGroup.appendChild(tick);
      
      // Create label
      const maxLabelLength = 12;
      let displayText = label;
      if (displayText.length > maxLabelLength) {
        displayText = displayText.substring(0, maxLabelLength) + '...';
      }
      
      const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      // Position text at band center, slightly below axis line
      text.setAttribute('x', String(bandCenter));
      text.setAttribute('y', '9'); // Position below tick mark (tick is 6px tall)
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10px');
      text.setAttribute('dominant-baseline', 'hanging'); // Align from top
      // Rotate -45 degrees around the text's center point (bandCenter, 9)
      text.setAttribute('transform', `rotate(-45 ${bandCenter} 9)`);
      text.textContent = displayText;
      xAxisGroup.appendChild(text);
    });

    // Y axis - limit ticks to prevent overcrowding
    const yAxisGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(yAxisGroup);
    const yAxis = cfg.yAxisFormatter 
      ? d3.axisLeft(yScale).tickFormat(cfg.yAxisFormatter as any)
      : d3.axisLeft(yScale);
    // Limit Y axis ticks based on available height (approximately 1 tick per 50px)
    const maxYTicks = Math.max(1, Math.floor(height / 50));
    yAxis.ticks(maxYTicks);
    this.renderAxis(yAxisGroup, yAxis, height, false);

    // Labels
    if (cfg.yAxisLabel) {
      const yLabel = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      yLabel.setAttribute('transform', 'rotate(-90)');
      yLabel.setAttribute('y', String(0 - margin.left));
      yLabel.setAttribute('x', String(0 - (height / 2)));
      yLabel.setAttribute('dy', '1em');
      yLabel.setAttribute('text-anchor', 'middle');
      yLabel.textContent = cfg.yAxisLabel;
      g.appendChild(yLabel);
    }

    if (cfg.xAxisLabel) {
      const xLabel = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      xLabel.setAttribute('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`);
      xLabel.setAttribute('text-anchor', 'middle');
      xLabel.textContent = cfg.xAxisLabel;
      g.appendChild(xLabel);
    }
  }

  private renderAxis(container: SVGElement, axis: any, length: number, isXAxis: boolean): void {
    const doc = this.chartContainer.nativeElement.ownerDocument;
    const tempSvg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tempSvg.setAttribute('style', 'position: absolute; visibility: hidden; pointer-events: none;');
    tempSvg.setAttribute('width', String(length + 100));
    tempSvg.setAttribute('height', '100');
    
    const tempG = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (isXAxis) {
      tempG.setAttribute('transform', 'translate(0, 50)');
    } else {
      tempG.setAttribute('transform', 'translate(50, 0)');
    }
    tempSvg.appendChild(tempG);
    
    doc.body.appendChild(tempSvg);
    
    const d3TempG = d3.select(tempG);
    axis(d3TempG);
    
    const children = Array.from(tempG.childNodes) as Element[];
    children.forEach(child => {
      const cloned = child.cloneNode(true) as Element;
      container.appendChild(cloned);
    });
    
    doc.body.removeChild(tempSvg);
    
    if (!isXAxis) {
      // Y axis - ensure proper spacing and alignment
      const texts = container.querySelectorAll('text');
      texts.forEach(text => {
        this.renderer.setStyle(text, 'text-anchor', 'end');
        this.renderer.setStyle(text, 'font-size', '11px');
        this.renderer.setAttribute(text, 'dx', '-.5em');
        this.renderer.setAttribute(text, 'dy', '.35em');
      });
    }
  }
}
